use anyhow::Result;
use rusqlite::params;
use uuid::Uuid;
use crate::models::share::{ShareRecord, ShareMetadata};
use crate::services::db::get_connection;

pub fn create_share_link(
    target_type: String,
    target_id: String,
    visibility: String,
    metadata: ShareMetadata,
    expires_at: Option<String>
) -> Result<ShareRecord> {
    let conn = get_connection()?;
    let share_id = Uuid::new_v4().to_string();
    let created_at = chrono::Utc::now().to_rfc3339();
    let metadata_json = serde_json::to_string(&metadata)?;

    conn.execute(
        "INSERT INTO shares (share_id, target_type, target_id, visibility, created_at, expires_at, metadata)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![share_id, target_type, target_id, visibility, created_at, expires_at, metadata_json],
    )?;

    Ok(ShareRecord {
        share_id,
        target_type,
        target_id,
        visibility,
        created_at,
        expires_at,
        metadata,
    })
}

pub fn get_share_by_id(share_id: &str) -> Result<Option<ShareRecord>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT share_id, target_type, target_id, visibility, created_at, expires_at, metadata FROM shares WHERE share_id = ?1")?;

    let mut rows = stmt.query(params![share_id])?;

    if let Some(row) = rows.next()? {
        let metadata_json: String = row.get(6)?;
        let metadata: ShareMetadata = serde_json::from_str(&metadata_json)?;

        Ok(Some(ShareRecord {
            share_id: row.get(0)?,
            target_type: row.get(1)?,
            target_id: row.get(2)?,
            visibility: row.get(3)?,
            created_at: row.get(4)?,
            expires_at: row.get(5)?,
            metadata,
        }))
    } else {
        Ok(None)
    }
}
