#![allow(dead_code)]

use std::{fs, time::Duration};

use reqwest::{multipart, StatusCode};
use serde_json::Value;

use crate::models::{
    error::AppError,
    image::{RemoteImage, ZjfImageRaw},
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
        self.list_images(token).await.map(|_| ())
    }

    pub async fn list_images(&self, token: &str) -> Result<Vec<RemoteImage>, AppError> {
        let response = self
            .http
            .get(self.endpoint("/api/uploads?pageSize=100"))
            .bearer_auth(token)
            .send()
            .await
            .map_err(network_error)?;

        let value = json_response(response).await?;
        let images = extract_image_array(value)?
            .into_iter()
            .filter_map(|value| serde_json::from_value::<ZjfImageRaw>(value).ok())
            .map(RemoteImage::from)
            .collect();

        Ok(images)
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
        let part = multipart::Part::bytes(bytes).file_name(file_name);
        let form = multipart::Form::new().part("image", part);
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

fn extract_image_array(value: Value) -> Result<Vec<Value>, AppError> {
    if let Value::Array(images) = value {
        return Ok(images);
    }

    for key in ["uploads", "data", "images", "items", "list"] {
        if let Some(Value::Array(images)) = value.get(key) {
            return Ok(images.clone());
        }
    }

    Err(AppError::api("图片列表响应格式无效。", false))
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

    use super::{extract_image_array, status_error};
    use crate::models::error::AppErrorCode;

    #[test]
    fn extracts_top_level_image_array() {
        let images = extract_image_array(json!([{ "id": "image-001" }])).expect("array response");

        assert_eq!(images.len(), 1);
        assert_eq!(images[0]["id"], "image-001");
    }

    #[test]
    fn extracts_nested_image_arrays() {
        for key in ["uploads", "data", "images", "items", "list"] {
            let images =
                extract_image_array(json!({ key: [{ "id": "image-001" }] })).expect("nested array");

            assert_eq!(images.len(), 1);
            assert_eq!(images[0]["id"], "image-001");
        }
    }

    #[test]
    fn rejects_unknown_image_response_shape() {
        let error = extract_image_array(json!({ "ok": true })).expect_err("invalid shape");

        assert_eq!(error.code, AppErrorCode::ApiError);
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
