use serde::{Deserialize, Serialize};
use serde_json::Value;

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

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountUploadSettings {
    pub default_visibility: Option<String>,
    pub default_compress: bool,
    pub default_quality: Option<u8>,
    pub default_watermark: bool,
    pub watermark_text: Option<String>,
}

impl Default for AccountUploadSettings {
    fn default() -> Self {
        Self {
            default_visibility: Some("public".to_string()),
            default_compress: false,
            default_quality: Some(80),
            default_watermark: false,
            watermark_text: None,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccountUploadSettingsRaw {
    pub default_visibility: Option<String>,
    pub default_compress: Option<Value>,
    pub default_quality: Option<Value>,
    pub default_watermark: Option<Value>,
    pub watermark_text: Option<String>,
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

impl From<AccountUploadSettingsRaw> for AccountUploadSettings {
    fn from(raw: AccountUploadSettingsRaw) -> Self {
        Self {
            default_visibility: raw
                .default_visibility
                .filter(|visibility| matches!(visibility.as_str(), "public" | "private")),
            default_compress: raw
                .default_compress
                .and_then(value_to_bool)
                .unwrap_or(false),
            default_quality: raw
                .default_quality
                .and_then(value_to_u64)
                .and_then(|value| u8::try_from(value).ok())
                .map(|value| value.clamp(1, 100)),
            default_watermark: raw
                .default_watermark
                .and_then(value_to_bool)
                .unwrap_or(false),
            watermark_text: raw.watermark_text.filter(|value| !value.trim().is_empty()),
        }
    }
}

fn value_to_bool(value: Value) -> Option<bool> {
    match value {
        Value::Bool(value) => Some(value),
        Value::Number(value) => value.as_u64().map(|value| value > 0),
        Value::String(value) => match value.to_ascii_lowercase().as_str() {
            "true" | "1" | "yes" => Some(true),
            "false" | "0" | "no" => Some(false),
            _ => None,
        },
        _ => None,
    }
}

fn value_to_u64(value: Value) -> Option<u64> {
    match value {
        Value::Number(value) => value.as_u64(),
        Value::String(value) => value.parse().ok(),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{AccountUploadSettings, AccountUploadSettingsRaw};

    #[test]
    fn maps_account_upload_settings() {
        let raw: AccountUploadSettingsRaw = serde_json::from_value(json!({
            "defaultVisibility": "private",
            "defaultCompress": 1,
            "defaultQuality": "75",
            "defaultWatermark": true,
            "watermarkText": "ZJF"
        }))
        .expect("settings should parse");

        let settings = AccountUploadSettings::from(raw);

        assert_eq!(settings.default_visibility.as_deref(), Some("private"));
        assert!(settings.default_compress);
        assert_eq!(settings.default_quality, Some(75));
        assert!(settings.default_watermark);
        assert_eq!(settings.watermark_text.as_deref(), Some("ZJF"));
    }
}
