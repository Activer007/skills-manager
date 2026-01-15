// Tauri Commands for Security Scanning
//
// This module exposes the security scanner functionality to the frontend
// through Tauri's command system.

use crate::models::security::SecurityReport;
use crate::security::{SecurityScanner, SecurityConfig};
use crate::services::scan_history;
use std::path::PathBuf;

/// Scan a single skill directory for security issues
///
/// # Arguments
/// * `skill_path` - Path to the skill directory
///
/// # Returns
/// * `Result<SecurityReport, String>` - Security scan report or error message
#[tauri::command]
pub async fn scan_skill_security(skill_path: String, locale: Option<String>) -> Result<SecurityReport, String> {
    let scanner = SecurityScanner::new();
    let path = PathBuf::from(&skill_path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", skill_path));
    }

    // Use skill directory name as skill_id
    let skill_id = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

    let report = scanner.scan_directory(&skill_path, skill_id, locale.as_deref().unwrap_or("en"))
        .map_err(|e| e.to_string())?;

    // Save to history (ignore error)
    if let Err(e) = scan_history::save_scan_result(skill_id, &report) {
        eprintln!("Failed to save scan history: {}", e);
    }

    Ok(report)
}

/// Batch scan multiple skills
///
/// # Arguments
/// * `skill_paths` - Vector of skill directory paths to scan
/// * `locale` - Optional locale for the report
///
/// # Returns
/// * `Result<Vec<SecurityReport>, String>` - Vector of security scan reports
#[tauri::command]
pub async fn batch_scan_skills(skill_paths: Vec<String>, locale: Option<String>) -> Result<Vec<SecurityReport>, String> {
    let scanner = SecurityScanner::new();
    let mut results = Vec::new();
    let loc = locale.as_deref().unwrap_or("en");

    for skill_path in skill_paths {
        let path = PathBuf::from(&skill_path);

        if !path.exists() {
            eprintln!("Skill path does not exist: {}", skill_path);
            continue;
        }

        let skill_id = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        match scanner.scan_directory(&skill_path, skill_id, loc) {
            Ok(report) => {
                // For batch scan, we might optionally save history, 
                // but let's avoid it for now to prevent spamming if scanning hundreds of skills.
                results.push(report);
            },
            Err(e) => {
                eprintln!("Failed to scan skill {}: {}", skill_path, e);
                // Continue scanning other skills even if one fails
            }
        }
    }

    Ok(results)
}

/// Get the current security configuration
///
/// # Returns
/// * `Result<SecurityConfig, String>` - Current security configuration
#[tauri::command]
pub async fn get_security_config() -> Result<SecurityConfig, String> {
    SecurityConfig::load().map_err(|e| e.to_string())
}

/// Update the security configuration
///
/// # Arguments
/// * `config` - New security configuration
///
/// # Returns
/// * `Result<(), String>` - Success or error message
#[tauri::command]
pub async fn update_security_config(config: SecurityConfig) -> Result<(), String> {
    config.save().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_scan_history(limit: usize) -> Result<Vec<scan_history::ScanRecord>, String> {
    scan_history::get_recent_scans(limit).map_err(|e| e.to_string())
}

/// Scan a skill with incremental caching support
///
/// Uses SHA-256 checksums to detect changes. If the skill hasn't changed
/// since the last scan, returns the cached report immediately.
///
/// # Arguments
/// * `skill_path` - Path to the skill directory
/// * `locale` - Optional locale for the report (defaults to "en")
/// * `force_rescan` - If true, bypass cache and perform full scan
///
/// # Returns
/// * `Result<SecurityReport, String>` - Security scan report or error message
#[tauri::command]
pub async fn scan_skill_security_incremental(
    skill_path: String,
    locale: Option<String>,
    force_rescan: Option<bool>,
) -> Result<SecurityReport, String> {
    let scanner = SecurityScanner::new();
    let path = std::path::PathBuf::from(&skill_path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", skill_path));
    }

    let skill_id = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

    let loc = locale.as_deref().unwrap_or("en");
    let force = force_rescan.unwrap_or(false);

    let report = scanner.scan_incremental(&skill_path, skill_id, loc, force)
        .map_err(|e| e.to_string())?;

    Ok(report)
}

/// Batch scan multiple skills with incremental caching support
///
/// # Arguments
/// * `skill_paths` - Vector of skill directory paths to scan
/// * `locale` - Optional locale for the report
/// * `force_rescan` - If true, bypass cache for all skills
///
/// # Returns
/// * `Result<Vec<SecurityReport>, String>` - Vector of security scan reports
#[tauri::command]
pub async fn batch_scan_skills_incremental(
    skill_paths: Vec<String>,
    locale: Option<String>,
    force_rescan: Option<bool>,
) -> Result<Vec<SecurityReport>, String> {
    let scanner = SecurityScanner::new();
    let mut results = Vec::new();
    let loc = locale.as_deref().unwrap_or("en");
    let force = force_rescan.unwrap_or(false);

    for skill_path in skill_paths {
        let path = std::path::PathBuf::from(&skill_path);

        if !path.exists() {
            log::warn!("Skill path does not exist: {}", skill_path);
            continue;
        }

        let skill_id = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        match scanner.scan_incremental(&skill_path, skill_id, loc, force) {
            Ok(report) => results.push(report),
            Err(e) => {
                log::error!("Failed to scan skill {}: {}", skill_path, e);
            }
        }
    }

    Ok(results)
}