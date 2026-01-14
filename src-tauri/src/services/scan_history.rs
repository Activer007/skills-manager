use crate::models::security::SecurityReport;
use crate::services::db::get_connection;
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanRecord {
    pub id: i64,
    pub skill_id: String,
    pub skill_name: String,
    pub scanned_at: i64,
    pub score: i32,
    pub level: String,
    pub issues_count: i32,
    pub blocked: bool,
}

pub fn save_scan_result(skill_name: &str, report: &SecurityReport) -> Result<()> {
    let conn = get_connection()?;
    let report_json = serde_json::to_string(report)?;
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT INTO security_scan_history (
            skill_id, skill_name, scanned_at, score, level, issues_count, blocked, report_json
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![
            report.skill_id,
            skill_name,
            now,
            report.score,
            report.level.as_str(),
            report.issues.len(),
            report.blocked,
            report_json
        ],
    )?;
    Ok(())
}

pub fn get_recent_scans(limit: usize) -> Result<Vec<ScanRecord>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare(
        "SELECT id, skill_id, skill_name, scanned_at, score, level, issues_count, blocked
         FROM security_scan_history
         ORDER BY scanned_at DESC
         LIMIT ?1"
    )?;

    let rows = stmt.query_map([limit], |row| {
        Ok(ScanRecord {
            id: row.get(0)?,
            skill_id: row.get(1)?,
            skill_name: row.get(2)?,
            scanned_at: row.get(3)?,
            score: row.get(4)?,
            level: row.get(5)?,
            issues_count: row.get(6)?,
            blocked: row.get(7)?,
        })
    })?;

    let mut records = Vec::new();
    for row in rows {
        records.push(row?);
    }
    Ok(records)
}
