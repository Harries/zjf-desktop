use crate::{
    models::{album::RemoteAlbum, error::AppError},
    services::{token_store, zjf_api::ZjfApiClient},
};

#[tauri::command]
pub async fn list_albums() -> Result<Vec<RemoteAlbum>, AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default().list_albums(&token).await
}

#[tauri::command]
pub async fn create_album(name: String) -> Result<RemoteAlbum, AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default().create_album(&token, &name).await
}

#[tauri::command]
pub async fn rename_album(album_id: String, name: String) -> Result<(), AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default()
        .rename_album(&token, &album_id, &name)
        .await
}

#[tauri::command]
pub async fn delete_album(album_id: String) -> Result<(), AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default()
        .delete_album(&token, &album_id)
        .await
}
