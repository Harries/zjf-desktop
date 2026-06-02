use crate::{
    models::{album::RemoteAlbum, error::AppError},
    services::{token_store, zjf_api::ZjfApiClient},
};

#[tauri::command]
pub async fn list_albums() -> Result<Vec<RemoteAlbum>, AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default().list_albums(&token).await
}
