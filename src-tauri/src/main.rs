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
            commands::clipboard::write_clipboard_text,
            commands::clipboard::open_external_url,
            commands::images::list_images,
            commands::images::delete_image,
            commands::uploads::upload_image,
            commands::uploads::save_pasted_image
        ])
        .run(tauri::generate_context!())
        .expect("failed to run ZJF Desktop");
}
