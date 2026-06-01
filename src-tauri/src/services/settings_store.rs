use std::{fs, path::PathBuf};

use tauri::{AppHandle, Manager};

use crate::{models::error::AppError, models::settings::AppSettings};

const SETTINGS_FILE: &str = "settings.json";

fn settings_path(app: &AppHandle) -> Result<PathBuf, AppError> {
    let config_dir = app
        .path()
        .app_config_dir()
        .map_err(|err| AppError::secure_store(format!("无法定位应用配置目录：{err}")))?;

    Ok(config_dir.join(SETTINGS_FILE))
}

pub fn get_settings(app: &AppHandle) -> Result<AppSettings, AppError> {
    let path = settings_path(app)?;

    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let contents = fs::read_to_string(&path)
        .map_err(|err| AppError::secure_store(format!("无法读取设置文件：{err}")))?;

    serde_json::from_str(&contents)
        .map_err(|err| AppError::secure_store(format!("设置文件格式无效：{err}")))
}

pub fn save_settings(app: &AppHandle, settings: &AppSettings) -> Result<AppSettings, AppError> {
    let path = settings_path(app)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|err| AppError::secure_store(format!("无法创建设置目录：{err}")))?;
    }

    let contents = serde_json::to_string_pretty(settings)
        .map_err(|err| AppError::secure_store(format!("无法序列化设置：{err}")))?;

    fs::write(&path, contents)
        .map_err(|err| AppError::secure_store(format!("无法保存设置文件：{err}")))?;

    Ok(settings.clone())
}
