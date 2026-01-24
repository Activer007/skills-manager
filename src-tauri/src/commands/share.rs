use tauri::command;
use crate::models::share::{ShareRecord, ShareMetadata};
use crate::services::share_service;

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
