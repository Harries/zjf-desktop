use std::fs;

use tauri::AppHandle;
use tauri::Manager;

use crate::{
    models::{
        error::AppError,
        settings::{AccountUploadSettings, AppSettings},
    },
    services::{settings_store, token_store, zjf_api::ZjfApiClient},
};

#[tauri::command]
pub fn get_app_settings(app: AppHandle) -> Result<AppSettings, AppError> {
    settings_store::get_settings(&app)
}

#[tauri::command]
pub fn save_app_settings(app: AppHandle, settings: AppSettings) -> Result<AppSettings, AppError> {
    settings_store::save_settings(&app, &settings)
}

#[tauri::command]
pub fn clear_thumbnail_cache(app: AppHandle) -> Result<(), AppError> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|err| AppError::secure_store(format!("无法定位缓存目录：{err}")))?
        .join("thumbnails");

    if cache_dir.exists() {
        fs::remove_dir_all(&cache_dir)
            .map_err(|err| AppError::secure_store(format!("无法清理缩略图缓存：{err}")))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn get_upload_settings() -> Result<AccountUploadSettings, AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default().get_upload_settings(&token).await
}
