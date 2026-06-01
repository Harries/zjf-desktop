use crate::{
    models::error::AppError,
    services::{
        token_store::{self, TokenStatus},
        zjf_api::ZjfApiClient,
    },
};

#[tauri::command]
pub async fn validate_token(token: String) -> Result<TokenStatus, AppError> {
    if token.trim().is_empty() {
        return Err(AppError::token_missing());
    }

    ZjfApiClient::default().validate_token(&token).await?;
    token_store::save_token(&token)
}

#[tauri::command]
pub fn save_token(token: String) -> Result<TokenStatus, AppError> {
    token_store::save_token(&token)
}

#[tauri::command]
pub fn get_token_status() -> Result<TokenStatus, AppError> {
    token_store::get_token_status()
}

#[tauri::command]
pub fn clear_token() -> Result<TokenStatus, AppError> {
    token_store::clear_token()
}
