use std::sync::OnceLock;

use keyring_core::{Entry, Error as KeyringError};

use crate::models::error::AppError;

const SERVICE_NAME: &str = "ai.zjf.desktop";
const TOKEN_USER: &str = "api-token";

static STORE_INIT: OnceLock<Result<(), String>> = OnceLock::new();

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TokenStatus {
    pub has_token: bool,
    pub masked_token: Option<String>,
}

fn ensure_store() -> Result<(), AppError> {
    let init =
        STORE_INIT.get_or_init(|| keyring::use_native_store(false).map_err(|err| err.to_string()));

    init.as_ref()
        .map_err(|message| AppError::secure_store(format!("无法访问系统安全存储：{message}")))
        .copied()
}

fn token_entry() -> Result<Entry, AppError> {
    ensure_store()?;
    Entry::new(SERVICE_NAME, TOKEN_USER)
        .map_err(|err| AppError::secure_store(format!("无法创建 Token 存储项：{err}")))
}

pub fn save_token(token: &str) -> Result<TokenStatus, AppError> {
    let trimmed = token.trim();

    if trimmed.is_empty() {
        return Err(AppError::token_missing());
    }

    token_entry()?
        .set_password(trimmed)
        .map_err(|err| AppError::secure_store(format!("无法保存 Token：{err}")))?;

    Ok(TokenStatus {
        has_token: true,
        masked_token: Some(mask_token(trimmed)),
    })
}

pub fn get_token() -> Result<String, AppError> {
    match token_entry()?.get_password() {
        Ok(token) => Ok(token),
        Err(KeyringError::NoEntry) => Err(AppError::token_missing()),
        Err(err) => Err(AppError::secure_store(format!("无法读取 Token：{err}"))),
    }
}

pub fn get_token_status() -> Result<TokenStatus, AppError> {
    match get_token() {
        Ok(token) => Ok(TokenStatus {
            has_token: true,
            masked_token: Some(mask_token(&token)),
        }),
        Err(error) if matches!(error.code, crate::models::error::AppErrorCode::TokenMissing) => {
            Ok(TokenStatus {
                has_token: false,
                masked_token: None,
            })
        }
        Err(error) => Err(error),
    }
}

pub fn clear_token() -> Result<TokenStatus, AppError> {
    match token_entry()?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(TokenStatus {
            has_token: false,
            masked_token: None,
        }),
        Err(err) => Err(AppError::secure_store(format!("无法清除 Token：{err}"))),
    }
}

pub fn mask_token(token: &str) -> String {
    let prefix: String = token.chars().take(4).collect();
    let suffix_chars: Vec<char> = token.chars().rev().take(4).collect();
    let suffix: String = suffix_chars.into_iter().rev().collect();

    if token.chars().count() <= 8 {
        return "••••".to_string();
    }

    format!("{prefix}••••••••••{suffix}")
}

#[cfg(test)]
mod tests {
    use super::mask_token;

    #[test]
    fn masks_short_tokens_completely() {
        assert_eq!(mask_token("short"), "••••");
    }

    #[test]
    fn preserves_prefix_and_suffix_for_long_tokens() {
        assert_eq!(mask_token("zjf_1234567890abcd"), "zjf_••••••••••abcd");
    }
}
