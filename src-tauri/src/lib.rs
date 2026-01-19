// Initialize i18n with locales directory
rust_i18n::i18n!("locales", fallback = "en");

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
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

const SKILL_SCAN_DEPTH: usize = 6;

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
            for entry in WalkDir::new(&skills_dir).max_depth(SKILL_SCAN_DEPTH).into_iter().flatten() {
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
            for entry in WalkDir::new(&skills_dir).max_depth(SKILL_SCAN_DEPTH).into_iter().flatten() {
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

        let target_dir_name = if repo_url.contains("/tree/") {
            parts.last().unwrap_or(&"skill").to_string()
        } else {
            parts.get(4).unwrap_or(&"skill").to_string()
        };

        let target_dir = install_dir.join(&target_dir_name);

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

        let installed_dirs = match extract_skill_dirs(&target_dir, &install_dir) {
            Ok(dirs) => dirs,
            Err(e) => {
                return ImportResult {
                    success: false,
                    message: e,
                    blocked: false,
                }
            }
        };

        let mut installed = Vec::new();
        let mut blocked = Vec::new();
        let mut warnings = Vec::new();

        if !request.skip_security_check {
            use crate::security::{SecurityScanner, ScanMode};
            use crate::services::whitelist_service::WhitelistService;

            let whitelist_service = WhitelistService::new().ok();
            let whitelisted_rules = whitelist_service
                .as_ref()
                .and_then(|service| service.get_whitelisted_rules().ok())
                .unwrap_or_default();

            let scanner = SecurityScanner::new();
            // TODO: Retrieve configured ScanMode from DB/Config instead of hardcoding Standard
            let scan_mode = ScanMode::Standard;

            for dir in installed_dirs {
                let skill_name = dir
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("skill")
                    .to_string();
                let is_whitelisted = whitelist_service
                    .as_ref()
                    .and_then(|service| service.is_skill_whitelisted(&skill_name).ok())
                    .unwrap_or(false);

                if is_whitelisted {
                    eprintln!("Skill {} is whitelisted, skipping security scan.", skill_name);
                    installed.push((skill_name, dir));
                    continue;
                }

                match scanner.scan_directory(dir.to_str().unwrap(), &skill_name, "en", scan_mode, &whitelisted_rules) {
                    Ok(report) => {
                        if report.blocked {
                            if let Err(e) = fs::remove_dir_all(&dir) {
                                eprintln!("Failed to remove blocked skill directory {}: {}", dir.display(), e);
                            }
                            blocked.push(skill_name);
                            continue;
                        }

                        eprintln!("Security scan completed for {}: {} ({})", skill_name, report.score, report.level.as_str());
                        if !report.issues.is_empty() {
                            eprintln!("Security issues found: {}", report.issues.len());
                        }

                        if report.score < 70 {
                            warnings.push(format!("{} ({})", skill_name, report.score));
                        }
                    }
                    Err(e) => {
                        eprintln!("Security scan failed for {}: {}", skill_name, e);
                    }
                }
            }
        } else {
            for dir in installed_dirs {
                let skill_name = dir
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("skill")
                    .to_string();
                installed.push((skill_name, dir));
            }
        }

        if installed.is_empty() {
            let message = if blocked.is_empty() {
                "No SKILL.md found in the imported repository".to_string()
            } else {
                format!(
                    "Security check blocked installation. Blocked skills: {}",
                    blocked.join(", ")
                )
            };
            return ImportResult {
                success: false,
                message,
                blocked: !blocked.is_empty(),
            };
        }

        let mut message = if installed.len() == 1 {
            format!("Successfully installed {} to {}", installed[0].0, installed[0].1.display())
        } else {
            format!("Successfully installed {} skills to {}", installed.len(), install_dir.display())
        };

        if !blocked.is_empty() {
            message = format!("{}; blocked: {}", message, blocked.join(", "));
        }
        if !warnings.is_empty() {
            message = format!("{}; warnings: low security score for {}", message, warnings.join(", "));
        }

        ImportResult {
            success: true,
            message,
            blocked: !blocked.is_empty(),
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

    let installed_dirs = match extract_skill_dirs(&target_dir, &install_dir) {
        Ok(dirs) => dirs,
        Err(e) => {
            return Ok(ImportResult {
                success: false,
                message: e,
                blocked: false,
            })
        }
    };

    let mut installed = Vec::new();
    let mut blocked = Vec::new();
    let mut warnings = Vec::new();

    if !request.skip_security_check {
        use crate::security::{SecurityScanner, ScanMode};
        use crate::services::whitelist_service::WhitelistService;

        let whitelist_service = WhitelistService::new().ok();
        let whitelisted_rules = whitelist_service
            .as_ref()
            .and_then(|service| service.get_whitelisted_rules().ok())
            .unwrap_or_default();

        let scanner = SecurityScanner::new();
        // TODO: Retrieve configured ScanMode from DB/Config instead of hardcoding Standard
        let scan_mode = ScanMode::Standard;

        for dir in installed_dirs {
            let skill_name = dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("skill")
                .to_string();
            let is_whitelisted = whitelist_service
                .as_ref()
                .and_then(|service| service.is_skill_whitelisted(&skill_name).ok())
                .unwrap_or(false);

            if is_whitelisted {
                eprintln!("Skill {} is whitelisted, skipping security scan.", skill_name);
                installed.push((skill_name, dir));
                continue;
            }

            match scanner.scan_directory(dir.to_str().unwrap(), &skill_name, "en", scan_mode, &whitelisted_rules) {
                Ok(report) => {
                    if report.blocked {
                        if let Err(e) = fs::remove_dir_all(&dir) {
                            eprintln!("Failed to remove blocked skill directory {}: {}", dir.display(), e);
                        }
                        blocked.push(skill_name);
                        continue;
                    }

                    eprintln!("Security scan completed for {}: {} ({})", skill_name, report.score, report.level.as_str());
                    if !report.issues.is_empty() {
                        eprintln!("Security issues found: {}", report.issues.len());
                    }

                    if report.score < 70 {
                        warnings.push(format!("{} ({})", skill_name, report.score));
                    }
                }
                Err(e) => {
                    eprintln!("Security scan failed for {}: {}", skill_name, e);
                }
            }
        }
    } else {
        for dir in installed_dirs {
            let skill_name = dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("skill")
                .to_string();
            installed.push((skill_name, dir));
        }
    }

    if installed.is_empty() {
        let message = if blocked.is_empty() {
            "No SKILL.md found in the imported folder".to_string()
        } else {
            format!(
                "Security check blocked installation. Blocked skills: {}",
                blocked.join(", ")
            )
        };
        return Ok(ImportResult {
            success: false,
            message,
            blocked: !blocked.is_empty(),
        });
    }

    let mut message = if installed.len() == 1 {
        format!("Successfully imported {} to {}", installed[0].0, installed[0].1.display())
    } else {
        format!("Successfully imported {} skills to {}", installed.len(), install_dir.display())
    };

    if !blocked.is_empty() {
        message = format!("{}; blocked: {}", message, blocked.join(", "));
    }
    if !warnings.is_empty() {
        message = format!("{}; warnings: low security score for {}", message, warnings.join(", "));
    }

    Ok(ImportResult {
        success: true,
        message,
        blocked: !blocked.is_empty(),
    })
}

fn collect_skill_dirs(root: &PathBuf) -> Vec<PathBuf> {
    let root_skill = root.join("SKILL.md");
    if root_skill.exists() {
        return vec![root.clone()];
    }

    let mut skill_dirs = Vec::new();
    let mut seen = HashSet::new();

    let walker = WalkDir::new(root)
        .max_depth(6)
        .into_iter()
        .filter_entry(|entry| {
            let name = entry.file_name().to_string_lossy();
            name != ".git" && name != "node_modules" && name != "target"
        });

    for entry in walker.flatten() {
        let path = entry.path();
        if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
            if let Some(parent) = path.parent() {
                let key = parent.to_string_lossy().to_string();
                if seen.insert(key.clone()) {
                    skill_dirs.push(PathBuf::from(key));
                }
            }
        }
    }

    skill_dirs
}

fn extract_skill_dirs(target_dir: &PathBuf, install_dir: &PathBuf) -> Result<Vec<PathBuf>, String> {
    let skill_dirs = collect_skill_dirs(target_dir);

    if skill_dirs.is_empty() || (skill_dirs.len() == 1 && skill_dirs[0] == *target_dir) {
        return Ok(vec![target_dir.clone()]);
    }

    let mut installed = Vec::new();
    let mut deferred_moves: Vec<(PathBuf, PathBuf)> = Vec::new();

    for skill_dir in skill_dirs {
        let name = skill_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("skill")
            .to_string();
        let final_dest = install_dir.join(&name);
        let (move_dest, deferred) = if final_dest == *target_dir {
            let temp_dest = install_dir.join(format!(".temp_extract_{}", name));
            (temp_dest, Some(final_dest))
        } else {
            (final_dest.clone(), None)
        };

        let _ = fs::remove_dir_all(&move_dest);

        if let Err(e) = fs::rename(&skill_dir, &move_dest) {
            copy_dir_all(&skill_dir, &move_dest).map_err(|err| err.to_string())?;
            let _ = fs::remove_dir_all(&skill_dir);
            if !move_dest.exists() {
                return Err(format!("Failed to move skill {}: {}", name, e));
            }
        }

        if let Some(destination) = deferred {
            deferred_moves.push((move_dest, destination));
        } else {
            installed.push(move_dest);
        }
    }

    let _ = fs::remove_dir_all(&target_dir);

    for (temp_dest, final_dest) in deferred_moves {
        let _ = fs::remove_dir_all(&final_dest);
        if let Err(e) = fs::rename(&temp_dest, &final_dest) {
            copy_dir_all(&temp_dest, &final_dest).map_err(|err| err.to_string())?;
            let _ = fs::remove_dir_all(&temp_dest);
            if !final_dest.exists() {
                return Err(format!("Failed to finalize move: {}", e));
            }
        }
        installed.push(final_dest);
    }

    Ok(installed)
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
