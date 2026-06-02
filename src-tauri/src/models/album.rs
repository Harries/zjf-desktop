use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteAlbum {
    pub id: String,
    pub name: String,
    pub image_count: Option<u64>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZjfAlbumRaw {
    pub id: Option<Value>,
    #[serde(alias = "albumName", alias = "title")]
    pub name: Option<String>,
    #[serde(alias = "imageCount", alias = "count", alias = "total")]
    pub image_count: Option<Value>,
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
            image_count: raw.image_count.and_then(value_to_u64),
            created_at: raw.created_at,
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
            "imageCount": "12",
            "createdAt": "2026-06-02T12:00:00.000Z"
        }))
        .expect("raw album should parse");

        let album = RemoteAlbum::from(raw);

        assert_eq!(album.id, "alb_123");
        assert_eq!(album.name, "Default album");
        assert_eq!(album.image_count, Some(12));
        assert_eq!(
            album.created_at.as_deref(),
            Some("2026-06-02T12:00:00.000Z")
        );
    }
}
