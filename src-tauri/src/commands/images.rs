use crate::{
    models::{error::AppError, image::ImagePage},
    services::{token_store, zjf_api::ZjfApiClient},
};

#[tauri::command]
pub async fn list_images(page: Option<u32>, page_size: Option<u32>) -> Result<ImagePage, AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default()
        .list_images(&token, page, page_size)
        .await
}

#[tauri::command]
pub async fn delete_image(image_id: String) -> Result<(), AppError> {
    let token = token_store::get_token()?;
    ZjfApiClient::default()
        .delete_image(&token, &image_id)
        .await
}
