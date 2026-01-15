// Tauri Commands for Security Scanning
//
// This module exposes the security scanner functionality to the frontend
// through Tauri's command system.

use crate::models::security::{SecurityReport, SecurityLevel};
use crate::models::whitelist::{WhitelistEntry, WhitelistType};
use crate::security::{SecurityScanner, SecurityConfig, ScanMode};
use crate::services::scan_history;
use crate::services::whitelist_service::WhitelistService;
use std::path::PathBuf;
use chrono::Utc;
use uuid::Uuid;

/// 将字符串解析为 ScanMode
fn parse_scan_mode(mode: Option<&str>) -> ScanMode {
    match mode {
        Some("strict") => ScanMode::Strict,
        Some("relaxed") => ScanMode::Relaxed,
        _ => ScanMode::Standard,  // 默认标准模式
    }
}

/// Helper to get whitelisted rules and check skill whitelist
fn check_whitelist(skill_id: &str) -> (bool, Vec<String>) {
    if let Ok(service) = WhitelistService::new() {
        // Check if skill is whitelisted
        if service.is_skill_whitelisted(skill_id).unwrap_or(false) {
            return (true, Vec::new());
        }
        // Get whitelisted rules
        let rules = service.get_whitelisted_rules().unwrap_or_default();
        return (false, rules);
    }
    (false, Vec::new())
}

/// Scan a single skill directory for security issues
///
/// # Arguments
/// * `skill_path` - Path to the skill directory
/// * `locale` - Optional locale for the report (defaults to "en")
/// * `mode` - Optional scan mode: "strict", "standard" (default), or "relaxed"
///
/// # Returns
/// * `Result<SecurityReport, String>` - Security scan report or error message
#[tauri::command]
pub async fn scan_skill_security(
    skill_path: String,
    locale: Option<String>,
    mode: Option<String>,
) -> Result<SecurityReport, String> {
    let scanner = SecurityScanner::new();
    let path = PathBuf::from(&skill_path);
    let scan_mode = parse_scan_mode(mode.as_deref());

    if !path.exists() {
        return Err(format!("Path does not exist: {}", skill_path));
    }

    // Use skill directory name as skill_id
    let skill_id_str = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Check whitelist
    let (is_whitelisted, whitelisted_rules) = check_whitelist(&skill_id_str);
    if is_whitelisted {
        return Ok(SecurityReport {
            scan_id: Uuid::new_v4().to_string(),
            scanned_at: Utc::now().to_rfc3339(),
            skill_id: skill_id_str,
            score: 100,
            level: SecurityLevel::Safe,
            blocked: false,
            issues: Vec::new(),
            hard_trigger_issues: Vec::new(),
            scanned_files: Vec::new(), // Skipped
            scan_duration_ms: 0,
            recommendations: vec!["Skill is whitelisted.".to_string()],
        });
    }

    let report = scanner.scan_directory(&skill_path, &skill_id_str, locale.as_deref().unwrap_or("en"), scan_mode, &whitelisted_rules)
        .map_err(|e| e.to_string())?;

    // Save to history (ignore error)
    if let Err(e) = scan_history::save_scan_result(&skill_id_str, &report) {
        eprintln!("Failed to save scan history: {}", e);
    }

    Ok(report)
}

/// Batch scan multiple skills
///
/// # Arguments
/// * `skill_paths` - Vector of skill directory paths to scan
/// * `locale` - Optional locale for the report
/// * `mode` - Optional scan mode: "strict", "standard" (default), or "relaxed"
///
/// # Returns
/// * `Result<Vec<SecurityReport>, String>` - Vector of security scan reports
#[tauri::command]
pub async fn batch_scan_skills(
    skill_paths: Vec<String>,
    locale: Option<String>,
    mode: Option<String>,
) -> Result<Vec<SecurityReport>, String> {
    let scanner = SecurityScanner::new();
    let mut results = Vec::new();
    let loc = locale.as_deref().unwrap_or("en");
    let scan_mode = parse_scan_mode(mode.as_deref());

    // Pre-fetch whitelisted rules to avoid querying DB for every skill? 
    // But we also need to check if each skill is whitelisted.
    // Let's just use check_whitelist helper for simplicity.
    
    for skill_path in skill_paths {
        let path = PathBuf::from(&skill_path);

        if !path.exists() {
            eprintln!("Skill path does not exist: {}", skill_path);
            continue;
        }

        let skill_id_str = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let (is_whitelisted, whitelisted_rules) = check_whitelist(&skill_id_str);
        if is_whitelisted {
            results.push(SecurityReport {
                scan_id: Uuid::new_v4().to_string(),
                scanned_at: Utc::now().to_rfc3339(),
                skill_id: skill_id_str,
                score: 100,
                level: SecurityLevel::Safe,
                blocked: false,
                issues: Vec::new(),
                hard_trigger_issues: Vec::new(),
                scanned_files: Vec::new(),
                scan_duration_ms: 0,
                recommendations: vec!["Skill is whitelisted.".to_string()],
            });
            continue;
        }

        match scanner.scan_directory(&skill_path, &skill_id_str, loc, scan_mode, &whitelisted_rules) {
            Ok(report) => {
                results.push(report);
            },
            Err(e) => {
                eprintln!("Failed to scan skill {}: {}", skill_path, e);
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
/// * `mode` - Optional scan mode: "strict", "standard" (default), or "relaxed"
///
/// # Returns
/// * `Result<SecurityReport, String>` - Security scan report or error message
#[tauri::command]
pub async fn scan_skill_security_incremental(
    skill_path: String,
    locale: Option<String>,
    force_rescan: Option<bool>,
    mode: Option<String>,
) -> Result<SecurityReport, String> {
    let scanner = SecurityScanner::new();
    let path = std::path::PathBuf::from(&skill_path);
    let scan_mode = parse_scan_mode(mode.as_deref());

    if !path.exists() {
        return Err(format!("Path does not exist: {}", skill_path));
    }

    let skill_id_str = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Check whitelist
    let (is_whitelisted, whitelisted_rules) = check_whitelist(&skill_id_str);
    if is_whitelisted {
        return Ok(SecurityReport {
            scan_id: Uuid::new_v4().to_string(),
            scanned_at: Utc::now().to_rfc3339(),
            skill_id: skill_id_str,
            score: 100,
            level: SecurityLevel::Safe,
            blocked: false,
            issues: Vec::new(),
            hard_trigger_issues: Vec::new(),
            scanned_files: Vec::new(),
            scan_duration_ms: 0,
            recommendations: vec!["Skill is whitelisted.".to_string()],
        });
    }

    let loc = locale.as_deref().unwrap_or("en");
    let force = force_rescan.unwrap_or(false);

    let report = scanner.scan_incremental(&skill_path, &skill_id_str, loc, force, scan_mode, &whitelisted_rules)
        .map_err(|e| e.to_string())?;

    Ok(report)
}

/// Batch scan multiple skills with incremental caching support
///
/// # Arguments
/// * `skill_paths` - Vector of skill directory paths to scan
/// * `locale` - Optional locale for the report
/// * `force_rescan` - If true, bypass cache for all skills
/// * `mode` - Optional scan mode: "strict", "standard" (default), or "relaxed"
///
/// # Returns
/// * `Result<Vec<SecurityReport>, String>` - Vector of security scan reports
#[tauri::command]
pub async fn batch_scan_skills_incremental(
    skill_paths: Vec<String>,
    locale: Option<String>,
    force_rescan: Option<bool>,
    mode: Option<String>,
) -> Result<Vec<SecurityReport>, String> {
    let scanner = SecurityScanner::new();
    let mut results = Vec::new();
    let loc = locale.as_deref().unwrap_or("en");
    let force = force_rescan.unwrap_or(false);
    let scan_mode = parse_scan_mode(mode.as_deref());

    for skill_path in skill_paths {
        let path = std::path::PathBuf::from(&skill_path);

        if !path.exists() {
            log::warn!("Skill path does not exist: {}", skill_path);
            continue;
        }

        let skill_id_str = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unknown")
            .to_string();

        let (is_whitelisted, whitelisted_rules) = check_whitelist(&skill_id_str);
        if is_whitelisted {
            results.push(SecurityReport {
                scan_id: Uuid::new_v4().to_string(),
                scanned_at: Utc::now().to_rfc3339(),
                skill_id: skill_id_str,
                score: 100,
                level: SecurityLevel::Safe,
                blocked: false,
                issues: Vec::new(),
                hard_trigger_issues: Vec::new(),
                scanned_files: Vec::new(),
                scan_duration_ms: 0,
                recommendations: vec!["Skill is whitelisted.".to_string()],
            });
            continue;
        }

        match scanner.scan_incremental(&skill_path, &skill_id_str, loc, force, scan_mode, &whitelisted_rules) {
            Ok(report) => results.push(report),
            Err(e) => {
                log::error!("Failed to scan skill {}: {}", skill_path, e);
            }
        }
    }

    Ok(results)
}

// Whitelist Commands

#[tauri::command]
pub async fn add_whitelist_entry(
    entry_type: String,
    target: String,
    reason: Option<String>,
) -> Result<WhitelistEntry, String> {
    let service = WhitelistService::new().map_err(|e| e.to_string())?;
    
    let w_type = WhitelistType::from(entry_type);
    match w_type {
        WhitelistType::Skill => service.add_skill(target, reason),
        WhitelistType::Rule => service.add_rule(target, reason),
    }.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_whitelist_entry(
    entry_type: String,
    target: String,
) -> Result<bool, String> {
    let service = WhitelistService::new().map_err(|e| e.to_string())?;
    let w_type = WhitelistType::from(entry_type);
    service.remove_entry(w_type, &target).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_whitelist() -> Result<Vec<WhitelistEntry>, String> {
    let service = WhitelistService::new().map_err(|e| e.to_string())?;
    service.get_all_entries().map_err(|e| e.to_string())
}