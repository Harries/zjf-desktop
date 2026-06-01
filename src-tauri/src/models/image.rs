use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteImage {
    pub id: String,
    pub file_name: String,
    pub url: String,
    pub thumbnail_url: Option<String>,
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub size_bytes: Option<u64>,
    pub mime_type: Option<String>,
    pub visibility: ImageVisibility,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ImageVisibility {
    Public,
    Private,
    Unknown,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZjfImageRaw {
    pub id: Option<Value>,
    #[serde(alias = "file_name", alias = "filename", alias = "name")]
    pub file_name: Option<String>,
    #[serde(alias = "image_url", alias = "src")]
    pub url: Option<String>,
    #[serde(
        alias = "previewUrl",
        alias = "thumbnail_url",
        alias = "thumbnail",
        alias = "thumb"
    )]
    pub thumbnail_url: Option<String>,
    pub width: Option<Value>,
    pub height: Option<Value>,
    #[serde(alias = "size", alias = "file_size")]
    pub size_bytes: Option<Value>,
    #[serde(alias = "mime_type", alias = "type", alias = "format")]
    pub mime_type: Option<String>,
    pub visibility: Option<String>,
    #[serde(
        alias = "uploadedAt",
        alias = "created_at",
        alias = "uploaded_at",
        alias = "create_time"
    )]
    pub created_at: Option<String>,
}

impl From<ZjfImageRaw> for RemoteImage {
    fn from(raw: ZjfImageRaw) -> Self {
        let url = raw.url.unwrap_or_default();
        let file_name = raw
            .file_name
            .or_else(|| file_name_from_url(&url))
            .unwrap_or_else(|| "image".to_string());
        let id = raw
            .id
            .and_then(value_to_string)
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| url.clone());

        Self {
            id,
            file_name,
            url,
            thumbnail_url: raw.thumbnail_url,
            width: raw.width.and_then(value_to_u32),
            height: raw.height.and_then(value_to_u32),
            size_bytes: raw.size_bytes.and_then(value_to_u64),
            mime_type: raw.mime_type,
            visibility: raw
                .visibility
                .as_deref()
                .map(ImageVisibility::from)
                .unwrap_or(ImageVisibility::Unknown),
            created_at: raw.created_at,
        }
    }
}

impl From<&str> for ImageVisibility {
    fn from(value: &str) -> Self {
        match value.to_ascii_lowercase().as_str() {
            "public" => Self::Public,
            "private" => Self::Private,
            _ => Self::Unknown,
        }
    }
}

fn value_to_string(value: Value) -> Option<String> {
    match value {
        Value::String(value) => Some(value),
        Value::Number(value) => Some(value.to_string()),
        _ => None,
    }
}

fn value_to_u32(value: Value) -> Option<u32> {
    value_to_u64(value).and_then(|value| u32::try_from(value).ok())
}

fn value_to_u64(value: Value) -> Option<u64> {
    match value {
        Value::Number(value) => value.as_u64(),
        Value::String(value) => value.parse().ok(),
        _ => None,
    }
}

fn file_name_from_url(url: &str) -> Option<String> {
    url.rsplit('/')
        .next()
        .filter(|segment| !segment.is_empty())
        .map(ToString::to_string)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{ImageVisibility, RemoteImage, ZjfImageRaw};

    #[test]
    fn maps_alias_fields_to_remote_image() {
        let raw: ZjfImageRaw = serde_json::from_value(json!({
            "id": 12,
            "filename": "hero.png",
            "url": "https://zjf.ai/i/hero.png",
            "previewUrl": "https://zjf.ai/i/hero-thumb.png",
            "width": "1920",
            "height": 1080,
            "size": "340000",
            "type": "image/png",
            "visibility": "public",
            "uploadedAt": "2026-06-01T15:32:00Z"
        }))
        .expect("raw image should parse");

        let image = RemoteImage::from(raw);

        assert_eq!(image.id, "12");
        assert_eq!(image.file_name, "hero.png");
        assert_eq!(image.url, "https://zjf.ai/i/hero.png");
        assert_eq!(
            image.thumbnail_url.as_deref(),
            Some("https://zjf.ai/i/hero-thumb.png")
        );
        assert_eq!(image.width, Some(1920));
        assert_eq!(image.height, Some(1080));
        assert_eq!(image.size_bytes, Some(340000));
        assert!(matches!(image.visibility, ImageVisibility::Public));
    }
}
