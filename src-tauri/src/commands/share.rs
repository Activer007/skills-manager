use tauri::command;
use crate::models::share::{ShareRecord, ShareMetadata};
use crate::services::share_service;
use std::process::Command;
use std::path::Path;

#[command]
pub async fn generate_share_link(
    target_type: String,
    target_id: String,
    visibility: String,
    metadata: ShareMetadata,
    expires_at: Option<String>
) -> Result<ShareRecord, String> {
    share_service::create_share_link(target_type, target_id, visibility, metadata, expires_at)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn resolve_share_link(
    share_id: String
) -> Result<Option<ShareRecord>, String> {
    share_service::get_share_by_id(&share_id)
        .map_err(|e| e.to_string())
}

#[command]
pub async fn get_git_remote_url(path: String) -> Result<Option<String>, String> {
    let path_obj = Path::new(&path);
    if !path_obj.exists() || !path_obj.is_dir() {
        return Ok(None);
    }

    let output = Command::new("git")
        .args(&["config", "--get", "remote.origin.url"])
        .current_dir(path_obj)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let url = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if url.is_empty() {
            Ok(None)
        } else {
            Ok(Some(url))
        }
    } else {
        Ok(None)
    }
}
