use crate::{
    models::{
        error::AppError,
        image::{ImagePage, SignedImageUrl},
    },
    services::{token_store, zjf_api::ZjfApiClient},
};

#[tauri::command]
pub async fn list_images(
    page: Option<u32>,
    page_size: Option<u32>,
    album_id: Option<String>,
) -> Result<ImagePage, AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default()
        .list_images(&token, page, page_size, album_id.as_deref())
        .await
}

#[tauri::command]
pub async fn delete_image(image_id: String) -> Result<(), AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default()
        .delete_image(&token, &image_id)
        .await
}

#[tauri::command]
pub async fn create_signed_image_url(
    image_id: String,
    expires_in: Option<u32>,
) -> Result<SignedImageUrl, AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default()
        .create_signed_image_url(&token, &image_id, expires_in)
        .await
}
