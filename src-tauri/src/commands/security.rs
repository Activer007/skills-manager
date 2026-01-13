// Tauri Commands for Security Scanning
//
// This module exposes the security scanner functionality to the frontend
// through Tauri's command system.

use crate::models::security::SecurityReport;
use crate::security::SecurityScanner;
use std::path::PathBuf;

/// Scan a single skill directory for security issues
///
/// # Arguments
/// * `skill_path` - Path to the skill directory
///
/// # Returns
/// * `Result<SecurityReport, String>` - Security scan report or error message
#[tauri::command]
pub async fn scan_skill_security(skill_path: String) -> Result<SecurityReport, String> {
    let scanner = SecurityScanner::new();
    let path = PathBuf::from(&skill_path);

    if !path.exists() {
        return Err(format!("Path does not exist: {}", skill_path));
    }

    // Use skill directory name as skill_id
    let skill_id = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown");

    scanner.scan_directory(&skill_path, skill_id, "en")
        .map_err(|e| e.to_string())
}

/// Batch scan multiple skills
///
/// # Arguments
/// * `skill_paths` - Vector of skill directory paths to scan
///
/// # Returns
/// * `Result<Vec<SecurityReport>, String>` - Vector of security scan reports
#[tauri::command]
pub async fn batch_scan_skills(skill_paths: Vec<String>) -> Result<Vec<SecurityReport>, String> {
    let scanner = SecurityScanner::new();
    let mut results = Vec::new();

    for skill_path in skill_paths {
        let path = PathBuf::from(&skill_path);

        if !path.exists() {
            eprintln!("Skill path does not exist: {}", skill_path);
            continue;
        }

        let skill_id = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown");

        match scanner.scan_directory(&skill_path, skill_id, "en") {
            Ok(report) => results.push(report),
            Err(e) => {
                eprintln!("Failed to scan skill {}: {}", skill_path, e);
                // Continue scanning other skills even if one fails
            }
        }
    }

    Ok(results)
}
