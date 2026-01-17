// Initialize i18n with locales directory
rust_i18n::i18n!("locales", fallback = "en");

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use walkdir::WalkDir;
use tauri::{State, Manager};
use crate::services::config_service::ConfigService;

// Import modules
mod analyzer;
mod commands;
mod i18n;
mod models;
mod security;
mod services;

#[derive(Debug, Serialize, Deserialize)]
pub struct SkillInfo {
    pub name: String,
    pub description: String,
    pub path: String,
    #[serde(rename = "skillType")]
    pub skill_type: String,
    #[serde(rename = "isMcp")]
    pub is_mcp: bool,
    pub tags: Vec<String>,
    #[serde(rename = "configSchema")]
    pub config_schema: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct ScanResult {
    #[serde(rename = "systemSkills")]
    pub system_skills: Vec<SkillInfo>,
    #[serde(rename = "projectSkills")]
    pub project_skills: Vec<SkillInfo>,
}

#[derive(Debug, Deserialize)]
pub struct ImportGithubRequest {
    #[serde(rename = "repoUrl")]
    pub repo_url: String,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
    #[serde(rename = "skipSecurityCheck")]
    pub skip_security_check: bool,
}

#[derive(Debug, Serialize)]
pub struct ImportResult {
    pub success: bool,
    pub message: String,
    pub blocked: bool,
}

#[derive(Debug, Deserialize)]
pub struct UninstallRequest {
    #[serde(rename = "skillPath")]
    pub skill_path: String,
}

#[derive(Debug, Deserialize)]
pub struct ImportLocalRequest {
    #[serde(rename = "sourcePath")]
    pub source_path: String,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
    #[serde(rename = "skillName")]
    pub skill_name: String,
    #[serde(rename = "skipSecurityCheck")]
    pub skip_security_check: bool,
}

fn get_claude_skills_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude").join("skills"))
}

fn parse_skill_md(path: &PathBuf, skill_type: &str) -> Option<SkillInfo> {
    // Use the analyzer's parser for robust frontmatter extraction
    use crate::analyzer::skill_document::SkillDocument;

    let doc = SkillDocument::from_file(path).ok()?;

    let name = if !doc.metadata.name.is_empty() {
        doc.metadata.name
    } else {
        path.parent()?.file_name()?.to_string_lossy().to_string()
    };

    let description = doc.metadata.description.unwrap_or_else(|| {
        // Fallback to first 200 chars of content if no description in frontmatter
        doc.content
            .lines()
            .take(5) // Take first few lines
            .collect::<Vec<_>>()
            .join(" ")
            .chars()
            .take(200)
            .collect::<String>()
    });

    let tags = doc.metadata.tags.unwrap_or_default();
    let config_schema = doc.metadata.config_schema;

    // Check if it's an MCP skill based on tags
    let is_mcp = tags.iter().any(|t| t.to_lowercase() == "mcp" || t.to_lowercase() == "mcp-server");

    Some(SkillInfo {
        name,
        description,
        path: path.parent()?.to_string_lossy().to_string(),
        skill_type: skill_type.to_string(),
        is_mcp,
        tags,
        config_schema,
    })
}

#[tauri::command]
fn scan_skills(state: State<'_, ConfigService>) -> Result<ScanResult, String> {
    let mut system_skills = Vec::new();
    let mut project_skills = Vec::new();

    if let Some(skills_dir) = get_claude_skills_dir() {
        if skills_dir.exists() {
            for entry in WalkDir::new(&skills_dir).max_depth(3).into_iter().flatten() {
                let path = entry.path();
                if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
                    if let Some(skill) = parse_skill_md(&path.to_path_buf(), "system") {
                        system_skills.push(skill);
                    }
                }
            }
        }
    }

    let paths = state.get_project_paths();
    for project_path in paths {
        let skills_dir = PathBuf::from(&project_path).join(".claude").join("skills");
        if skills_dir.exists() {
            for entry in WalkDir::new(&skills_dir).max_depth(3).into_iter().flatten() {
                let path = entry.path();
                if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
                    if let Some(skill) = parse_skill_md(&path.to_path_buf(), "project") {
                        project_skills.push(skill);
                    }
                }
            }
        }
    }

    Ok(ScanResult {
        system_skills,
        project_skills,
    })
}

#[tauri::command(async)]
async fn import_github_skill(request: ImportGithubRequest) -> Result<ImportResult, String> {
    let repo_url = request.repo_url.clone();

    let result = tokio::task::spawn_blocking(move || {
        let parts: Vec<&str> = repo_url
            .trim_end_matches('/')
            .split('/')
            .collect();

        if parts.len() < 5 {
            return ImportResult {
                success: false,
                message: "Invalid GitHub URL".to_string(),
                blocked: false,
            };
        }

        let install_dir = if let Some(path) = &request.install_path {
            PathBuf::from(path).join(".claude").join("skills")
        } else {
            match get_claude_skills_dir() {
                Some(dir) => dir,
                None => return ImportResult {
                    success: false,
                    message: "Cannot determine skills directory".to_string(),
                    blocked: false,
                },
            }
        };

        if let Err(e) = fs::create_dir_all(&install_dir) {
            return ImportResult {
                success: false,
                message: format!("Failed to create directory: {}", e),
                blocked: false,
            };
        }

        let skill_name = if repo_url.contains("/tree/") {
            parts.last().unwrap_or(&"skill").to_string()
        } else {
            parts.get(4).unwrap_or(&"skill").to_string()
        };

        let target_dir = install_dir.join(&skill_name);

        if repo_url.contains("/tree/") {
            let repo_base = format!("https://github.com/{}/{}", parts[3], parts[4]);
            let branch = parts.get(6).unwrap_or(&"main");
            let subpath = parts[7..].join("/");

            let temp_dir = install_dir.join(".temp_clone");
            let _ = fs::remove_dir_all(&temp_dir);

            let output = Command::new("git")
                .args(["clone", "--depth", "1", "--filter=blob:none", "--sparse", &repo_base, temp_dir.to_str().unwrap()])
                .output();

            match output {
                Err(e) => return ImportResult {
                    success: false,
                    message: format!("Git command failed: {}", e),
                    blocked: false,
                },
                Ok(o) if !o.status.success() => return ImportResult {
                    success: false,
                    message: format!("Git clone failed: {}", String::from_utf8_lossy(&o.stderr)),
                    blocked: false,
                },
                _ => {}
            }

            let _ = Command::new("git")
                .current_dir(&temp_dir)
                .args(["sparse-checkout", "set", &subpath])
                .output();

            let _ = Command::new("git")
                .current_dir(&temp_dir)
                .args(["checkout", branch])
                .output();

            let source = temp_dir.join(&subpath);
            if source.exists() {
                let _ = fs::remove_dir_all(&target_dir);
                if let Err(e) = fs::rename(&source, &target_dir) {
                    let _ = fs::remove_dir_all(&temp_dir);
                    return ImportResult {
                        success: false,
                        message: format!("Failed to move skill: {}", e),
                        blocked: false,
                    };
                }
            }

            let _ = fs::remove_dir_all(&temp_dir);
        } else {
            let _ = fs::remove_dir_all(&target_dir);

            let output = Command::new("git")
                .args(["clone", "--depth", "1", &repo_url, target_dir.to_str().unwrap()])
                .output();

            match output {
                Err(e) => return ImportResult {
                    success: false,
                    message: format!("Git command failed: {}", e),
                    blocked: false,
                },
                Ok(o) if !o.status.success() => return ImportResult {
                    success: false,
                    message: format!("Git clone failed: {}", String::from_utf8_lossy(&o.stderr)),
                    blocked: false,
                },
                _ => {}
            }
        }

        // Security scan after successful clone
        if !request.skip_security_check {
            use crate::security::{SecurityScanner, ScanMode};
            use crate::services::whitelist_service::WhitelistService;

            // Check whitelist
            let (is_whitelisted, whitelisted_rules) = if let Ok(service) = WhitelistService::new() {
                (
                    service.is_skill_whitelisted(&skill_name).unwrap_or(false), 
                    service.get_whitelisted_rules().unwrap_or_default()
                )
            } else {
                (false, Vec::new())
            };

            if is_whitelisted {
                eprintln!("Skill {} is whitelisted, skipping security scan.", skill_name);
            } else {
                let scanner = SecurityScanner::new();
                // TODO: Retrieve configured ScanMode from DB/Config instead of hardcoding Standard
                let scan_mode = ScanMode::Standard;

                match scanner.scan_directory(target_dir.to_str().unwrap(), &skill_name, "en", scan_mode, &whitelisted_rules) {
                Ok(report) => {
                    if report.blocked {
                        // Remove the skill if blocked by hard triggers
                        if let Err(e) = fs::remove_dir_all(&target_dir) {
                            eprintln!("Failed to remove blocked skill directory {}: {}", target_dir.display(), e);
                        }
                        return ImportResult {
                            success: false,
                            message: format!(
                                "Security check blocked installation. Found {} critical issues:\n{}",
                                report.hard_trigger_issues.len(),
                                report.hard_trigger_issues.join("\n")
                            ),
                            blocked: true,
                        };
                    }

                    // Log security score and issues
                    eprintln!("Security scan completed for {}: {} ({})", skill_name, report.score, report.level.as_str());
                    if !report.issues.is_empty() {
                        eprintln!("Security issues found: {}", report.issues.len());
                    }

                    if report.score < 70 {
                        return ImportResult {
                            success: true,
                            message: format!(
                                "Successfully installed {} to {}, but warning: low security score ({}). Please review the code.",
                                skill_name,
                                target_dir.display(),
                                report.score
                            ),
                            blocked: false,
                        };
                    }
                }
                Err(e) => {
                    eprintln!("Security scan failed for {}: {}", skill_name, e);
                    // Continue installation even if scan fails (log warning only)
                }
            }
        }
        }

        ImportResult {
            success: true,
            message: format!("Successfully installed {} to {}", skill_name, target_dir.display()),
            blocked: false,
        }
    }).await.map_err(|e| e.to_string())?;

    Ok(result)
}

#[tauri::command]
fn uninstall_skill(request: UninstallRequest) -> Result<ImportResult, String> {
    let skill_path = &request.skill_path;

    // 验证路径不为空
    if skill_path.is_empty() {
        return Ok(ImportResult {
            success: false,
            message: "Skill path is empty".to_string(),
            blocked: false,
        });
    }

    let path = PathBuf::from(skill_path);

    if !path.exists() {
        return Ok(ImportResult {
            success: false,
            message: format!("Skill path does not exist: {}", skill_path),
            blocked: false,
        });
    }

    // 安全检查：确保路径在 .claude/skills 目录下
    let path_str = path.to_string_lossy().to_string();
    if !path_str.contains(".claude") || !path_str.contains("skills") {
        return Ok(ImportResult {
            success: false,
            message: "Invalid skill path - must be in .claude/skills directory".to_string(),
            blocked: false,
        });
    }

    match fs::remove_dir_all(&path) {
        Ok(_) => Ok(ImportResult {
            success: true,
            message: "Skill uninstalled successfully".to_string(),
            blocked: false,
        }),
        Err(e) => Ok(ImportResult {
            success: false,
            message: format!("Failed to remove skill: {}", e),
            blocked: false,
        }),
    }
}

#[tauri::command]
fn import_local_skill(request: ImportLocalRequest) -> Result<ImportResult, String> {
    let source = PathBuf::from(&request.source_path);

    if !source.exists() {
        return Ok(ImportResult {
            success: false,
            message: "Source path does not exist".to_string(),
            blocked: false,
        });
    }

    let install_dir = if let Some(path) = &request.install_path {
        PathBuf::from(path).join(".claude").join("skills")
    } else {
        get_claude_skills_dir().ok_or("Cannot determine skills directory")? 
    };

    fs::create_dir_all(&install_dir).map_err(|e| e.to_string())?;

    let target_dir = install_dir.join(&request.skill_name);

    copy_dir_all(&source, &target_dir).map_err(|e| e.to_string())?;

    // Security scan after successful copy
    if !request.skip_security_check {
        use crate::security::{SecurityScanner, ScanMode};
        use crate::services::whitelist_service::WhitelistService;

        // Check whitelist
        let (is_whitelisted, whitelisted_rules) = if let Ok(service) = WhitelistService::new() {
            (
                service.is_skill_whitelisted(&request.skill_name).unwrap_or(false), 
                service.get_whitelisted_rules().unwrap_or_default()
            )
        } else {
            (false, Vec::new())
        };

        if is_whitelisted {
            eprintln!("Skill {} is whitelisted, skipping security scan.", request.skill_name);
        } else {
            let scanner = SecurityScanner::new();
            // TODO: Retrieve configured ScanMode from DB/Config instead of hardcoding Standard
            let scan_mode = ScanMode::Standard;

            match scanner.scan_directory(target_dir.to_str().unwrap(), &request.skill_name, "en", scan_mode, &whitelisted_rules) {
            Ok(report) => {
                if report.blocked {
                    // Remove the skill if blocked by hard triggers
                    if let Err(e) = fs::remove_dir_all(&target_dir) {
                        eprintln!("Failed to remove blocked skill directory {}: {}", target_dir.display(), e);
                    }
                    return Ok(ImportResult {
                        success: false,
                        message: format!(
                            "Security check blocked installation. Found {} critical issues:\n{}",
                            report.hard_trigger_issues.len(),
                            report.hard_trigger_issues.join("\n")
                        ),
                        blocked: true,
                    });
                }

                // Log security score and issues
                eprintln!("Security scan completed for {}: {} ({})", request.skill_name, report.score, report.level.as_str());
                if !report.issues.is_empty() {
                    eprintln!("Security issues found: {}", report.issues.len());
                }

                if report.score < 70 {
                    return Ok(ImportResult {
                        success: true,
                        message: format!(
                            "Successfully imported {} to {}, but warning: low security score ({}). Please review the code.",
                            request.skill_name,
                            target_dir.display(),
                            report.score
                        ),
                        blocked: false,
                    });
                }
            }
            Err(e) => {
                eprintln!("Security scan failed for {}: {}", request.skill_name, e);
                // Continue installation even if scan fails (log warning only)
            }
        }
    }
    }

    Ok(ImportResult {
        success: true,
        message: format!("Successfully imported {} to {}", request.skill_name, target_dir.display()),
        blocked: false,
    })
}

fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_all(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(entry.path(), dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/c", "start", "", &url])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn read_skill(skill_path: String) -> Result<String, String> {
    let path = PathBuf::from(&skill_path);
    let skill_md = path.join("SKILL.md");

    if skill_md.exists() {
        fs::read_to_string(&skill_md).map_err(|e| e.to_string())
    } else {
        Err("SKILL.md not found".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logging
    env_logger::init();
    log::info!("Skills Manager starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            log::debug!("Initializing database...");
            if let Err(e) = crate::services::db::init_db() {
                log::error!("Failed to initialize database: {}", e);
            }
            
            // Initialize and manage ConfigService
            match ConfigService::new() {
                Ok(config_service) => {
                    app.manage(config_service);
                }
                Err(e) => {
                    log::error!("Failed to initialize ConfigService: {}", e);
                    // Decide if we should panic or continue. Continuing might mean config features are broken.
                    // For now, log error.
                }
            }
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_skills,
            import_github_skill,
            uninstall_skill,
            import_local_skill,
            open_url,
            read_skill,
            commands::analyzer::analyze_skill_quality,
            commands::analyzer::batch_analyze_skills,
            commands::analyzer::batch_analyze_skills_detailed,
            commands::security::scan_skill_security,
            commands::security::batch_scan_skills,
            commands::security::scan_skill_security_incremental,
            commands::security::batch_scan_skills_incremental,
            commands::security::get_security_config,
            commands::security::update_security_config,
            commands::security::get_scan_history,
            commands::security::add_whitelist_entry,
            commands::security::remove_whitelist_entry,
            commands::security::get_whitelist,
            commands::cache::get_cache_stats,
            commands::cache::clear_cache,
            commands::config::get_skill_config,
            commands::config::set_skill_config,
            commands::config::get_project_paths,
            commands::config::save_project_paths
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}