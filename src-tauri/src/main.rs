#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod models;
mod services;

#[tauri::command]
fn app_health() -> &'static str {
    "ok"
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            app_health,
            commands::auth::validate_token,
            commands::auth::save_token,
            commands::auth::get_token_status,
            commands::auth::clear_token,
            commands::settings::get_app_settings,
            commands::settings::save_app_settings,
            commands::settings::clear_thumbnail_cache,
            commands::settings::get_upload_settings,
            commands::clipboard::write_clipboard_text,
            commands::clipboard::open_external_url,
            commands::albums::list_albums,
            commands::albums::create_album,
            commands::albums::rename_album,
            commands::albums::delete_album,
            commands::images::list_images,
            commands::images::delete_image,
            commands::images::create_signed_image_url,
            commands::uploads::upload_image,
            commands::uploads::save_pasted_image,
            commands::uploads::read_upload_file_bytes,
            commands::uploads::get_upload_file_size
        ])
        .run(tauri::generate_context!())
        .expect("failed to run ZJF Desktop");
}
