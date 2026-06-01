use std::path::PathBuf;

use serde::Serialize;

use super::image::RemoteImage;

#[derive(Debug, Clone, Serialize)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
pub struct UploadTask {
    pub id: String,
    pub file_name: String,
    pub size_bytes: u64,
    pub status: UploadTaskStatus,
    pub progress: u8,
    pub image: Option<RemoteImage>,
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize)]
#[allow(dead_code)]
#[serde(rename_all = "camelCase")]
pub enum UploadTaskStatus {
    Queued,
    Uploading,
    Success,
    Failed,
}

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct UploadFile {
    pub path: PathBuf,
    pub file_name: Option<String>,
}
