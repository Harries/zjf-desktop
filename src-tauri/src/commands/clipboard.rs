use crate::models::error::{AppError, AppErrorCode};

#[tauri::command]
pub fn write_clipboard_text(text: String) -> Result<(), AppError> {
    let mut clipboard = arboard::Clipboard::new().map_err(|err| AppError {
        code: AppErrorCode::Unknown,
        message: format!("无法访问系统剪贴板：{err}"),
        retryable: true,
    })?;

    clipboard.set_text(text).map_err(|err| AppError {
        code: AppErrorCode::Unknown,
        message: format!("无法写入系统剪贴板：{err}"),
        retryable: true,
    })
}

#[tauri::command]
pub fn open_external_url(url: String) -> Result<(), AppError> {
    let trimmed = url.trim();

    if !(trimmed.starts_with("http://") || trimmed.starts_with("https://")) {
        return Err(AppError {
            code: AppErrorCode::ApiError,
            message: "只能打开 http 或 https 链接。".to_string(),
            retryable: false,
        });
    }

    open::that(trimmed).map_err(|err| AppError {
        code: AppErrorCode::Unknown,
        message: format!("无法打开默认浏览器：{err}"),
        retryable: true,
    })
}
