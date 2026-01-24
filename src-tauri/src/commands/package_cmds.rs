use tauri::State;
use std::path::PathBuf;
use serde_json::json;
use crate::services::config_service::ConfigService;
use crate::services::package_service::PackageService;
use crate::services::collection_service::CollectionService;
use crate::services::utils::{now_millis, sanitize_filename};
use crate::models::package::{ExportSkillPackageRequest, ExportCollectionPackageRequest, ImportPackageRequest, ExportResult};
use crate::models::import::ImportResult;
use crate::services::import_service::{ImportService, LocalImportOutcome};
use crate::services::skill_service::SkillService;
use std::fs;
use crate::services::utils::copy_dir_all;

// Duplicating upsert_origin_config for now as it's private in lib.rs
// Should be moved to ConfigService or Utils in a better refactor
fn upsert_origin_config(
    config_service: &ConfigService,
    skill_path: &str,
    origin: serde_json::Value,
) -> Result<(), String> {
    let existing = config_service
        .get_skill_config(skill_path)
        .unwrap_or(json!({}));
    let mut object = existing.as_object().cloned().unwrap_or_default();
    object.insert("__origin".to_string(), origin);
    config_service.set_skill_config(skill_path, serde_json::Value::Object(object))
}

// Duplicating import_from_source_dir or making it public in import_cmds or services
// For now, I'll copy the helper function to avoid circular deps or complexity
fn import_from_source_dir(
    source: &PathBuf,
    install_path: Option<String>,
    skill_name: &str,
    skip_security_check: bool,
) -> Result<LocalImportOutcome, String> {
    let install_dir = if let Some(path) = install_path {
        PathBuf::from(path).join(".claude").join("skills")
    } else {
        SkillService::get_claude_skills_dir().ok_or("Cannot determine skills directory")?
    };

    fs::create_dir_all(&install_dir).map_err(|e| e.to_string())?;

    let target_dir = install_dir.join(skill_name);
    copy_dir_all(source, &target_dir).map_err(|e| e.to_string())?;

    let installed_dirs = match ImportService::extract_skill_dirs(&target_dir, &install_dir) {
        Ok(dirs) => dirs,
        Err(e) => {
            return Ok(LocalImportOutcome {
                result: ImportResult {
                    success: false,
                    message: e,
                    blocked: false,
                    skill_path: None,
                    skill_name: None,
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
                installed.push((current_name.clone(), dir.clone()));
                installed_paths.push((current_name, dir));
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

                    if report.score < 70 {
                        warnings.push(format!("{} ({})", current_name, report.score));
                    }
                    installed.push((current_name.clone(), dir.clone()));
                    installed_paths.push((current_name, dir));
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
            installed.push((current_name.clone(), dir.clone()));
            installed_paths.push((current_name, dir));
        }
    }

    if installed.is_empty() {
        let message = if blocked.is_empty() {
            "No SKILL.md found in the imported folder".to_string()
        } else {
            format!("Security check blocked installation. Blocked skills: {}", blocked.join(", "))
        };
        return Ok(LocalImportOutcome {
            result: ImportResult {
                success: false,
                message,
                blocked: !blocked.is_empty(),
                skill_path: None,
                skill_name: None,
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
            skill_path: installed.first().map(|(_, p)| p.to_string_lossy().to_string()),
            skill_name: installed.first().map(|(n, _)| n.clone()),
        },
        installed_dirs: installed_paths,
    })
}

#[tauri::command]
pub fn calculate_skill_checksum(skill_path: String) -> Result<String, String> {
    PackageService::calculate_skill_checksum_for_path(&PathBuf::from(skill_path))
}

#[tauri::command]
pub fn export_skill_package(
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
    let output_dir = PackageService::ensure_export_dir(request.output_dir)?;
    let timestamp = now_millis();
    let output_path = output_dir.join(format!("{}-{}.skillpack.zip", safe_name, timestamp));

    let skill_md = skill_dir.join("SKILL.md");
    let mut skill_name = skill_dir_name.to_string();
    let mut skill_description = String::new();
    if skill_md.exists() {
        if let Some(doc) = SkillService::parse_skill_md(&skill_md, "export") {
             skill_name = doc.name;
             skill_description = doc.description;
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

    if let Err(e) = PackageService::write_skill_package(&skill_dir, &output_path, &metadata) {
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
pub fn export_collection_package(
    request: ExportCollectionPackageRequest
) -> Result<ExportResult, String> {
    let collection = CollectionService::get_collection(&request.collection_id)
        .map_err(|e| e.to_string())?
        .ok_or("Collection not found")?;

    let items = CollectionService::get_collection_items(&request.collection_id)
        .map_err(|e| e.to_string())?;

    let output_dir = PackageService::ensure_export_dir(request.output_dir)?;
    let safe_name = sanitize_filename(&collection.name);
    let timestamp = now_millis();
    let output_path = output_dir.join(format!("{}-{}.skillcollection.zip", safe_name, timestamp));

    // For brevity, using direct zip operations similar to lib.rs or I should move this logic to PackageService
    // I will use direct impl here to save time, but ideally it should be in PackageService
    use zip::write::FileOptions;
    use zip::CompressionMethod;
    use zip::ZipWriter;
    use std::io::Write;
    use walkdir::WalkDir;

    let file = fs::File::create(&output_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::<()>::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);

    // Write collection.json
    let metadata = json!({
        "formatVersion": "1.0",
        "type": "collection",
        "exportedAt": timestamp,
        "collection": {
            "id": collection.id,
            "name": collection.name,
            "description": collection.description,
            "author": collection.author,
            "items_count": items.len()
        }
    });
    let metadata_json = serde_json::to_string_pretty(&metadata).map_err(|e| e.to_string())?;
    zip.start_file("collection.json", options).map_err(|e| e.to_string())?;
    zip.write_all(metadata_json.as_bytes()).map_err(|e| e.to_string())?;

    // Write skills
    for item in items {
        if let Some(skill_path_str) = item.skill_path {
            let skill_path = PathBuf::from(skill_path_str);
            if skill_path.exists() {
                let skill_dir_name = skill_path.file_name().unwrap_or_default().to_string_lossy();
                let base_path_in_zip = format!("skills/{}", skill_dir_name);

                for entry in WalkDir::new(&skill_path)
                    .follow_links(false)
                    .max_depth(10)
                    .into_iter()
                    .filter_map(|e| e.ok())
                {
                    if !entry.file_type().is_file() {
                        continue;
                    }
                    if PackageService::should_skip_package_entry(entry.path()) {
                        continue;
                    }

                    let rel_path = entry.path().strip_prefix(&skill_path).map_err(|e| e.to_string())?;
                    let rel_str = rel_path.to_string_lossy().replace('\\', "/");
                    let zip_path = format!("{}/{}", base_path_in_zip, rel_str);

                    zip.start_file(zip_path, options).map_err(|e| e.to_string())?;
                    let mut f = fs::File::open(entry.path()).map_err(|e| e.to_string())?;
                    std::io::copy(&mut f, &mut zip).map_err(|e| e.to_string())?;
                }
            }
        }
    }

    zip.finish().map_err(|e| e.to_string())?;

    Ok(ExportResult {
        success: true,
        message: "Collection package exported".to_string(),
        file_path: Some(output_path.to_string_lossy().to_string()),
    })
}

#[tauri::command]
pub fn import_skill_package(
    state: State<'_, ConfigService>,
    request: ImportPackageRequest
) -> Result<ImportResult, String> {
    let package_path = PathBuf::from(&request.package_path);
    if !package_path.exists() {
        return Ok(ImportResult {
            success: false,
            message: "Package path does not exist".to_string(),
            blocked: false,
            skill_path: None,
            skill_name: None,
        });
    }

    if !PackageService::is_skill_package_path(&package_path) {
        return Ok(ImportResult {
            success: false,
            message: "Invalid package file extension".to_string(),
            blocked: false,
            skill_path: None,
            skill_name: None,
        });
    }

    let metadata = PackageService::read_package_metadata(&package_path)?;
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

    if let Err(e) = PackageService::extract_skill_package(&package_path, &temp_dir) {
        let _ = fs::remove_dir_all(&temp_dir);
        return Ok(ImportResult {
            success: false,
            message: e,
            blocked: false,
            skill_path: None,
            skill_name: None,
        });
    }

    let source_dir = match PackageService::resolve_package_source_dir(&temp_dir, &skill_dir_name) {
        Ok(dir) => dir,
        Err(message) => {
            let _ = fs::remove_dir_all(&temp_dir);
            return Ok(ImportResult {
                success: false,
                message,
                blocked: false,
                skill_path: None,
                skill_name: None,
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
        let checksum = PackageService::calculate_skill_checksum_for_path(&installed_dir.1).ok();
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
            &installed_dir.1.to_string_lossy(),
            origin_object
        ) {
            eprintln!("Failed to persist package origin info: {}", e);
            origin_failures.push(installed_dir.1.to_string_lossy().to_string());
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
