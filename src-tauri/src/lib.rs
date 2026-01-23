// Initialize i18n with locales directory
rust_i18n::i18n!("locales", fallback = "en");

use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashSet;
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use std::io::{Read, Write};
use walkdir::WalkDir;
use sha2::{Digest, Sha256};
use zip::{ZipArchive, ZipWriter};
use zip::write::FileOptions;
use zip::CompressionMethod;
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
const MAX_PACKAGE_UNCOMPRESSED_SIZE: u64 = 100 * 1024 * 1024;

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
    #[serde(rename = "derivedFrom")]
    pub derived_from: Option<String>,
    #[serde(rename = "forkType")]
    pub fork_type: Option<String>,
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

#[derive(Debug, Deserialize)]
pub struct ExportSkillPackageRequest {
    #[serde(rename = "skillPath")]
    pub skill_path: String,
    #[serde(rename = "outputDir")]
    pub output_dir: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ExportResult {
    pub success: bool,
    pub message: String,
    #[serde(rename = "filePath")]
    pub file_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImportPackageRequest {
    #[serde(rename = "packagePath")]
    pub package_path: String,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
    #[serde(rename = "skipSecurityCheck")]
    pub skip_security_check: bool,
}

#[derive(Debug, Deserialize)]
pub struct ForkSkillRequest {
    #[serde(rename = "originalSkillPath")]
    pub original_skill_path: String,
    #[serde(rename = "newSkillName")]
    pub new_skill_name: String,
    #[serde(rename = "forkType")]
    pub fork_type: String,
    #[serde(rename = "derivedFromUrl")]
    pub derived_from_url: Option<String>,
    #[serde(rename = "installPath")]
    pub install_path: Option<String>,
}

#[derive(Debug)]
struct GithubImportInfo {
    request_url: String,
    base_repo_url: String,
    base_subpath: String,
    branch_from_url: Option<String>,
    is_tree: bool,
}

#[derive(Debug)]
struct OriginRecord {
    skill_path: String,
    origin: Value,
}

#[derive(Debug)]
struct ImportOutcome {
    result: ImportResult,
    origins: Vec<OriginRecord>,
}

#[derive(Debug)]
struct LocalImportOutcome {
    result: ImportResult,
    installed_dirs: Vec<PathBuf>,
}

fn get_claude_skills_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude").join("skills"))
}

fn now_millis() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

fn normalize_repo_url(url: &str) -> String {
    url.trim_end_matches('/')
        .trim_end_matches(".git")
        .to_string()
}

fn parse_github_import_url(repo_url: &str) -> GithubImportInfo {
    let request_url = repo_url.trim_end_matches('/').to_string();

    if request_url.contains("/tree/") {
        let parts: Vec<&str> = request_url.split('/').collect();
        if parts.len() >= 7 {
            let base_repo_url = format!("https://github.com/{}/{}", parts[3], parts[4]);
            let branch = parts.get(6).map(|s| s.to_string());
            let base_subpath = if parts.len() > 7 {
                parts[7..].join("/")
            } else {
                String::new()
            };

            return GithubImportInfo {
                request_url,
                base_repo_url,
                base_subpath: base_subpath.trim_matches('/').to_string(),
                branch_from_url: branch,
                is_tree: true,
            };
        }
    }

    GithubImportInfo {
        request_url: request_url.clone(),
        base_repo_url: normalize_repo_url(&request_url),
        base_subpath: String::new(),
        branch_from_url: None,
        is_tree: false,
    }
}

fn detect_git_branch(repo_dir: &PathBuf) -> Option<String> {
    let head_path = repo_dir.join(".git").join("HEAD");
    let head_content = fs::read_to_string(head_path).ok()?;
    let head = head_content.trim();
    if let Some(reference) = head.strip_prefix("ref: refs/heads/") {
        if !reference.trim().is_empty() {
            return Some(reference.trim().to_string());
        }
    }
    None
}

fn build_skill_subpath_map(
    target_dir: &PathBuf,
    base_subpath: &str
) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    let normalized_base = base_subpath.trim_matches('/').to_string();

    for skill_dir in collect_skill_dirs(target_dir) {
        let skill_name = skill_dir
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("skill")
            .to_string();
        let rel_path = skill_dir
            .strip_prefix(target_dir)
            .ok()
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();
        let subpath = if normalized_base.is_empty() {
            rel_path
        } else if rel_path.is_empty() {
            normalized_base.clone()
        } else {
            format!("{}/{}", normalized_base, rel_path)
        };
        map.insert(skill_name, subpath);
    }

    map
}

fn build_github_install_url(repo_url: &str, branch: Option<&str>, subpath: &str) -> String {
    let mut base = repo_url.trim_end_matches('/').to_string();
    if let Some(branch) = branch {
        if !branch.is_empty() {
            base.push_str("/tree/");
            base.push_str(branch);
            let normalized = subpath.trim_matches('/');
            if !normalized.is_empty() {
                base.push('/');
                base.push_str(normalized);
            }
            return base;
        }
    }
    base
}

fn calculate_skill_checksum_for_path(skill_dir: &PathBuf) -> Result<String, String> {
    if !skill_dir.exists() {
        return Err("Skill directory not found".to_string());
    }

    let mut hasher = Sha256::new();

    for entry in WalkDir::new(skill_dir)
        .follow_links(false)
        .max_depth(10)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }

        if let Ok(meta) = entry.metadata() {
            let path_str = entry.path().to_string_lossy();
            let modified = meta
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs())
                .unwrap_or(0);

            hasher.update(path_str.as_bytes());
            hasher.update(meta.len().to_be_bytes());
            hasher.update(modified.to_be_bytes());
        }

        if entry.file_name().to_string_lossy().eq_ignore_ascii_case("SKILL.md") {
            if let Ok(content) = fs::read(entry.path()) {
                hasher.update(content);
            }
        }
    }

    Ok(format!("{:x}", hasher.finalize()))
}

#[tauri::command]
fn calculate_skill_checksum(skill_path: String) -> Result<String, String> {
    calculate_skill_checksum_for_path(&PathBuf::from(skill_path))
}

fn upsert_origin_config(
    config_service: &ConfigService,
    skill_path: &str,
    origin: Value,
) -> Result<(), String> {
    let existing = config_service
        .get_skill_config(skill_path)
        .unwrap_or(json!({}));
    let mut object = existing.as_object().cloned().unwrap_or_default();
    object.insert("__origin".to_string(), origin);
    config_service.set_skill_config(skill_path, Value::Object(object))
}

fn sanitize_filename(name: &str) -> String {
    let mut sanitized = String::new();
    for ch in name.chars() {
        if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' || ch == '.' {
            sanitized.push(ch);
        } else {
            sanitized.push('_');
        }
    }
    let trimmed = sanitized.trim_matches('_').to_string();
    if trimmed.is_empty() {
        "skill".to_string()
    } else {
        trimmed
    }
}

fn ensure_export_dir(output_dir: Option<String>) -> Result<PathBuf, String> {
    let dir = if let Some(path) = output_dir {
        PathBuf::from(path)
    } else {
        dirs::home_dir()
            .map(|h| h.join(".claude").join("skill-exports"))
            .ok_or("Cannot determine export directory")?
    };
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir)
}

fn is_skill_package_path(package_path: &PathBuf) -> bool {
    package_path
        .to_string_lossy()
        .to_ascii_lowercase()
        .ends_with(".skillpack.zip")
}

fn should_skip_package_entry(path: &Path) -> bool {
    path.components().any(|component| {
        if let Component::Normal(name) = component {
            let value = name.to_string_lossy();
            value == ".git" || value == "node_modules" || value == "target"
        } else {
            false
        }
    })
}

fn write_skill_package(
    skill_dir: &PathBuf,
    output_path: &PathBuf,
    metadata: &Value,
) -> Result<(), String> {
    let skill_dir_name = skill_dir
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid skill directory name")?;

    let file = fs::File::create(output_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::<()>::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);

    let metadata_json = serde_json::to_string_pretty(metadata).map_err(|e| e.to_string())?;
    zip.start_file("skill-package.json", options)
        .map_err(|e| e.to_string())?;
    zip.write_all(metadata_json.as_bytes())
        .map_err(|e| e.to_string())?;

    for entry in WalkDir::new(skill_dir)
        .follow_links(false)
        .max_depth(10)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if !entry.file_type().is_file() {
            continue;
        }
        if should_skip_package_entry(entry.path()) {
            continue;
        }

        let rel_path = entry
            .path()
            .strip_prefix(skill_dir)
            .map_err(|_| "Failed to resolve relative path")?;
        let rel_str = rel_path.to_string_lossy().replace('\\', "/");
        let zip_path = if rel_str.is_empty() {
            skill_dir_name.to_string()
        } else {
            format!("{}/{}", skill_dir_name, rel_str)
        };

        zip.start_file(zip_path, options)
            .map_err(|e| e.to_string())?;
        let mut file = fs::File::open(entry.path()).map_err(|e| e.to_string())?;
        std::io::copy(&mut file, &mut zip).map_err(|e| e.to_string())?;
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

fn read_package_metadata(package_path: &PathBuf) -> Result<Option<Value>, String> {
    let file = fs::File::open(package_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    if let Ok(mut entry) = archive.by_name("skill-package.json") {
        let mut contents = String::new();
        entry.read_to_string(&mut contents).map_err(|e| e.to_string())?;
        let metadata: Value = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
        return Ok(Some(metadata));
    }
    Ok(None)
}

fn extract_skill_package(package_path: &PathBuf, dest_dir: &PathBuf) -> Result<(), String> {
    extract_skill_package_with_limit(package_path, dest_dir, MAX_PACKAGE_UNCOMPRESSED_SIZE)
}

fn extract_skill_package_with_limit(
    package_path: &PathBuf,
    dest_dir: &PathBuf,
    max_uncompressed_size: u64
) -> Result<(), String> {
    let file = fs::File::open(package_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut total_size: u64 = 0;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let entry_size = file.size();
        if entry_size > max_uncompressed_size {
            return Err("Package entry too large".to_string());
        }
        total_size = total_size.saturating_add(entry_size);
        if total_size > max_uncompressed_size {
            return Err("Package too large".to_string());
        }
        let Some(enclosed) = file.enclosed_name() else {
            return Err("Package contains invalid paths".to_string());
        };
        if enclosed.is_absolute()
            || enclosed.has_root()
            || enclosed.components().any(|component| matches!(component, Component::Prefix(_)))
        {
            return Err("Package contains absolute paths".to_string());
        }
        let name = enclosed.to_string_lossy();
        if name == "skill-package.json" {
            continue;
        }
        if should_skip_package_entry(&enclosed) {
            continue;
        }

        let out_path = dest_dir.join(enclosed);
        if file.name().ends_with('/') {
            fs::create_dir_all(&out_path).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out_path.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut outfile = fs::File::create(&out_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

fn resolve_package_source_dir(
    temp_dir: &PathBuf,
    skill_dir_name: &Option<String>
) -> Result<PathBuf, String> {
    let source_dir_from_metadata = skill_dir_name
        .as_ref()
        .map(|name| temp_dir.join(name))
        .filter(|dir| dir.exists());
    let candidates = collect_skill_dirs(temp_dir);

    if let Some(dir) = source_dir_from_metadata {
        Ok(dir)
    } else if candidates.len() == 1 {
        Ok(candidates[0].clone())
    } else if candidates.is_empty() {
        Err("Package does not contain SKILL.md".to_string())
    } else {
        Err("Package contains multiple skills; select a single skill package".to_string())
    }
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
    let derived_from = doc.metadata.derived_from;
    let fork_type = doc.metadata.fork_type;

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
        derived_from,
        fork_type,
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
async fn import_github_skill(
    state: State<'_, ConfigService>,
    request: ImportGithubRequest
) -> Result<ImportResult, String> {
    let repo_url = request.repo_url.clone();
    let github_info = parse_github_import_url(&repo_url);

    let outcome = tokio::task::spawn_blocking(move || {
        let parts: Vec<&str> = repo_url
            .trim_end_matches('/')
            .split('/')
            .collect();

        if parts.len() < 5 {
            return ImportOutcome {
                result: ImportResult {
                    success: false,
                    message: "Invalid GitHub URL".to_string(),
                    blocked: false,
                },
                origins: Vec::new(),
            };
        }

        let install_dir = if let Some(path) = &request.install_path {
            PathBuf::from(path).join(".claude").join("skills")
        } else {
            match get_claude_skills_dir() {
                Some(dir) => dir,
                None => return ImportOutcome {
                    result: ImportResult {
                        success: false,
                        message: "Cannot determine skills directory".to_string(),
                        blocked: false,
                    },
                    origins: Vec::new(),
                },
            }
        };

        if let Err(e) = fs::create_dir_all(&install_dir) {
            return ImportOutcome {
                result: ImportResult {
                    success: false,
                    message: format!("Failed to create directory: {}", e),
                    blocked: false,
                },
                origins: Vec::new(),
            };
        }

        let target_dir_name = if repo_url.contains("/tree/") {
            parts.last().unwrap_or(&"skill").to_string()
        } else {
            parts.get(4).unwrap_or(&"skill").to_string()
        };

        let target_dir = install_dir.join(&target_dir_name);
        let mut detected_branch: Option<String> = None;

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
                Err(e) => return ImportOutcome {
                    result: ImportResult {
                        success: false,
                        message: format!("Git command failed: {}", e),
                        blocked: false,
                    },
                    origins: Vec::new(),
                },
                Ok(o) if !o.status.success() => return ImportOutcome {
                    result: ImportResult {
                        success: false,
                        message: format!("Git clone failed: {}", String::from_utf8_lossy(&o.stderr)),
                        blocked: false,
                    },
                    origins: Vec::new(),
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

            detected_branch = Some(branch.to_string());

            let source = temp_dir.join(&subpath);
            if source.exists() {
                let _ = fs::remove_dir_all(&target_dir);
                if let Err(e) = fs::rename(&source, &target_dir) {
                    let _ = fs::remove_dir_all(&temp_dir);
                    return ImportOutcome {
                        result: ImportResult {
                            success: false,
                            message: format!("Failed to move skill: {}", e),
                            blocked: false,
                        },
                        origins: Vec::new(),
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
                Err(e) => return ImportOutcome {
                    result: ImportResult {
                        success: false,
                        message: format!("Git command failed: {}", e),
                        blocked: false,
                    },
                    origins: Vec::new(),
                },
                Ok(o) if !o.status.success() => return ImportOutcome {
                    result: ImportResult {
                        success: false,
                        message: format!("Git clone failed: {}", String::from_utf8_lossy(&o.stderr)),
                        blocked: false,
                    },
                    origins: Vec::new(),
                },
                _ => {}
            }

            detected_branch = detect_git_branch(&target_dir);
        }

        let skill_subpaths = build_skill_subpath_map(&target_dir, &github_info.base_subpath);

        let installed_dirs = match extract_skill_dirs(&target_dir, &install_dir) {
            Ok(dirs) => dirs,
            Err(e) => {
                return ImportOutcome {
                    result: ImportResult {
                        success: false,
                        message: e,
                        blocked: false,
                    },
                    origins: Vec::new(),
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

            for dir in installed_dirs.iter() {
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
                    installed.push((skill_name, dir.clone()));
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
            for dir in installed_dirs.iter() {
                let skill_name = dir
                    .file_name()
                    .and_then(|n| n.to_str())
                    .unwrap_or("skill")
                    .to_string();
                installed.push((skill_name, dir.clone()));
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
            return ImportOutcome {
                result: ImportResult {
                    success: false,
                    message,
                    blocked: !blocked.is_empty(),
                },
                origins: Vec::new(),
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

        let branch = if github_info.is_tree {
            github_info.branch_from_url.clone().or(detected_branch)
        } else {
            detected_branch
        };
        let installed_at = now_millis();
        let base_repo_url = github_info.base_repo_url.clone();
        let request_url = github_info.request_url.clone();
        let base_subpath = github_info.base_subpath.clone();

        let mut origins = Vec::new();
        for dir in installed_dirs {
            let skill_name = dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("skill")
                .to_string();
            let subpath = skill_subpaths
                .get(&skill_name)
                .cloned()
                .unwrap_or_else(|| base_subpath.clone());
            let install_url = build_github_install_url(
                &base_repo_url,
                branch.as_deref(),
                &subpath
            );
            let origin_url = install_url.clone();
            let checksum = calculate_skill_checksum_for_path(&dir).ok();
            let origin = json!({
                "sourceType": "github",
                "repoUrl": base_repo_url.as_str(),
                "installUrl": install_url,
                "originUrl": origin_url,
                "subpath": subpath,
                "branch": branch.clone(),
                "requestUrl": request_url.as_str(),
                "installedAt": installed_at,
                "checksum": checksum
            });
            origins.push(OriginRecord {
                skill_path: dir.to_string_lossy().to_string(),
                origin,
            });
        }

        ImportOutcome {
            result: ImportResult {
                success: true,
                message,
                blocked: !blocked.is_empty(),
            },
            origins,
        }
    }).await.map_err(|e| e.to_string())?;

    for record in outcome.origins {
        if let Err(e) = upsert_origin_config(state.inner(), &record.skill_path, record.origin) {
            eprintln!("Failed to persist origin info for {}: {}", record.skill_path, e);
        }
    }

    Ok(outcome.result)
}

fn update_frontmatter(
    content: &str,
    new_name: &str,
    derived_from: Option<&str>,
    fork_type: &str,
) -> Result<String, String> {
    let lines: Vec<&str> = content.lines().collect();
    if lines.is_empty() || !lines[0].trim().starts_with("---") {
        return Err("No frontmatter found".to_string());
    }

    let mut end_idx = 0;
    for (i, line) in lines.iter().enumerate().skip(1) {
        if line.trim().starts_with("---") || line.trim().starts_with("...") {
            end_idx = i;
            break;
        }
    }

    if end_idx == 0 {
        return Err("Frontmatter not closed".to_string());
    }

    let frontmatter_str = lines[1..end_idx].join("\n");
    let mut yaml_val: serde_yaml::Value = serde_yaml::from_str(&frontmatter_str)
        .map_err(|e| format!("YAML parse error: {}", e))?;

    if let Some(mapping) = yaml_val.as_mapping_mut() {
        mapping.insert(
            serde_yaml::Value::String("name".to_string()),
            serde_yaml::Value::String(new_name.to_string()),
        );
        if let Some(url) = derived_from {
            mapping.insert(
                serde_yaml::Value::String("derivedFrom".to_string()),
                serde_yaml::Value::String(url.to_string()),
            );
        }
        mapping.insert(
            serde_yaml::Value::String("forkType".to_string()),
            serde_yaml::Value::String(fork_type.to_string()),
        );
    }

    let new_frontmatter = serde_yaml::to_string(&yaml_val)
        .map_err(|e| format!("YAML serialization error: {}", e))?;

    // Remove the initial "---" that serde_yaml might add if we are not careful,
    // but usually it adds document separator if not present.
    // serde_yaml::to_string includes "---" at the start usually.
    // Let's strip it to be safe and manually add it back to ensure format.
    let clean_yaml = new_frontmatter.trim_start_matches("---\n");

    let markdown_content = lines[end_idx + 1..].join("\n");

    Ok(format!("---\n{}---\n{}", clean_yaml, markdown_content))
}

#[tauri::command]
fn fork_skill(request: ForkSkillRequest) -> Result<ImportResult, String> {
    let source_path = PathBuf::from(&request.original_skill_path);
    if !source_path.exists() {
        return Ok(ImportResult {
            success: false,
            message: "Original skill path does not exist".to_string(),
            blocked: false,
        });
    }

    let install_dir = if let Some(path) = request.install_path {
        PathBuf::from(path).join(".claude").join("skills")
    } else {
        get_claude_skills_dir().ok_or("Cannot determine skills directory")?
    };

    let safe_name = sanitize_filename(&request.new_skill_name);
    let dest_dir = install_dir.join(&safe_name);

    if dest_dir.exists() {
        return Ok(ImportResult {
            success: false,
            message: format!("Skill with name '{}' already exists", safe_name),
            blocked: false,
        });
    }

    if let Err(e) = fs::create_dir_all(&dest_dir) {
        return Ok(ImportResult {
            success: false,
            message: format!("Failed to create destination directory: {}", e),
            blocked: false,
        });
    }

    // Filter out .git directories during copy
    let copy_options = fs_extra::dir::CopyOptions::new().content_only(true);
    // Note: fs_extra is not in dependencies, we implemented copy_dir_all manually.
    // Let's use our manual copy_dir_all and remove .git afterwards.

    if let Err(e) = copy_dir_all(&source_path, &dest_dir) {
        let _ = fs::remove_dir_all(&dest_dir);
        return Ok(ImportResult {
            success: false,
            message: format!("Failed to copy skill files: {}", e),
            blocked: false,
        });
    }

    // Remove .git directory if copied
    let git_dir = dest_dir.join(".git");
    if git_dir.exists() {
        let _ = fs::remove_dir_all(git_dir);
    }

    // Update SKILL.md
    let skill_md_path = dest_dir.join("SKILL.md");
    if skill_md_path.exists() {
        match fs::read_to_string(&skill_md_path) {
            Ok(content) => {
                match update_frontmatter(
                    &content,
                    &request.new_skill_name,
                    request.derived_from_url.as_deref(),
                    &request.fork_type,
                ) {
                    Ok(new_content) => {
                        if let Err(e) = fs::write(&skill_md_path, new_content) {
                            // Cleanup on failure
                            let _ = fs::remove_dir_all(&dest_dir);
                            return Ok(ImportResult {
                                success: false,
                                message: format!("Failed to write updated SKILL.md: {}", e),
                                blocked: false,
                            });
                        }
                    },
                    Err(e) => {
                        // Warn but proceed? Or fail?
                        // If we can't update metadata, it's not a proper fork.
                        let _ = fs::remove_dir_all(&dest_dir);
                        return Ok(ImportResult {
                            success: false,
                            message: format!("Failed to parse SKILL.md frontmatter: {}", e),
                            blocked: false,
                        });
                    }
                }
            },
            Err(e) => {
                let _ = fs::remove_dir_all(&dest_dir);
                return Ok(ImportResult {
                    success: false,
                    message: format!("Failed to read SKILL.md: {}", e),
                    blocked: false,
                });
            }
        }
    } else {
        // No SKILL.md - create a basic one
        let content = format!(
            "---\nname: {}\nderivedFrom: {}\nforkType: {}\n---\n\n# {}\n\nForked from {}",
            request.new_skill_name,
            request.derived_from_url.as_deref().unwrap_or(""),
            request.fork_type,
            request.new_skill_name,
            request.original_skill_path
        );
        if let Err(e) = fs::write(&skill_md_path, content) {
             let _ = fs::remove_dir_all(&dest_dir);
             return Ok(ImportResult {
                 success: false,
                 message: format!("Failed to create SKILL.md: {}", e),
                 blocked: false,
             });
        }
    }

    Ok(ImportResult {
        success: true,
        message: format!("Skill forked successfully to {}", dest_dir.display()),
        blocked: false,
    })
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

fn import_from_source_dir(
    source: &PathBuf,
    install_path: Option<String>,
    skill_name: &str,
    skip_security_check: bool,
) -> Result<LocalImportOutcome, String> {
    let install_dir = if let Some(path) = install_path {
        PathBuf::from(path).join(".claude").join("skills")
    } else {
        get_claude_skills_dir().ok_or("Cannot determine skills directory")?
    };

    fs::create_dir_all(&install_dir).map_err(|e| e.to_string())?;

    let target_dir = install_dir.join(skill_name);
    copy_dir_all(source, &target_dir).map_err(|e| e.to_string())?;

    let installed_dirs = match extract_skill_dirs(&target_dir, &install_dir) {
        Ok(dirs) => dirs,
        Err(e) => {
            return Ok(LocalImportOutcome {
                result: ImportResult {
                    success: false,
                    message: e,
                    blocked: false,
                },
                installed_dirs: Vec::new(),
            })
        }
    };

    let mut installed = Vec::new();
    let mut blocked = Vec::new();
    let mut warnings = Vec::new();
    let mut installed_paths = Vec::new();

    if !skip_security_check {
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
            let current_name = dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("skill")
                .to_string();
            let is_whitelisted = whitelist_service
                .as_ref()
                .and_then(|service| service.is_skill_whitelisted(&current_name).ok())
                .unwrap_or(false);

            if is_whitelisted {
                eprintln!("Skill {} is whitelisted, skipping security scan.", current_name);
                installed.push((current_name, dir.clone()));
                installed_paths.push(dir);
                continue;
            }

            match scanner.scan_directory(dir.to_str().unwrap(), &current_name, "en", scan_mode, &whitelisted_rules) {
                Ok(report) => {
                    if report.blocked {
                        if let Err(e) = fs::remove_dir_all(&dir) {
                            eprintln!("Failed to remove blocked skill directory {}: {}", dir.display(), e);
                        }
                        blocked.push(current_name);
                        continue;
                    }

                    eprintln!("Security scan completed for {}: {} ({})", current_name, report.score, report.level.as_str());
                    if !report.issues.is_empty() {
                        eprintln!("Security issues found: {}", report.issues.len());
                    }

                    if report.score < 70 {
                        warnings.push(format!("{} ({})", current_name, report.score));
                    }
                    installed.push((current_name, dir.clone()));
                    installed_paths.push(dir);
                }
                Err(e) => {
                    eprintln!("Security scan failed for {}: {}", current_name, e);
                }
            }
        }
    } else {
        for dir in installed_dirs {
            let current_name = dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("skill")
                .to_string();
            installed.push((current_name, dir.clone()));
            installed_paths.push(dir);
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
        return Ok(LocalImportOutcome {
            result: ImportResult {
                success: false,
                message,
                blocked: !blocked.is_empty(),
            },
            installed_dirs: Vec::new(),
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

    Ok(LocalImportOutcome {
        result: ImportResult {
            success: true,
            message,
            blocked: !blocked.is_empty(),
        },
        installed_dirs: installed_paths,
    })
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

    let outcome = import_from_source_dir(
        &source,
        request.install_path,
        &request.skill_name,
        request.skip_security_check
    )?;

    Ok(outcome.result)
}

#[tauri::command]
fn export_skill_package(
    state: State<'_, ConfigService>,
    request: ExportSkillPackageRequest
) -> Result<ExportResult, String> {
    let skill_dir = PathBuf::from(&request.skill_path);
    if !skill_dir.exists() {
        return Ok(ExportResult {
            success: false,
            message: "Skill path does not exist".to_string(),
            file_path: None,
        });
    }

    let skill_dir_name = skill_dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("skill");
    let safe_name = sanitize_filename(skill_dir_name);
    let output_dir = ensure_export_dir(request.output_dir)?;
    let timestamp = now_millis();
    let output_path = output_dir.join(format!("{}-{}.skillpack.zip", safe_name, timestamp));

    let skill_md = skill_dir.join("SKILL.md");
    let mut skill_name = skill_dir_name.to_string();
    let mut skill_description = String::new();
    if skill_md.exists() {
        if let Ok(doc) = crate::analyzer::skill_document::SkillDocument::from_file(&skill_md) {
            if !doc.metadata.name.is_empty() {
                skill_name = doc.metadata.name;
            }
            if let Some(desc) = doc.metadata.description {
                skill_description = desc;
            } else {
                skill_description = doc.content.lines().take(5).collect::<Vec<_>>().join(" ");
            }
        }
    }

    let origin = state
        .get_skill_config(&request.skill_path)
        .and_then(|value| value.get("__origin").cloned());

    let metadata = json!({
        "formatVersion": "1.0",
        "exportedAt": timestamp,
        "skillDir": skill_dir_name,
        "skill": {
            "name": skill_name,
            "description": skill_description
        },
        "origin": origin
    });

    if let Err(e) = write_skill_package(&skill_dir, &output_path, &metadata) {
        return Ok(ExportResult {
            success: false,
            message: e,
            file_path: None,
        });
    }

    Ok(ExportResult {
        success: true,
        message: "Skill package exported".to_string(),
        file_path: Some(output_path.to_string_lossy().to_string()),
    })
}

#[tauri::command]
fn import_skill_package(
    state: State<'_, ConfigService>,
    request: ImportPackageRequest
) -> Result<ImportResult, String> {
    let package_path = PathBuf::from(&request.package_path);
    if !package_path.exists() {
        return Ok(ImportResult {
            success: false,
            message: "Package path does not exist".to_string(),
            blocked: false,
        });
    }

    if !is_skill_package_path(&package_path) {
        return Ok(ImportResult {
            success: false,
            message: "Invalid package file extension".to_string(),
            blocked: false,
        });
    }

    let metadata = read_package_metadata(&package_path)?;
    let exported_at = metadata
        .as_ref()
        .and_then(|m| m.get("exportedAt"))
        .and_then(|v| v.as_i64());
    let skill_dir_name = metadata
        .as_ref()
        .and_then(|m| m.get("skillDir"))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let origin_from_package = metadata
        .as_ref()
        .and_then(|m| m.get("origin"))
        .cloned();

    let temp_dir = std::env::temp_dir().join(format!("skill_package_{}", now_millis()));
    let _ = fs::remove_dir_all(&temp_dir);
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    if let Err(e) = extract_skill_package(&package_path, &temp_dir) {
        let _ = fs::remove_dir_all(&temp_dir);
        return Ok(ImportResult {
            success: false,
            message: e,
            blocked: false,
        });
    }

    let source_dir = match resolve_package_source_dir(&temp_dir, &skill_dir_name) {
        Ok(dir) => dir,
        Err(message) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Ok(ImportResult {
                success: false,
                message,
                blocked: false,
            });
        }
    };

    let inferred_name = source_dir
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("skill-package")
        .to_string();

    let outcome = import_from_source_dir(
        &source_dir,
        request.install_path,
        &inferred_name,
        request.skip_security_check
    )?;

    let imported_at = now_millis();
    let package_name = package_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("skill-package")
        .to_string();

    let mut origin_failures = Vec::new();
    for installed_dir in &outcome.installed_dirs {
        let checksum = calculate_skill_checksum_for_path(installed_dir).ok();
        let mut origin_object = origin_from_package.clone().unwrap_or_else(|| json!({}));
        if let Some(map) = origin_object.as_object_mut() {
            if !map.contains_key("sourceType") {
                map.insert("sourceType".to_string(), json!("package"));
            }
            map.insert("importedVia".to_string(), json!("package"));
            map.insert("importedAt".to_string(), json!(imported_at));
            map.insert("packageName".to_string(), json!(package_name.clone()));
            if let Some(exported_at) = exported_at {
                map.insert("exportedAt".to_string(), json!(exported_at));
            }
            map.insert("checksum".to_string(), json!(checksum));
        } else {
            origin_object = json!({
                "sourceType": "package",
                "importedVia": "package",
                "importedAt": imported_at,
                "packageName": package_name,
                "exportedAt": exported_at,
                "checksum": checksum
            });
        }

        if let Err(e) = upsert_origin_config(
            state.inner(),
            &installed_dir.to_string_lossy(),
            origin_object
        ) {
            eprintln!("Failed to persist package origin info: {}", e);
            origin_failures.push(installed_dir.to_string_lossy().to_string());
        }
    }

    let _ = fs::remove_dir_all(&temp_dir);

    let mut result = outcome.result;
    if !origin_failures.is_empty() {
        result.message = format!(
            "{}; failed to save origin metadata for {}",
            result.message,
            origin_failures.join(", ")
        );
    }

    Ok(result)
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
fn open_path_in_file_manager(path: String) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("Path is empty".to_string());
    }

    let mut target = PathBuf::from(trimmed);
    if !target.exists() {
        return Err(format!("Path does not exist: {}", trimmed));
    }

    if target.is_file() {
        if let Some(parent) = target.parent() {
            target = parent.to_path_buf();
        }
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&target)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&target)
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
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            log::debug!("Initializing database...");
            if let Err(e) = crate::services::db::init_db() {
                log::error!("Failed to initialize database: {}", e);
            }

            // Initialize default repositories if none exist
            log::debug!("Checking default repositories...");
            match crate::services::initialize_default_repositories() {
                Ok(initialized) => {
                    if initialized {
                        log::info!("Default repositories initialized successfully");
                    }
                }
                Err(e) => {
                    log::warn!("Failed to initialize default repositories: {}", e);
                }
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
            calculate_skill_checksum,
            export_skill_package,
            import_skill_package,
            fork_skill,
            open_url,
            open_path_in_file_manager,
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
            commands::config::save_project_paths,
            // Publish commands
            commands::publish::run_publish_preflight,
            commands::publish::publish_skill,
            // Repository management commands
            commands::repository::get_repositories,
            commands::repository::get_repository,
            commands::repository::add_repository,
            commands::repository::delete_repository,
            commands::repository::toggle_repository_enabled,
            commands::repository::get_featured_repositories,
            commands::repository::refresh_featured_repositories,
            commands::repository::get_unscanned_repositories,
            commands::repository::get_repository_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod package_tests {
    use super::*;
    use serde_json::json;
    use std::io::Write;
    use tempfile::tempdir;
    use zip::write::FileOptions;
    use zip::CompressionMethod;

    fn create_skill_dir(root: &Path, name: &str) -> PathBuf {
        let skill_dir = root.join(name);
        fs::create_dir_all(skill_dir.join("config")).unwrap();
        fs::create_dir_all(skill_dir.join(".git")).unwrap();
        fs::create_dir_all(skill_dir.join("node_modules")).unwrap();

        fs::write(skill_dir.join("SKILL.md"), "# Demo Skill\n").unwrap();
        fs::write(skill_dir.join("config").join("settings.json"), "{ \"ok\": true }").unwrap();
        fs::write(skill_dir.join(".git").join("HEAD"), "ref: refs/heads/main").unwrap();
        fs::write(skill_dir.join("node_modules").join("ignore.js"), "console.log('ignore');").unwrap();

        skill_dir
    }

    #[test]
    fn test_write_and_extract_skill_package_roundtrip() {
        let temp = tempdir().unwrap();
        let skill_dir = create_skill_dir(temp.path(), "my-skill");
        let package_path = temp.path().join("my-skill.skillpack.zip");
        let metadata = json!({
            "formatVersion": 1,
            "skill": {
                "name": "My Skill",
                "description": "Test"
            }
        });

        write_skill_package(&skill_dir, &package_path, &metadata).unwrap();
        assert!(package_path.exists());

        let read_metadata = read_package_metadata(&package_path).unwrap().unwrap();
        assert_eq!(read_metadata["formatVersion"], 1);
        assert_eq!(read_metadata["skill"]["name"], "My Skill");

        let dest_dir = temp.path().join("dest");
        extract_skill_package(&package_path, &dest_dir).unwrap();

        let extracted_root = dest_dir.join("my-skill");
        assert!(extracted_root.join("SKILL.md").exists());
        assert!(extracted_root.join("config").join("settings.json").exists());
        assert!(!extracted_root.join(".git").exists());
        assert!(!extracted_root.join("node_modules").exists());
    }

    #[test]
    fn test_read_package_metadata_missing() {
        let temp = tempdir().unwrap();
        let package_path = temp.path().join("no-meta.skillpack.zip");
        let file = fs::File::create(&package_path).unwrap();
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::<()>::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);

        zip.start_file("demo/SKILL.md", options).unwrap();
        zip.write_all(b"# Demo\n").unwrap();
        zip.finish().unwrap();

        let metadata = read_package_metadata(&package_path).unwrap();
        assert!(metadata.is_none());
    }

    #[test]
    fn test_extract_skill_package_rejects_traversal() {
        let temp = tempdir().unwrap();
        let package_path = temp.path().join("bad.skillpack.zip");
        let file = fs::File::create(&package_path).unwrap();
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::<()>::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);

        zip.start_file("../evil.txt", options).unwrap();
        zip.write_all(b"nope").unwrap();
        zip.finish().unwrap();

        let dest_dir = temp.path().join("dest");
        let err = extract_skill_package(&package_path, &dest_dir).expect_err("expected invalid path error");
        assert!(err.contains("invalid paths"));
    }

    #[test]
    fn test_extract_skill_package_rejects_absolute_path() {
        let temp = tempdir().unwrap();
        let package_path = temp.path().join("absolute.skillpack.zip");
        let file = fs::File::create(&package_path).unwrap();
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::<()>::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);

        zip.start_file("/evil.txt", options).unwrap();
        zip.write_all(b"nope").unwrap();
        zip.finish().unwrap();

        let dest_dir = temp.path().join("dest");
        let err = extract_skill_package(&package_path, &dest_dir).expect_err("expected absolute path error");
        assert!(err.contains("absolute") || err.contains("invalid"));
    }

    #[test]
    fn test_extract_skill_package_size_limit() {
        let temp = tempdir().unwrap();
        let package_path = temp.path().join("big.skillpack.zip");
        let file = fs::File::create(&package_path).unwrap();
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::<()>::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);

        zip.start_file("skill/SKILL.md", options).unwrap();
        zip.write_all(&vec![0u8; 16]).unwrap();
        zip.finish().unwrap();

        let dest_dir = temp.path().join("dest");
        let err = extract_skill_package_with_limit(&package_path, &dest_dir, 10)
            .expect_err("expected package size error");
        assert!(err.contains("too large"));
    }

    #[test]
    fn test_resolve_package_source_dir_multiple_skills() {
        let temp = tempdir().unwrap();
        let first = temp.path().join("skill-a");
        let second = temp.path().join("skill-b");
        fs::create_dir_all(&first).unwrap();
        fs::create_dir_all(&second).unwrap();
        fs::write(first.join("SKILL.md"), "# A").unwrap();
        fs::write(second.join("SKILL.md"), "# B").unwrap();

        let err = resolve_package_source_dir(&temp.path().to_path_buf(), &None)
            .expect_err("expected multiple skills error");
        assert!(err.contains("multiple skills"));
    }

    #[test]
    fn test_is_skill_package_path() {
        let valid = PathBuf::from("C:/tmp/demo.skillpack.zip");
        let invalid = PathBuf::from("C:/tmp/demo.zip");
        assert!(is_skill_package_path(&valid));
        assert!(!is_skill_package_path(&invalid));
    }

    #[test]
    fn test_import_from_source_dir_skip_security() {
        let temp = tempdir().unwrap();
        let source_dir = temp.path().join("source-skill");
        fs::create_dir_all(&source_dir).unwrap();
        fs::write(source_dir.join("SKILL.md"), "# Skill\n").unwrap();

        let install_root = temp.path().join("install-root");
        let outcome = import_from_source_dir(
            &source_dir,
            Some(install_root.to_string_lossy().to_string()),
            "imported-skill",
            true
        )
        .unwrap();

        assert!(outcome.result.success);
        assert_eq!(outcome.installed_dirs.len(), 1);

        let expected_path = install_root.join(".claude").join("skills").join("imported-skill");
        assert_eq!(outcome.installed_dirs[0], expected_path);
        assert!(expected_path.join("SKILL.md").exists());
    }

    #[test]
    fn test_is_skill_package_path_case_insensitive() {
        // 测试大小写不敏感的扩展名验证
        let valid_lowercase = PathBuf::from("C:/tmp/demo.skillpack.zip");
        let valid_uppercase = PathBuf::from("C:/tmp/demo.SKILLPACK.ZIP");
        let valid_mixed = PathBuf::from("C:/tmp/demo.SkillPack.Zip");
        let invalid = PathBuf::from("C:/tmp/demo.zip");

        assert!(is_skill_package_path(&valid_lowercase));
        assert!(is_skill_package_path(&valid_uppercase));
        assert!(is_skill_package_path(&valid_mixed));
        assert!(!is_skill_package_path(&invalid));
    }

    #[test]
    fn test_extract_package_with_windows_prefix_path() {
        // 测试拒绝 Windows 驱动器前缀路径
        let temp = tempdir().unwrap();
        let package_path = temp.path().join("windows-prefix.skillpack.zip");
        let file = fs::File::create(&package_path).unwrap();
        let mut zip = ZipWriter::new(file);
        let options = FileOptions::<()>::default()
            .compression_method(CompressionMethod::Deflated)
            .unix_permissions(0o644);

        // Windows 驱动器前缀路径应该被拒绝
        zip.start_file("C:/evil.txt", options).unwrap();
        zip.write_all(b"malicious").unwrap();
        zip.finish().unwrap();

        let dest_dir = temp.path().join("dest");
        let err = extract_skill_package(&package_path, &dest_dir)
            .expect_err("expected prefix path error");
        assert!(err.contains("absolute") || err.contains("invalid"));
    }

    #[test]
    fn test_sanitize_filename_edge_cases() {
        // 测试文件名清理函数的边界情况
        assert_eq!(sanitize_filename("my-skill"), "my-skill");
        assert_eq!(sanitize_filename("my skill"), "my_skill");
        assert_eq!(sanitize_filename("skill@#$%"), "skill");  // 末尾下划线会被 trim 掉
        assert_eq!(sanitize_filename("___skill___"), "skill");
        assert_eq!(sanitize_filename("@#$"), "skill");
        assert_eq!(sanitize_filename("正常文件名"), "skill");
    }

    #[test]
    fn test_write_package_preserves_metadata() {
        // 测试导出包时正确保留元数据
        let temp = tempdir().unwrap();
        let skill_dir = create_skill_dir(temp.path(), "meta-skill");
        let package_path = temp.path().join("meta-skill.skillpack.zip");

        let metadata = json!({
            "formatVersion": "1.0",
            "skill": {
                "name": "Meta Skill",
                "description": "Test metadata"
            },
            "origin": {
                "sourceType": "github",
                "url": "https://github.com/test/skill"
            }
        });

        write_skill_package(&skill_dir, &package_path, &metadata).unwrap();

        // 验证元数据可以正确读取
        let read_metadata = read_package_metadata(&package_path).unwrap().unwrap();
        assert_eq!(read_metadata["formatVersion"], "1.0");
        assert_eq!(read_metadata["skill"]["name"], "Meta Skill");
        assert_eq!(read_metadata["origin"]["sourceType"], "github");
    }

    #[test]
    fn test_should_skip_package_entry() {
        // 测试应该跳过的目录和文件
        use std::path::Path;

        // 应该跳过的目录
        assert!(should_skip_package_entry(Path::new(".git")));
        assert!(should_skip_package_entry(Path::new("node_modules")));
        assert!(should_skip_package_entry(Path::new("target")));
        assert!(should_skip_package_entry(Path::new("some/.git/config")));

        // 不应该跳过的路径
        assert!(!should_skip_package_entry(Path::new("SKILL.md")));
        assert!(!should_skip_package_entry(Path::new("config/settings.json")));
        assert!(!should_skip_package_entry(Path::new("src/main.rs")));
    }
}
