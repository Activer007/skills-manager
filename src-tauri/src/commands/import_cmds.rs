use tauri::{AppHandle, State, Manager};
use tauri::ipc::Channel;
use std::fs;
use std::path::PathBuf;
use serde_json::json;

use crate::services::config_service::ConfigService;
use crate::services::import_service::{ImportService, ImportOutcome};
use crate::services::skill_service::SkillService;
use crate::services::package_service::PackageService;
use crate::services::utils::{now_millis, copy_dir_all};
use crate::models::import::{ImportGithubRequest, ImportLocalRequest, ImportResult, OriginRecord};
use crate::tasks::{BackgroundTask, TaskType, TaskStatus, ProgressEvent, ProgressStage, TASK_MANAGER};

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

fn process_imported_skills(
    install_dir: &PathBuf,
    target_dir: &PathBuf,
    github_info: Option<&crate::services::import_service::GithubImportInfo>,
    detected_branch: Option<String>,
    skip_security_check: bool,
    progress_channel: Option<&Channel<ProgressEvent>>,
    task_id: Option<&String>,
) -> Result<ImportOutcome, String> {
    let report = |stage: ProgressStage, msg: &str, pct: u8| {
        if let (Some(ch), Some(tid)) = (progress_channel, task_id) {
            let _ = ch.send(ProgressEvent::new(tid, stage, msg, pct));
        }
    };

    report(ProgressStage::Preparing, "Analyzing repository structure...", 30);

    let skill_subpaths = if let Some(info) = github_info {
        ImportService::build_skill_subpath_map(target_dir, &info.base_subpath)
    } else {
        std::collections::HashMap::new()
    };

    report(ProgressStage::Installing, "Extracting skills...", 40);

    let installed_dirs = match ImportService::extract_skill_dirs(target_dir, install_dir) {
        Ok(dirs) => dirs,
        Err(e) => {
            return Ok(ImportOutcome {
                result: ImportResult {
                    success: false,
                    message: e,
                    blocked: false,
                    skill_path: None,
                    skill_name: None,
                },
                origins: Vec::new(),
            })
        }
    };

    let mut installed = Vec::new();
    let mut blocked = Vec::new();
    let mut warnings = Vec::new();

    let total_skills = installed_dirs.len();
    report(ProgressStage::Scanning, &format!("Scanning {} skills...", total_skills), 50);

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

        for (idx, dir) in installed_dirs.iter().enumerate() {
            let skill_name = dir
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("skill")
                .to_string();

            let progress_pct = 50 + ((idx as f32 / total_skills as f32) * 40.0) as u8;
            report(ProgressStage::Scanning, &format!("Scanning {}...", skill_name), progress_pct);

            let is_whitelisted = whitelist_service
                .as_ref()
                .and_then(|service| service.is_skill_whitelisted(&skill_name).ok())
                .unwrap_or(false);

            if is_whitelisted {
                installed.push((skill_name, dir.clone()));
                continue;
            }

            match scanner.scan_directory(&dir.to_string_lossy(), &skill_name, "en", scan_mode, &whitelisted_rules) {
                Ok(report) => {
                    if report.blocked {
                        if let Err(e) = fs::remove_dir_all(dir) {
                            eprintln!("Failed to remove blocked skill directory {}: {}", dir.display(), e);
                        }
                        blocked.push(skill_name);
                        continue;
                    }

                    if report.score < 70 {
                        warnings.push(format!("{} ({})", skill_name, report.score));
                    }
                    installed.push((skill_name, dir.clone()));
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

    report(ProgressStage::Finalizing, "Finalizing installation...", 90);

    if installed.is_empty() {
        let message = if blocked.is_empty() {
            "No SKILL.md found in the imported repository".to_string()
        } else {
            format!("Security check blocked installation. Blocked skills: {}", blocked.join(", "))
        };
        return Ok(ImportOutcome {
            result: ImportResult {
                success: false,
                message,
                blocked: !blocked.is_empty(),
                skill_path: None,
                skill_name: None,
            },
            origins: Vec::new(),
        });
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

    let mut origins = Vec::new();
    let first_skill = installed.first().map(|(n, p)| (n.clone(), p.clone()));
    let installed_at = now_millis();

    if let Some(info) = github_info {
        let branch = if info.is_tree {
            info.branch_from_url.clone().or(detected_branch)
        } else {
            detected_branch
        };
        let base_repo_url = &info.base_repo_url;
        let request_url = &info.request_url;
        let base_subpath = &info.base_subpath;

        for (skill_name, dir) in &installed {
             let subpath = skill_subpaths
                .get(skill_name)
                .cloned()
                .unwrap_or_else(|| base_subpath.clone());
            let install_url = ImportService::build_github_install_url(
                base_repo_url,
                branch.as_deref(),
                &subpath
            );
            let origin_url = install_url.clone();
            let checksum = PackageService::calculate_skill_checksum_for_path(dir).ok();
            let origin = json!({
                "sourceType": "github",
                "repoUrl": base_repo_url,
                "installUrl": install_url,
                "originUrl": origin_url,
                "subpath": subpath,
                "branch": branch,
                "requestUrl": request_url,
                "installedAt": installed_at,
                "checksum": checksum
            });
            origins.push(OriginRecord {
                skill_path: dir.to_string_lossy().to_string(),
                origin,
            });
        }
    }

    Ok(ImportOutcome {
        result: ImportResult {
            success: true,
            message,
            blocked: !blocked.is_empty(),
            skill_path: first_skill.as_ref().map(|(_, p)| p.to_string_lossy().to_string()),
            skill_name: first_skill.map(|(n, _)| n),
        },
        origins,
    })
}

#[tauri::command(async)]
pub async fn import_github_skill(
    state: State<'_, ConfigService>,
    request: ImportGithubRequest
) -> Result<ImportResult, String> {
    let repo_url = request.repo_url.clone();

    let outcome = tokio::task::spawn_blocking(move || {
        let install_dir = if let Some(path) = &request.install_path {
            PathBuf::from(path).join(".claude").join("skills")
        } else {
            match SkillService::get_claude_skills_dir() {
                Some(dir) => dir,
                None => return ImportOutcome {
                    result: ImportResult {
                        success: false,
                        message: "Cannot determine skills directory".to_string(),
                        blocked: false,
                        skill_path: None,
                        skill_name: None,
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
                    skill_path: None,
                    skill_name: None,
                },
                origins: Vec::new(),
            };
        }

        let (target_dir, detected_branch, github_info) = match ImportService::clone_and_prepare(&repo_url, &install_dir) {
            Ok(v) => v,
            Err(e) => return ImportOutcome {
                result: ImportResult {
                    success: false,
                    message: e,
                    blocked: false,
                    skill_path: None,
                    skill_name: None,
                },
                origins: Vec::new(),
            },
        };

        process_imported_skills(
            &install_dir,
            &target_dir,
            Some(&github_info),
            detected_branch,
            request.skip_security_check,
            None,
            None
        ).unwrap_or_else(|e| ImportOutcome {
             result: ImportResult {
                success: false,
                message: e,
                blocked: false,
                skill_path: None,
                skill_name: None,
            },
            origins: Vec::new(),
        })

    }).await.map_err(|e| e.to_string())?;

    for record in outcome.origins {
        if let Err(e) = upsert_origin_config(state.inner(), &record.skill_path, record.origin) {
            eprintln!("Failed to persist origin info for {}: {}", record.skill_path, e);
        }
    }

    Ok(outcome.result)
}

#[tauri::command]
pub async fn import_github_skill_with_progress(
    app: AppHandle,
    state: State<'_, ConfigService>,
    request: ImportGithubRequest,
    progress_channel: Channel<ProgressEvent>
) -> Result<String, String> {
    let repo_url = request.repo_url.clone();
    let task = BackgroundTask::new(TaskType::ImportSkill, format!("Importing {}", repo_url));
    let task_id = TASK_MANAGER.add_task(task.clone()).await;

    let _ = progress_channel.send(ProgressEvent::new(&task_id, ProgressStage::Queued, "Task queued...", 0));

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let channel_clone = progress_channel.clone();
    let request_clone = request.clone();

    tokio::spawn(async move {
        let task_id = task_id_clone;
        let channel = channel_clone;
        let req = request_clone;

        TASK_MANAGER.update_status(&app_handle, &task_id, TaskStatus::Running).await;
        let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Preparing, "Waiting for slot...", 5));

        let (_permit, _dl_permit) = TASK_MANAGER.acquire_permit(&TaskType::ImportSkill).await;

        // Get cancellation token before entering blocking context
        let cancel_token = TASK_MANAGER.get_cancellation_token(&task_id).await;
        if let Some(ref token) = cancel_token {
            if token.is_cancelled() {
                TASK_MANAGER.update_status(&app_handle, &task_id, TaskStatus::Cancelled).await;
                let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Cancelled, "Cancelled", 0));
                return;
            }
        }

        let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Downloading, "Downloading repository...", 10));

        let repo_url = req.repo_url.clone();
        let install_path = req.install_path.clone();
        let skip_security_check = req.skip_security_check;

        let task_id_for_blocking = task_id.clone();
        let channel_for_blocking = channel.clone();

        let res = tokio::task::spawn_blocking(move || {
            let install_dir = if let Some(path) = install_path {
                PathBuf::from(path).join(".claude").join("skills")
            } else {
                match SkillService::get_claude_skills_dir() {
                    Some(dir) => dir,
                    None => return Err("Cannot determine skills directory".to_string()),
                }
            };

            if let Err(e) = fs::create_dir_all(&install_dir) {
                return Err(format!("Failed to create directory: {}", e));
            }

            let (target_dir, detected_branch, github_info) = ImportService::clone_and_prepare(&repo_url, &install_dir)?;

            process_imported_skills(
                &install_dir,
                &target_dir,
                Some(&github_info),
                detected_branch,
                skip_security_check,
                Some(&channel_for_blocking),
                Some(&task_id_for_blocking),
            )
        }).await;

        match res {
            Ok(Ok(outcome)) => {
                if outcome.result.success {
                     for record in outcome.origins {
                        if let Err(e) = upsert_origin_config(app_handle.state::<ConfigService>().inner(), &record.skill_path, record.origin) {
                            eprintln!("Failed to persist origin info for {}: {}", record.skill_path, e);
                        }
                    }

                    let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Completed, &outcome.result.message, 100));
                    TASK_MANAGER.update_status(&app_handle, &task_id, TaskStatus::Completed).await;
                } else {
                    let msg = outcome.result.message;
                     let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Failed, &msg, 100));
                    TASK_MANAGER.update_error(&app_handle, &task_id, msg).await;
                }
            },
            Ok(Err(e)) => {
                let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Failed, &e, 100));
                TASK_MANAGER.update_error(&app_handle, &task_id, e).await;
            },
            Err(e) => {
                let msg = format!("Task execution failed: {}", e);
                let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Failed, &msg, 100));
                TASK_MANAGER.update_error(&app_handle, &task_id, msg).await;
            }
        }
    });

    Ok(task_id)
}

fn import_from_source_dir(
    source: &PathBuf,
    install_path: Option<String>,
    skill_name: &str,
    skip_security_check: bool,
) -> Result<ImportOutcome, String> {
    let install_dir = if let Some(path) = install_path {
        PathBuf::from(path).join(".claude").join("skills")
    } else {
        SkillService::get_claude_skills_dir().ok_or("Cannot determine skills directory")?
    };

    fs::create_dir_all(&install_dir).map_err(|e| e.to_string())?;

    let target_dir = install_dir.join(skill_name);
    let _ = fs::remove_dir_all(&target_dir);
    copy_dir_all(source, &target_dir).map_err(|e| e.to_string())?;

    process_imported_skills(
        &install_dir,
        &target_dir,
        None,
        None,
        skip_security_check,
        None,
        None
    )
}

#[tauri::command]
pub fn import_local_skill(request: ImportLocalRequest) -> Result<ImportResult, String> {
    let source = PathBuf::from(&request.source_path);

    if !source.exists() {
        return Ok(ImportResult {
            success: false,
            message: "Source path does not exist".to_string(),
            blocked: false,
            skill_path: None,
            skill_name: None,
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
