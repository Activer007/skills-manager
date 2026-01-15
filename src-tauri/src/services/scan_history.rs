use crate::models::security::SecurityReport;
use crate::services::db::get_connection;
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanRecord {
    pub id: i64,
    pub skill_id: String,
    pub skill_name: String,
    /// Unix timestamp in milliseconds (consistent with JavaScript Date)
    pub scanned_at: i64,
    pub score: i32,
    pub level: String,
    pub issues_count: i32,
    pub blocked: bool,
}

/// Save a security scan result to the database history.
pub fn save_scan_result(skill_name: &str, report: &SecurityReport) -> Result<()> {
    let conn = get_connection()?;
    let report_json = serde_json::to_string(report)?;
    // Use milliseconds for consistency with JavaScript Date
    let now = chrono::Utc::now().timestamp_millis();

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

/// Cached report with checksum for incremental scanning
#[derive(Debug, Clone)]
pub struct CachedReport {
    pub report: SecurityReport,
    pub checksum: String,
    #[allow(dead_code)]
    pub cached_at: i64,
}

/// Get a cached security report for a skill by skill_id
pub fn get_cached_report(skill_id: &str) -> Result<Option<CachedReport>> {
    let conn = get_connection()?;
    
    let result = conn.query_row(
        "SELECT report_json, checksum, cached_at FROM cached_reports WHERE skill_id = ?1",
        [skill_id],
        |row| {
            let report_json: String = row.get(0)?;
            let checksum: String = row.get(1)?;
            let cached_at: i64 = row.get(2)?;
            Ok((report_json, checksum, cached_at))
        },
    );

    match result {
        Ok((report_json, checksum, cached_at)) => {
            let report: SecurityReport = serde_json::from_str(&report_json)?;
            Ok(Some(CachedReport {
                report,
                checksum,
                cached_at,
            }))
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

/// Save a security report to cache with its checksum
pub fn save_cached_report(skill_id: &str, skill_path: &str, report: &SecurityReport, checksum: &str) -> Result<()> {
    let conn = get_connection()?;
    let report_json = serde_json::to_string(report)?;
    let now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "INSERT OR REPLACE INTO cached_reports (skill_id, skill_path, report_json, checksum, cached_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        rusqlite::params![skill_id, skill_path, report_json, checksum, now],
    )?;

    log::debug!("Cached security report for skill: {} (checksum: {})", skill_id, &checksum[..8]);
    Ok(())
}

/// Invalidate cached report for a skill
#[allow(dead_code)]
pub fn invalidate_cached_report(skill_id: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM cached_reports WHERE skill_id = ?1", [skill_id])?;
    Ok(())
}

