use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};

use tauri::{AppHandle, Manager};

use crate::{
    models::{
        error::AppError, image::RemoteImage, settings::AccountUploadSettings, upload::UploadFile,
    },
    services::{token_store, zjf_api::ZjfApiClient},
};

#[tauri::command]
pub async fn upload_image(
    path: String,
    file_name: Option<String>,
    album_id: Option<String>,
    upload_settings: Option<AccountUploadSettings>,
) -> Result<RemoteImage, AppError> {
    let token = token_store::get_token()?;
    let file = UploadFile {
        path: PathBuf::from(path),
        file_name,
        album_id,
        upload_settings,
    };

    ZjfApiClient::default().upload_image(&token, file).await
}

#[tauri::command]
pub fn save_pasted_image(
    app: AppHandle,
    file_name: String,
    bytes: Vec<u8>,
) -> Result<String, AppError> {
    if bytes.is_empty() {
        return Err(AppError::api("剪贴板图片为空。", false));
    }

    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|err| AppError::secure_store(format!("无法定位缓存目录：{err}")))?
        .join("pasted-images");

    fs::create_dir_all(&cache_dir)
        .map_err(|err| AppError::secure_store(format!("无法创建粘贴图片目录：{err}")))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|err| AppError::secure_store(format!("系统时间异常：{err}")))?
        .as_millis();
    let path = cache_dir.join(format!("{timestamp}-{}", sanitize_file_name(&file_name)));

    fs::write(&path, bytes)
        .map_err(|err| AppError::secure_store(format!("无法保存粘贴图片：{err}")))?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn read_upload_file_bytes(path: String) -> Result<Vec<u8>, AppError> {
    fs::read(PathBuf::from(path))
        .map_err(|err| AppError::api(format!("无法读取待处理图片：{err}"), false))
}

#[tauri::command]
pub fn get_upload_file_size(path: String) -> Result<u64, AppError> {
    fs::metadata(PathBuf::from(path))
        .map(|metadata| metadata.len())
        .map_err(|err| AppError::api(format!("无法读取图片大小：{err}"), false))
}

fn sanitize_file_name(file_name: &str) -> String {
    let sanitized: String = file_name
        .chars()
        .map(|char| match char {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            char if char.is_control() => '-',
            char => char,
        })
        .collect();

    if sanitized.trim().is_empty() {
        "pasted-image.png".to_string()
    } else {
        sanitized
    }
}
