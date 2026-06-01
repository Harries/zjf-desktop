use serde::Serialize;

#[derive(Debug, PartialEq, Eq, Serialize)]
#[allow(dead_code)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AppErrorCode {
    TokenInvalid,
    TokenMissing,
    NetworkError,
    FileTooLarge,
    UnsupportedFileType,
    ApiError,
    Unknown,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub code: AppErrorCode,
    pub message: String,
    pub retryable: bool,
}

impl AppError {
    #[allow(dead_code)]
    pub fn api(message: impl Into<String>, retryable: bool) -> Self {
        Self {
            code: AppErrorCode::ApiError,
            message: message.into(),
            retryable,
        }
    }

    pub fn token_missing() -> Self {
        Self {
            code: AppErrorCode::TokenMissing,
            message: "尚未配置 zjf.ai Token。".to_string(),
            retryable: false,
        }
    }

    #[allow(dead_code)]
    pub fn token_invalid() -> Self {
        Self {
            code: AppErrorCode::TokenInvalid,
            message: "Token 无效或权限不足，请重新配置。".to_string(),
            retryable: false,
        }
    }

    #[allow(dead_code)]
    pub fn network(message: impl Into<String>) -> Self {
        Self {
            code: AppErrorCode::NetworkError,
            message: message.into(),
            retryable: true,
        }
    }

    #[allow(dead_code)]
    pub fn file_too_large() -> Self {
        Self {
            code: AppErrorCode::FileTooLarge,
            message: "图片文件过大，请压缩后重试。".to_string(),
            retryable: false,
        }
    }

    #[allow(dead_code)]
    pub fn unsupported_file_type() -> Self {
        Self {
            code: AppErrorCode::UnsupportedFileType,
            message: "文件类型不支持，请选择 PNG、JPG、WebP 或 GIF。".to_string(),
            retryable: false,
        }
    }

    pub fn secure_store(message: impl Into<String>) -> Self {
        Self {
            code: AppErrorCode::Unknown,
            message: message.into(),
            retryable: false,
        }
    }
}
