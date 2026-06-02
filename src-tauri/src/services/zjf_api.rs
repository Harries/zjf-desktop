#![allow(dead_code)]

use std::{fs, time::Duration};

use reqwest::{multipart, StatusCode};
use serde_json::Value;

use crate::models::{
    error::AppError,
    image::{ImagePage, RemoteImage, ZjfImageRaw},
    upload::UploadFile,
};
use crate::services::logging;

const DEFAULT_BASE_URL: &str = "https://zjf.ai";
const REQUEST_TIMEOUT_SECS: u64 = 30;

pub struct ZjfApiClient {
    base_url: String,
    http: reqwest::Client,
}

impl Default for ZjfApiClient {
    fn default() -> Self {
        Self::new(DEFAULT_BASE_URL)
    }
}

impl ZjfApiClient {
    pub fn new(base_url: impl Into<String>) -> Self {
        Self {
            base_url: base_url.into().trim_end_matches('/').to_string(),
            http: reqwest::Client::builder()
                .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECS))
                .build()
                .expect("failed to build zjf.ai API client"),
        }
    }

    pub async fn validate_token(&self, token: &str) -> Result<(), AppError> {
        self.list_images(token, Some(1), Some(1)).await.map(|_| ())
    }

    pub async fn list_images(
        &self,
        token: &str,
        page: Option<u32>,
        page_size: Option<u32>,
    ) -> Result<ImagePage, AppError> {
        let page = page.unwrap_or(1).max(1);
        let page_size = page_size.unwrap_or(20).clamp(1, 100);
        let response = self
            .http
            .get(self.endpoint(&format!("/api/uploads?page={page}&pageSize={page_size}")))
            .bearer_auth(token)
            .send()
            .await
            .map_err(network_error)?;

        let value = json_response(response).await?;
        let image_page = extract_image_page(value, page, page_size)?;
        let items = image_page
            .items
            .into_iter()
            .filter_map(|value| serde_json::from_value::<ZjfImageRaw>(value).ok())
            .map(RemoteImage::from)
            .collect();

        Ok(ImagePage {
            items,
            page: image_page.page,
            page_size: image_page.page_size,
            total: image_page.total,
            total_pages: image_page.total_pages,
            has_next_page: image_page.has_next_page,
            has_previous_page: image_page.has_previous_page,
        })
    }

    pub async fn upload_image(
        &self,
        token: &str,
        file: UploadFile,
    ) -> Result<RemoteImage, AppError> {
        let file_name = file
            .file_name
            .clone()
            .or_else(|| {
                file.path
                    .file_name()
                    .and_then(|name| name.to_str())
                    .map(ToString::to_string)
            })
            .unwrap_or_else(|| "image".to_string());
        let bytes = fs::read(&file.path)
            .map_err(|err| AppError::api(format!("无法读取上传文件：{err}"), false))?;
        let mime_type = upload_mime_type(&file_name)?;
        let part = multipart::Part::bytes(bytes)
            .file_name(file_name)
            .mime_str(mime_type)
            .map_err(|err| AppError::api(format!("无法识别上传文件类型：{err}"), false))?;
        let form = multipart::Form::new().part("file", part);
        let response = self
            .http
            .post(self.endpoint("/api/upload"))
            .bearer_auth(token)
            .multipart(form)
            .send()
            .await
            .map_err(network_error)?;

        let value = json_response(response).await?;
        let image_value = value
            .get("data")
            .or_else(|| value.get("image"))
            .cloned()
            .unwrap_or(value);
        let raw = serde_json::from_value::<ZjfImageRaw>(image_value)
            .map_err(|err| AppError::api(format!("上传响应格式无效：{err}"), false))?;

        Ok(RemoteImage::from(raw))
    }

    pub async fn delete_image(&self, token: &str, image_id: &str) -> Result<(), AppError> {
        let response = self
            .http
            .delete(self.endpoint(&format!("/api/uploads/{image_id}")))
            .bearer_auth(token)
            .send()
            .await
            .map_err(network_error)?;

        ensure_success(response.status()).await
    }

    fn endpoint(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }
}

async fn json_response(response: reqwest::Response) -> Result<Value, AppError> {
    let status = response.status();
    let text = response.text().await.map_err(network_error)?;

    if !status.is_success() {
        return Err(status_error(status, Some(text)));
    }

    serde_json::from_str(&text)
        .map_err(|err| AppError::api(format!("API 响应格式无效：{err}"), false))
}

async fn ensure_success(status: StatusCode) -> Result<(), AppError> {
    if status.is_success() {
        Ok(())
    } else {
        Err(status_error(status, None))
    }
}

#[derive(Debug)]
struct RawImagePage {
    items: Vec<Value>,
    page: u32,
    page_size: u32,
    total: Option<u64>,
    total_pages: Option<u32>,
    has_next_page: bool,
    has_previous_page: bool,
}

fn extract_image_page(
    value: Value,
    requested_page: u32,
    requested_page_size: u32,
) -> Result<RawImagePage, AppError> {
    if let Value::Array(images) = value {
        return Ok(raw_page_from_parts(
            images,
            None,
            requested_page,
            requested_page_size,
        ));
    }

    for key in ["uploads", "data", "images", "items", "list"] {
        if let Some(Value::Array(images)) = value.get(key) {
            return Ok(raw_page_from_parts(
                images.clone(),
                Some(&value),
                requested_page,
                requested_page_size,
            ));
        }
    }

    for container_key in ["data", "result"] {
        if let Some(Value::Object(container)) = value.get(container_key) {
            for key in ["uploads", "images", "items", "list"] {
                if let Some(Value::Array(images)) = container.get(key) {
                    return Ok(raw_page_from_parts(
                        images.clone(),
                        value.get(container_key),
                        requested_page,
                        requested_page_size,
                    ));
                }
            }
        }
    }

    Err(AppError::api("图片列表响应格式无效。", false))
}

fn raw_page_from_parts(
    items: Vec<Value>,
    metadata: Option<&Value>,
    requested_page: u32,
    requested_page_size: u32,
) -> RawImagePage {
    let page = metadata
        .and_then(|value| first_u32(value, &["page", "currentPage"]))
        .unwrap_or(requested_page)
        .max(1);
    let page_size = metadata
        .and_then(|value| first_u32(value, &["pageSize", "limit", "perPage"]))
        .unwrap_or(requested_page_size)
        .clamp(1, 100);
    let total = metadata
        .and_then(|value| first_u64(value, &["total", "totalCount", "totalItems", "count"]));
    let total_pages = metadata
        .and_then(|value| first_u32(value, &["totalPages", "pageCount"]))
        .or_else(|| {
            total.map(|total| {
                if total == 0 {
                    1
                } else {
                    total.div_ceil(u64::from(page_size)) as u32
                }
            })
        });
    let has_next_page = metadata
        .and_then(|value| first_bool(value, &["hasNextPage", "hasNext", "hasMore"]))
        .or_else(|| total_pages.map(|total_pages| page < total_pages))
        .unwrap_or(items.len() >= page_size as usize);
    let has_previous_page = metadata
        .and_then(|value| first_bool(value, &["hasPreviousPage", "hasPrev", "hasPrevious"]))
        .unwrap_or(page > 1);

    RawImagePage {
        items,
        page,
        page_size,
        total,
        total_pages,
        has_next_page,
        has_previous_page,
    }
}

fn first_bool(value: &Value, keys: &[&str]) -> Option<bool> {
    keys.iter().find_map(|key| value.get(*key)?.as_bool())
}

fn first_u32(value: &Value, keys: &[&str]) -> Option<u32> {
    first_u64(value, keys).and_then(|value| u32::try_from(value).ok())
}

fn first_u64(value: &Value, keys: &[&str]) -> Option<u64> {
    keys.iter()
        .find_map(|key| value_to_u64_ref(value.get(*key)?))
}

fn value_to_u64_ref(value: &Value) -> Option<u64> {
    match value {
        Value::Number(value) => value.as_u64(),
        Value::String(value) => value.parse().ok(),
        _ => None,
    }
}

fn upload_mime_type(file_name: &str) -> Result<&'static str, AppError> {
    let extension = file_name
        .rsplit('.')
        .next()
        .filter(|extension| *extension != file_name)
        .map(str::to_ascii_lowercase);

    match extension.as_deref() {
        Some("png") => Ok("image/png"),
        Some("jpg" | "jpeg") => Ok("image/jpeg"),
        Some("webp") => Ok("image/webp"),
        Some("gif") => Ok("image/gif"),
        _ => Err(AppError::unsupported_file_type()),
    }
}

fn status_error(status: StatusCode, body: Option<String>) -> AppError {
    match status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => AppError::token_invalid(),
        StatusCode::PAYLOAD_TOO_LARGE => AppError::file_too_large(),
        StatusCode::UNSUPPORTED_MEDIA_TYPE => AppError::unsupported_file_type(),
        status if status.is_server_error() => {
            AppError::api("zjf.ai 服务暂时不可用，请稍后重试。", true)
        }
        _ => AppError::api(
            body.filter(|body| !body.trim().is_empty())
                .unwrap_or_else(|| format!("zjf.ai API 请求失败：HTTP {status}")),
            false,
        ),
    }
}

fn network_error(err: reqwest::Error) -> AppError {
    logging::warn("network", err.to_string());

    if err.is_timeout() {
        AppError::network("网络请求超时，请稍后重试。")
    } else {
        AppError::network(format!("网络请求失败：{err}"))
    }
}

#[cfg(test)]
mod tests {
    use reqwest::StatusCode;
    use serde_json::json;

    use super::{extract_image_page, status_error, upload_mime_type};
    use crate::models::error::AppErrorCode;

    #[test]
    fn extracts_top_level_image_array() {
        let images =
            extract_image_page(json!([{ "id": "image-001" }]), 1, 20).expect("array response");

        assert_eq!(images.items.len(), 1);
        assert_eq!(images.items[0]["id"], "image-001");
    }

    #[test]
    fn extracts_nested_image_arrays() {
        for key in ["uploads", "data", "images", "items", "list"] {
            let images = extract_image_page(json!({ key: [{ "id": "image-001" }] }), 1, 20)
                .expect("nested array");

            assert_eq!(images.items.len(), 1);
            assert_eq!(images.items[0]["id"], "image-001");
        }
    }

    #[test]
    fn extracts_documented_upload_items_with_dimensions() {
        let images = extract_image_page(
            json!({
                "success": true,
                "items": [
                    {
                        "id": "upl_xxx",
                        "url": "https://img.zjf.ai/images/2026/05/31/upl_xxx/original.png",
                        "filename": "image.png",
                        "size": 123456,
                        "width": 1280,
                        "height": 720,
                        "type": "image/png",
                        "visibility": "public",
                        "uploadedAt": "2026-05-31T10:00:00.000Z"
                    }
                ]
            }),
            1,
            20,
        )
        .expect("documented items response");

        assert_eq!(images.items.len(), 1);
        assert_eq!(images.items[0]["width"], 1280);
        assert_eq!(images.items[0]["height"], 720);
    }

    #[test]
    fn extracts_items_from_nested_data_response() {
        let images = extract_image_page(
            json!({
                "success": true,
                "data": {
                    "items": [{ "id": "image-001" }]
                }
            }),
            1,
            20,
        )
        .expect("nested data items response");

        assert_eq!(images.items.len(), 1);
        assert_eq!(images.items[0]["id"], "image-001");
    }

    #[test]
    fn extracts_pagination_metadata() {
        let page = extract_image_page(
            json!({
                "success": true,
                "items": [{ "id": "image-001" }],
                "page": 2,
                "pageSize": 20,
                "total": 45
            }),
            1,
            20,
        )
        .expect("paginated response");

        assert_eq!(page.page, 2);
        assert_eq!(page.page_size, 20);
        assert_eq!(page.total, Some(45));
        assert_eq!(page.total_pages, Some(3));
        assert!(page.has_next_page);
        assert!(page.has_previous_page);
    }

    #[test]
    fn extracts_documented_page_response() {
        let page = extract_image_page(
            json!({
                "success": true,
                "items": [
                    {
                        "id": "upl_xxx",
                        "url": "https://img.zjf.ai/images/2026/05/31/upl_xxx/original.png",
                        "filename": "image.png",
                        "size": 123456,
                        "width": 1280,
                        "height": 720,
                        "type": "image/png",
                        "visibility": "public",
                        "variant": "original",
                        "albumId": "alb_xxx",
                        "albumName": "Default album",
                        "uploadedAt": "2026-05-31T10:00:00.000Z"
                    }
                ],
                "page": 1,
                "pageSize": 20,
                "total": 1
            }),
            1,
            20,
        )
        .expect("documented paginated response");

        assert_eq!(page.items.len(), 1);
        assert_eq!(page.page, 1);
        assert_eq!(page.page_size, 20);
        assert_eq!(page.total, Some(1));
        assert_eq!(page.total_pages, Some(1));
        assert!(!page.has_next_page);
        assert!(!page.has_previous_page);
    }

    #[test]
    fn rejects_unknown_image_response_shape() {
        let error = extract_image_page(json!({ "ok": true }), 1, 20).expect_err("invalid shape");

        assert_eq!(error.code, AppErrorCode::ApiError);
    }

    #[test]
    fn infers_supported_upload_mime_types() {
        assert_eq!(upload_mime_type("cover.png").unwrap(), "image/png");
        assert_eq!(upload_mime_type("cover.JPG").unwrap(), "image/jpeg");
        assert_eq!(upload_mime_type("cover.jpeg").unwrap(), "image/jpeg");
        assert_eq!(upload_mime_type("cover.webp").unwrap(), "image/webp");
        assert_eq!(upload_mime_type("cover.gif").unwrap(), "image/gif");
    }

    #[test]
    fn rejects_unsupported_upload_mime_types() {
        let error = upload_mime_type("cover.bmp").expect_err("bmp should be unsupported");

        assert_eq!(error.code, AppErrorCode::UnsupportedFileType);
    }

    #[test]
    fn maps_unauthorized_to_token_invalid() {
        let error = status_error(StatusCode::UNAUTHORIZED, None);

        assert_eq!(error.code, AppErrorCode::TokenInvalid);
    }

    #[test]
    fn maps_payload_too_large_to_file_error() {
        let error = status_error(StatusCode::PAYLOAD_TOO_LARGE, None);

        assert_eq!(error.code, AppErrorCode::FileTooLarge);
    }

    #[test]
    fn maps_server_errors_to_retryable_api_error() {
        let error = status_error(StatusCode::BAD_GATEWAY, None);

        assert_eq!(error.code, AppErrorCode::ApiError);
        assert!(error.retryable);
    }
}
