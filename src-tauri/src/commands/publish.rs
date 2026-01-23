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

    // Simulation of publishing
    // In a real implementation, this would upload the skill to a registry
    // TODO: Integrate with real registry API

    // Simulate network delay
    std::thread::sleep(std::time::Duration::from_secs(2));

    let name = metadata.name;
    let version = metadata.version;

    println!("Publishing skill: {} v{}", name, version);

    Ok(PublishResult {
        success: true,
        message: format!("Successfully published {} v{}", name, version),
        skill_id: Some(format!("{}-{}", name, version)),
    })
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
        assert_eq!(publish_result.skill_id.unwrap(), "test-skill-1.0.0");
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
        assert_eq!(
            result.err().unwrap(),
            "Invalid version format. Expected SemVer (e.g., 1.0.0)"
        );
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
