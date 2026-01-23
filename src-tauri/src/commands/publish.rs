use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::security::{SecurityScanner, ScanMode};
use crate::models::security::{SecurityReport, SecurityLevel};

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
pub async fn publish_skill(_skill_path: String, metadata: serde_json::Value) -> Result<PublishResult, String> {
    // Simulation of publishing
    // In a real implementation, this would upload the skill to a registry

    // Simulate network delay
    std::thread::sleep(std::time::Duration::from_secs(2));

    let name = metadata.get("name").and_then(|v| v.as_str()).unwrap_or("unknown-skill");
    let version = metadata.get("version").and_then(|v| v.as_str()).unwrap_or("0.0.1");

    println!("Publishing skill: {} v{}", name, version);

    Ok(PublishResult {
        success: true,
        message: format!("Successfully published {} v{}", name, version),
        skill_id: Some(format!("{}-{}", name, version)),
    })
}
