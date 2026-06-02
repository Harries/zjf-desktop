use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteAlbum {
    pub id: String,
    pub name: String,
    pub is_default: bool,
    pub image_count: Option<u64>,
    pub storage_bytes: Option<u64>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZjfAlbumRaw {
    pub id: Option<Value>,
    #[serde(alias = "albumName", alias = "title")]
    pub name: Option<String>,
    #[serde(alias = "isDefault")]
    pub is_default: Option<Value>,
    #[serde(alias = "imageCount", alias = "count", alias = "total")]
    pub image_count: Option<Value>,
    #[serde(alias = "storageBytes", alias = "storage")]
    pub storage_bytes: Option<Value>,
    #[serde(alias = "created_at", alias = "createdAt")]
    pub created_at: Option<String>,
}

impl From<ZjfAlbumRaw> for RemoteAlbum {
    fn from(raw: ZjfAlbumRaw) -> Self {
        let id = raw
            .id
            .and_then(value_to_string)
            .filter(|value| !value.is_empty())
            .unwrap_or_default();
        let name = raw
            .name
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| "未命名相册".to_string());

        Self {
            id,
            name,
            is_default: raw.is_default.and_then(value_to_bool).unwrap_or(false),
            image_count: raw.image_count.and_then(value_to_u64),
            storage_bytes: raw.storage_bytes.and_then(value_to_u64),
            created_at: raw.created_at,
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

fn value_to_string(value: Value) -> Option<String> {
    match value {
        Value::String(value) => Some(value),
        Value::Number(value) => Some(value.to_string()),
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

    use super::{RemoteAlbum, ZjfAlbumRaw};

    #[test]
    fn maps_documented_album_fields() {
        let raw: ZjfAlbumRaw = serde_json::from_value(json!({
            "id": "alb_123",
            "name": "Default album",
            "isDefault": 1,
            "imageCount": "12",
            "storageBytes": 123456,
            "createdAt": "2026-06-02T12:00:00.000Z"
        }))
        .expect("raw album should parse");

        let album = RemoteAlbum::from(raw);

        assert_eq!(album.id, "alb_123");
        assert_eq!(album.name, "Default album");
        assert!(album.is_default);
        assert_eq!(album.image_count, Some(12));
        assert_eq!(album.storage_bytes, Some(123456));
        assert_eq!(
            album.created_at.as_deref(),
            Some("2026-06-02T12:00:00.000Z")
        );
    }
}
