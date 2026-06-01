use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum CopyFormat {
    Url,
    Markdown,
    Html,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub default_copy_format: CopyFormat,
    pub auto_copy_after_upload: bool,
    pub thumbnail_cache_enabled: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            default_copy_format: CopyFormat::Markdown,
            auto_copy_after_upload: true,
            thumbnail_cache_enabled: true,
        }
    }
}
