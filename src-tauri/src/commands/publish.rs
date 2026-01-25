use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::security::{SecurityScanner, ScanMode};
use crate::models::security::{SecurityReport, SecurityLevel};
use crate::models::publish::{PublishRecord, PublishStatus};
use crate::services::db::get_connection;
use rusqlite::params;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum CheckStatus {
    Pass,
    Fail,
    Warning,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PreflightCheck {
    pub name: String,
    pub status: CheckStatus,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PreflightResult {
    pub passed: bool,
    pub checks: Vec<PreflightCheck>,
    pub security_report: Option<SecurityReport>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PublishResult {
    pub success: bool,
    pub message: String,
    pub skill_id: Option<String>,
    pub listing_id: Option<String>,
    pub published_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PublishMetadata {
    pub name: String,
    pub version: String,
    pub author: Option<String>,
    pub description: Option<String>,
    pub tags: Vec<String>,
}

#[tauri::command]
pub async fn run_publish_preflight(skill_path: String) -> Result<PreflightResult, String> {
    let path = Path::new(&skill_path);
    let mut checks = Vec::new();
    let mut passed = true;

    // 1. Check Existence
    if !path.exists() {
        return Ok(PreflightResult {
            passed: false,
            checks: vec![PreflightCheck {
                name: "Directory Existence".to_string(),
                status: CheckStatus::Fail,
                message: "Skill directory does not exist".to_string(),
            }],
            security_report: None,
        });
    }

    // 2. Check SKILL.md
    let skill_md = path.join("SKILL.md");
    if skill_md.exists() {
        checks.push(PreflightCheck {
            name: "SKILL.md".to_string(),
            status: CheckStatus::Pass,
            message: "Found SKILL.md".to_string(),
        });
    } else {
        checks.push(PreflightCheck {
            name: "SKILL.md".to_string(),
            status: CheckStatus::Fail,
            message: "Missing SKILL.md file".to_string(),
        });
        passed = false;
    }

    // 3. Check License
    let license_files = ["LICENSE", "LICENSE.md", "LICENSE.txt"];
    let has_license = license_files.iter().any(|f| path.join(f).exists());
    if has_license {
        checks.push(PreflightCheck {
            name: "License".to_string(),
            status: CheckStatus::Pass,
            message: "Found LICENSE file".to_string(),
        });
    } else {
        checks.push(PreflightCheck {
            name: "License".to_string(),
            status: CheckStatus::Warning,
            message: "No LICENSE file found. It is recommended to include one.".to_string(),
        });
    }

    // 4. Security Scan
    let scanner = SecurityScanner::new();
    // Use Strict mode for publishing to ensure high quality
    let scan_result = scanner.scan_directory(
        &skill_path,
        "publish-preflight",
        "en",
        ScanMode::Strict,
        &[]
    ).map_err(|e: anyhow::Error| e.to_string())?;

    let security_status = match scan_result.level {
        SecurityLevel::Safe => CheckStatus::Pass,
        SecurityLevel::Low => CheckStatus::Warning, // Low risk is warning
        _ => CheckStatus::Fail, // Medium or higher is Fail for publishing
    };

    let security_message = if scan_result.blocked {
        "Critical security issues detected (Hard Block)".to_string()
    } else {
        format!("Security Level: {:?} (Score: {})", scan_result.level, scan_result.score)
    };

    if security_status == CheckStatus::Fail {
        passed = false;
    }

    checks.push(PreflightCheck {
        name: "Security Scan".to_string(),
        status: security_status,
        message: security_message,
    });

    // 5. Basic Content Check (e.g. not empty)
    // This is partially covered by analyzer, but we can do a quick check here if needed.
    // For now, SKILL.md existence is the baseline.

    Ok(PreflightResult {
        passed,
        checks,
        security_report: Some(scan_result),
    })
}

#[tauri::command]
pub async fn publish_skill(_skill_path: String, metadata: PublishMetadata) -> Result<PublishResult, String> {
    // Basic validation
    if metadata.name.trim().is_empty() {
        return Err("Skill name cannot be empty".to_string());
    }

    // Version validation (simple semver check)
    // e.g., "1.0.0", "0.1.0-beta"
    let version_regex = regex::Regex::new(r"^\d+\.\d+\.\d+(?:-[\w\d\.]+)?$").map_err(|e| e.to_string())?;
    if !version_regex.is_match(&metadata.version) {
        return Err("Invalid version format. Expected SemVer (e.g., 1.0.0)".to_string());
    }

    let name = metadata.name.clone();
    let version = metadata.version.clone();
    let now = chrono::Utc::now().timestamp_millis();

    // Generate unique IDs for mock API
    let skill_id = format!("skill_{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("unknown"));
    let listing_id = format!("listing_{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("unknown"));
    let publish_record_id = format!("pub_{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("unknown"));

    // Mock API: Simulate network delay
    tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;

    // Log publish attempt
    log::info!("Publishing skill: {} v{} (ID: {}, Listing: {})", name, version, skill_id, listing_id);

    // Save publish record to database (ignore errors in mock mode)
    let record = PublishRecord {
        id: publish_record_id.clone(),
        skill_name: name.clone(),
        skill_version: version.clone(),
        skill_id: skill_id.clone(),
        listing_id: listing_id.clone(),
        author: metadata.author.clone(),
        description: metadata.description.clone(),
        tags: metadata.tags.clone(),
        published_at: now,
        status: PublishStatus::Published,
        error_message: None,
    };

    if let Err(e) = save_publish_record(&record) {
        log::warn!("Failed to save publish record: {}", e);
    }

    Ok(PublishResult {
        success: true,
        message: format!("Successfully published {} v{} to marketplace", name, version),
        skill_id: Some(skill_id),
        listing_id: Some(listing_id),
        published_at: Some(now),
    })
}

/// Save publish record to database
fn save_publish_record(record: &PublishRecord) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let tags_json = serde_json::to_string(&record.tags).map_err(|e| e.to_string())?;
    let status_str = match record.status {
        PublishStatus::Published => "published",
        PublishStatus::Failed => "failed",
        PublishStatus::Pending => "pending",
    };

    conn.execute(
        "INSERT INTO publish_history (id, skill_name, skill_version, skill_id, listing_id, author, description, tags, published_at, status, error_message)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            record.id,
            record.skill_name,
            record.skill_version,
            record.skill_id,
            record.listing_id,
            record.author,
            record.description,
            tags_json,
            record.published_at,
            status_str,
            record.error_message,
        ],
    ).map_err(|e| e.to_string())?;

    log::info!("Saved publish record: {} v{} (Listing: {})", record.skill_name, record.skill_version, record.listing_id);
    Ok(())
}

/// Get all publish records
#[tauri::command]
pub async fn get_publish_history() -> Result<Vec<PublishRecord>, String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT id, skill_name, skill_version, skill_id, listing_id, author, description, tags, published_at, status, error_message
         FROM publish_history
         ORDER BY published_at DESC"
    ).map_err(|e| e.to_string())?;

    let records = stmt.query_map([], |row| {
        let status_str: String = row.get(9)?;
        let status = match status_str.as_str() {
            "published" => PublishStatus::Published,
            "failed" => PublishStatus::Failed,
            "pending" => PublishStatus::Pending,
            _ => PublishStatus::Failed,
        };

        let tags_json: String = row.get(7)?;
        let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();

        Ok(PublishRecord {
            id: row.get(0)?,
            skill_name: row.get(1)?,
            skill_version: row.get(2)?,
            skill_id: row.get(3)?,
            listing_id: row.get(4)?,
            author: row.get(5)?,
            description: row.get(6)?,
            tags,
            published_at: row.get(8)?,
            status,
            error_message: row.get(10)?,
        })
    }).map_err(|e| e.to_string())?;

    let mut result = Vec::new();
    for record in records {
        result.push(record.map_err(|e| e.to_string())?);
    }

    Ok(result)
}

/// Delete a publish record
#[tauri::command]
pub async fn delete_publish_record(record_id: String) -> Result<(), String> {
    let conn = get_connection().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM publish_history WHERE id = ?1",
        params![record_id],
    ).map_err(|e| e.to_string())?;

    log::info!("Deleted publish record: {}", record_id);
    Ok(())
}


#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_publish_skill_success() {
        let metadata = PublishMetadata {
            name: "test-skill".to_string(),
            version: "1.0.0".to_string(),
            author: Some("Tester".to_string()),
            description: Some("A test skill".to_string()),
            tags: vec!["test".to_string()],
        };

        let result = publish_skill("/tmp/test-skill".to_string(), metadata).await;
        assert!(result.is_ok());
        let publish_result = result.unwrap();
        assert!(publish_result.success);
        assert!(publish_result.skill_id.is_some());
        assert!(publish_result.listing_id.is_some());
        assert!(publish_result.published_at.is_some());
    }

    #[tokio::test]
    async fn test_publish_skill_invalid_version() {
        let metadata = PublishMetadata {
            name: "test-skill".to_string(),
            version: "invalid-version".to_string(),
            author: Some("Tester".to_string()),
            description: Some("A test skill".to_string()),
            tags: vec![],
        };

        let result = publish_skill("/tmp/test-skill".to_string(), metadata).await;
        assert!(result.is_err());
        assert!(result.err().unwrap().contains("Invalid version format"));
    }

    #[tokio::test]
    async fn test_publish_skill_empty_name() {
        let metadata = PublishMetadata {
            name: "".to_string(),
            version: "1.0.0".to_string(),
            author: Some("Tester".to_string()),
            description: None,
            tags: vec![],
        };

        let result = publish_skill("/tmp/test-skill".to_string(), metadata).await;
        assert!(result.is_err());
        assert_eq!(result.err().unwrap(), "Skill name cannot be empty");
    }
}
