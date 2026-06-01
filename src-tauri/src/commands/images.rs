use crate::{
    models::{error::AppError, image::RemoteImage},
    services::{token_store, zjf_api::ZjfApiClient},
};

#[tauri::command]
pub async fn list_images() -> Result<Vec<RemoteImage>, AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default().list_images(&token).await
}

#[tauri::command]
pub async fn delete_image(image_id: String) -> Result<(), AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default()
        .delete_image(&token, &image_id)
        .await
}
