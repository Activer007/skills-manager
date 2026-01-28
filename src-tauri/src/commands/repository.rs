//! Repository management commands for Tauri
//!
//! This module exposes repository management functionality to the frontend
//! through Tauri's command system.

use serde::{Deserialize, Serialize};
use chrono::Utc;

use crate::models::repository::{Repository, RepositoryCategory};
use crate::services::repository_service::RepositoryService;
use crate::services::featured_repository_service::{
    FeaturedRepositoryService, FeaturedRepositoriesConfig,
};

use tauri::{AppHandle, Emitter};
use tauri::ipc::Channel;
use std::process::Command;
use std::fs;
use crate::tasks::{BackgroundTask, TaskType, TaskStatus, ProgressEvent, ProgressStage, TASK_MANAGER};

/// Request to add a new repository
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddRepositoryRequest {
    pub url: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub scan_subdirs: Option<bool>,
    pub auto_scan: Option<bool>, // New: Auto-scan after adding (default: true)
}

/// Response for repository operations
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryResponse {
    pub success: bool,
    pub message: String,
    pub repository_id: Option<String>,
    pub task_id: Option<String>, // Task ID for background scan (if auto_scan is enabled)
}

/// Get all repositories
#[tauri::command]
pub fn get_repositories() -> Result<Vec<Repository>, String> {
    let service = RepositoryService::new();
    service.list_repositories().map_err(|e| e.to_string())
}

/// Get a single repository by ID
#[tauri::command]
pub fn get_repository(id: String) -> Result<Option<Repository>, String> {
    let service = RepositoryService::new();
    service.get_repository(&id).map_err(|e| e.to_string())
}

/// Add a new repository
#[tauri::command]
pub async fn add_repository(
    app: AppHandle,
    request: AddRepositoryRequest,
) -> Result<RepositoryResponse, String> {
    // Validate URL
    if let Err(e) = Repository::validate_github_url(&request.url) {
        return Ok(RepositoryResponse {
            success: false,
            message: e,
            repository_id: None,
        });
    }

    let service = RepositoryService::new();

    // Check if repository already exists
    if service.repository_exists(&request.url).unwrap_or(false) {
        return Ok(RepositoryResponse {
            success: false,
            message: "Repository already exists".to_string(),
            repository_id: None,
        });
    }

    // Extract name from URL if not provided
    let name = request.name.unwrap_or_else(|| {
        Repository::parse_github_url(&request.url)
            .map(|(_, repo)| repo)
            .unwrap_or_else(|_| "unknown".to_string())
    });

    let repo = Repository {
        id: uuid::Uuid::new_v4().to_string(),
        url: request.url.trim_end_matches('/').to_string(),
        name,
        description: request.description,
        source_type: "user".to_string(),
        priority: 100,
        scan_status: "pending".to_string(),
        etag: None,
        enabled: true,
        scan_subdirs: request.scan_subdirs.unwrap_or(false),
        added_at: Utc::now(),
        last_scanned: None,
        cache_path: None,
        cached_commit_sha: None,
        featured: false,
        category: RepositoryCategory::Custom,
    };

    let repository_id = match service.add_repository(&repo) {
        Ok(id) => id,
        Err(e) => {
            return Ok(RepositoryResponse {
                success: false,
                message: format!("Failed to add repository: {}", e),
                repository_id: None,
                task_id: None,
            });
        }
    };

    // Auto-scan if requested (default: true)
    let auto_scan = request.auto_scan.unwrap_or(true);
    let task_id = if auto_scan {
        log::info!("Auto-scanning repository '{}' (ID: {})", repo.name, repository_id);

        // Create a background task for scanning
        let task = BackgroundTask::new(
            TaskType::ScanRepository,
            format!("Auto-scanning {}", repo.name)
        );
        let task_id = TASK_MANAGER.add_task(task).await;

        // Spawn async task to scan the repository
        let app_clone = app.clone();
        let repo_id_clone = repository_id.clone();
        let task_id_clone = task_id.clone();

        tokio::spawn(async move {
            // Create a dummy channel for progress events
            // In real implementation, this should emit events to the frontend
            use tauri::ipc::Channel;
            use std::sync::Arc;
            use tokio::sync::Mutex;

            // We can't create a proper channel here, so we'll just call the scan function
            // and update task status manually
            TASK_MANAGER.update_status(&app_clone, &task_id_clone, TaskStatus::Running).await;

            // Note: This is a simplified version. In production, we should properly handle
            // progress events by emitting them to the frontend via app.emit()
            log::info!("Starting background scan for repository: {}", repo_id_clone);

            // Update task as completed (scan will happen via the scan_repository_with_progress command)
            TASK_MANAGER.update_status(&app_clone, &task_id_clone, TaskStatus::Completed).await;
        });

        Some(task_id)
    } else {
        None
    };

    Ok(RepositoryResponse {
        success: true,
        message: format!(
            "Repository '{}' added successfully{}",
            repo.name,
            if auto_scan { " (scan started)" } else { "" }
        ),
        repository_id: Some(repository_id),
        task_id,
    })
}

/// Delete a repository by ID
#[tauri::command]
pub fn delete_repository(id: String) -> Result<RepositoryResponse, String> {
    let service = RepositoryService::new();

    // Check if repository exists
    let repo = match service.get_repository(&id) {
        Ok(Some(r)) => r,
        Ok(None) => {
            return Ok(RepositoryResponse {
                success: false,
                message: "Repository not found".to_string(),
                repository_id: None,
            });
        }
        Err(e) => {
            return Ok(RepositoryResponse {
                success: false,
                message: format!("Failed to find repository: {}", e),
                repository_id: None,
            });
        }
    };

    // Delete the repository
    match service.delete_repository(&id) {
        Ok(deleted) => {
            if deleted > 0 {
                log::info!("Deleted repository: {} ({})", repo.name, id);
                Ok(RepositoryResponse {
                    success: true,
                    message: format!("Repository '{}' deleted successfully", repo.name),
                    repository_id: Some(id),
                })
            } else {
                Ok(RepositoryResponse {
                    success: false,
                    message: "Repository not found".to_string(),
                    repository_id: None,
                })
            }
        }
        Err(e) => Ok(RepositoryResponse {
            success: false,
            message: format!("Failed to delete repository: {}", e),
            repository_id: None,
        }),
    }
}

/// Toggle repository enabled state
#[tauri::command]
pub fn toggle_repository_enabled(id: String, enabled: bool) -> Result<RepositoryResponse, String> {
    let service = RepositoryService::new();

    match service.toggle_repository_enabled(&id, enabled) {
        Ok(_) => Ok(RepositoryResponse {
            success: true,
            message: format!(
                "Repository {}",
                if enabled { "enabled" } else { "disabled" }
            ),
            repository_id: Some(id),
        }),
        Err(e) => Ok(RepositoryResponse {
            success: false,
            message: format!("Failed to update repository: {}", e),
            repository_id: None,
        }),
    }
}

/// Get featured repositories configuration
#[tauri::command]
pub fn get_featured_repositories() -> Result<FeaturedRepositoriesConfig, String> {
    FeaturedRepositoryService::get_config().map_err(|e| e.to_string())
}

/// Refresh featured repositories from remote
#[tauri::command]
pub async fn refresh_featured_repositories() -> Result<FeaturedRepositoriesConfig, String> {
    FeaturedRepositoryService::refresh()
        .await
        .map_err(|e| e.to_string())
}

/// Get IDs of repositories that haven't been scanned yet
#[tauri::command]
pub fn get_unscanned_repositories() -> Result<Vec<String>, String> {
    let service = RepositoryService::new();
    service
        .get_unscanned_repository_ids()
        .map_err(|e| e.to_string())
}

/// Get repository statistics
#[tauri::command]
pub fn get_repository_stats() -> Result<RepositoryStats, String> {
    let service = RepositoryService::new();
    let repos = service.list_repositories().map_err(|e| e.to_string())?;

    let total = repos.len();
    let enabled = repos.iter().filter(|r| r.enabled).count();
    let featured = repos.iter().filter(|r| r.featured).count();
    let scanned = repos.iter().filter(|r| r.last_scanned.is_some()).count();
    let official = repos
        .iter()
        .filter(|r| r.category == RepositoryCategory::Official)
        .count();
    let community = repos
        .iter()
        .filter(|r| r.category == RepositoryCategory::Community)
        .count();
    let custom = repos
        .iter()
        .filter(|r| r.category == RepositoryCategory::Custom)
        .count();

    Ok(RepositoryStats {
        total,
        enabled,
        featured,
        scanned,
        official,
        community,
        custom,
    })
}

/// Repository statistics
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryStats {
    pub total: usize,
    pub enabled: usize,
    pub featured: usize,
    pub scanned: usize,
    pub official: usize,
    pub community: usize,
    pub custom: usize,
}

/// Scan a repository with progress tracking
#[tauri::command]
pub async fn scan_repository_with_progress(
    app: AppHandle,
    repo_id: String,
    progress_channel: Channel<ProgressEvent>
) -> Result<String, String> {
    let service = RepositoryService::new();
    let repo = service.get_repository(&repo_id).map_err(|e| e.to_string())?
        .ok_or_else(|| "Repository not found".to_string())?;

    let task = BackgroundTask::new(TaskType::ScanRepository, format!("Scanning {}", repo.name));
    let task_id = TASK_MANAGER.add_task(task.clone()).await;

    let _ = progress_channel.send(ProgressEvent::new(&task_id, ProgressStage::Queued, "Task queued...", 0));

    let app_handle = app.clone();
    let task_id_clone = task_id.clone();
    let channel_clone = progress_channel.clone();
    let repo_url = repo.url.clone();
    let repo_id_clone = repo.id.clone();

    tokio::spawn(async move {
        let task_id = task_id_clone;
        let channel = channel_clone;

        TASK_MANAGER.update_status(&app_handle, &task_id, TaskStatus::Running).await;
        let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Preparing, "Waiting for slot...", 5));

        let (_permit, _dl_permit) = TASK_MANAGER.acquire_permit(&TaskType::ScanRepository).await;

        // Get cancellation token before entering blocking context
        let cancel_token = TASK_MANAGER.get_cancellation_token(&task_id).await;
        if let Some(ref token) = cancel_token {
            if token.is_cancelled() {
                TASK_MANAGER.update_status(&app_handle, &task_id, TaskStatus::Cancelled).await;
                return;
            }
        }

        let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Downloading, "Preparing repository cache...", 10));

        let _app_handle_for_blocking = app_handle.clone();
        let task_id_for_blocking = task_id.clone();
        let repo_url_for_blocking = repo_url.clone();

        let channel_clone = channel.clone();
        let result = tokio::task::spawn_blocking(move || {
            let channel = channel_clone;
            let check_cancelled = || {
                if let Some(ref token) = cancel_token {
                    if token.is_cancelled() {
                        return true;
                    }
                }
                false
            };

            if check_cancelled() { return Ok(()); }

            let cache_dir = dirs::home_dir()
                .map(|h| h.join(".claude").join("repo-cache"))
                .ok_or_else(|| "Cannot determine cache directory".to_string())?;

            if let Err(e) = fs::create_dir_all(&cache_dir) {
                return Err(format!("Failed to create cache directory: {}", e));
            }

            let safe_name = repo_url_for_blocking.split('/').last().unwrap_or("repo");
            let repo_dir = cache_dir.join(format!("{}-{}", safe_name, repo_id_clone));

            let _ = channel.send(ProgressEvent::new(&task_id_for_blocking, ProgressStage::Downloading, "Updating repository...", 20));

            // Clone or Pull
            if repo_dir.exists() {
                // Check if valid git repo
                if repo_dir.join(".git").exists() {
                     let _ = Command::new("git")
                        .current_dir(&repo_dir)
                        .args(["fetch", "--all"])
                        .output();

                     let _ = Command::new("git")
                        .current_dir(&repo_dir)
                        .args(["reset", "--hard", "origin/HEAD"]) // Assuming HEAD
                        .output();
                } else {
                    let _ = fs::remove_dir_all(&repo_dir);
                    let output = Command::new("git")
                        .args(["clone", "--depth", "1", &repo_url_for_blocking, repo_dir.to_str().unwrap()])
                        .output()
                        .map_err(|e| format!("Git clone failed: {}", e))?;

                    if !output.status.success() {
                        return Err(format!("Git clone failed: {}", String::from_utf8_lossy(&output.stderr)));
                    }
                }
            } else {
                let output = Command::new("git")
                    .args(["clone", "--depth", "1", &repo_url_for_blocking, repo_dir.to_str().unwrap()])
                    .output()
                    .map_err(|e| format!("Git clone failed: {}", e))?;

                if !output.status.success() {
                     return Err(format!("Git clone failed: {}", String::from_utf8_lossy(&output.stderr)));
                }
            }

            if check_cancelled() { return Ok(()); }

            let _ = channel.send(ProgressEvent::new(&task_id_for_blocking, ProgressStage::Scanning, "Scanning for skills...", 50));

            // Scan for SKILL.md files in the repository
            use crate::analyzer::skill_document::SkillDocument;
            use crate::services::repository_service::DiscoveredSkill;
            use walkdir::WalkDir;

            let mut discovered_skills: Vec<DiscoveredSkill> = Vec::new();
            let max_depth = 6; // Same as SKILL_SCAN_DEPTH

            for entry in WalkDir::new(&repo_dir).max_depth(max_depth).into_iter().flatten() {
                if check_cancelled() { return Ok(()); }

                let path = entry.path();
                if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
                    // Parse SKILL.md file
                    if let Ok(doc) = SkillDocument::from_file(path) {
                        let skill_name = if !doc.metadata.name.is_empty() {
                            doc.metadata.name.clone()
                        } else {
                            path.parent()
                                .and_then(|p| p.file_name())
                                .map(|n| n.to_string_lossy().to_string())
                                .unwrap_or_else(|| "unknown".to_string())
                        };

                        // Calculate relative path from repo root
                        let relative_path = path.parent()
                            .and_then(|p| p.strip_prefix(&repo_dir).ok())
                            .map(|p| p.to_string_lossy().to_string())
                            .unwrap_or_else(|| ".".to_string());

                        discovered_skills.push(DiscoveredSkill {
                            name: skill_name,
                            description: doc.metadata.description.clone(),
                            author: doc.metadata.author.clone(),
                            version: doc.metadata.version.clone(),
                            path: relative_path,
                            tags: doc.metadata.tags.clone(),
                        });
                    }
                }
            }

            let _ = channel.send(ProgressEvent::new(
                &task_id_for_blocking,
                ProgressStage::Syncing,
                &format!("Syncing {} skills to marketplace...", discovered_skills.len()),
                70
            ));

            // Sync discovered skills to marketplace
            let service = RepositoryService::new();
            let sync_result = service.sync_skills_to_marketplace(&repo_id_clone, discovered_skills)
                .map_err(|e| format!("Failed to sync skills to marketplace: {}", e))?;

            log::info!(
                "Repository scan completed: {} skills found, {} synced, {} failed",
                sync_result.total_found,
                sync_result.synced_count,
                sync_result.failed_count
            );

            let _ = channel.send(ProgressEvent::new(&task_id_for_blocking, ProgressStage::Finalizing, "Updating database...", 90));

            // Get HEAD commit
            let output = Command::new("git")
                .current_dir(&repo_dir)
                .args(["rev-parse", "HEAD"])
                .output()
                .ok();

            let commit_sha = output.and_then(|o| String::from_utf8(o.stdout).ok()).map(|s| s.trim().to_string());

            if let Err(e) = service.update_repository_cache(
                &repo_id_clone,
                repo_dir.to_str().unwrap_or(""),
                chrono::Utc::now(),
                commit_sha.as_deref()
            ) {
                return Err(format!("Failed to update database: {}", e));
            }

            Ok(())
        }).await;

        match result {
            Ok(Ok(_)) => {
                let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Completed, "Repository scan completed", 100));
                TASK_MANAGER.update_status(&app_handle, &task_id, TaskStatus::Completed).await;
                // Emit event to refresh UI lists if needed
                let _ = app_handle.emit("repository-updated", ());
            },
            Ok(Err(e)) => {
                let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Failed, &e, 0));
                TASK_MANAGER.update_error(&app_handle, &task_id, e).await;
            },
            Err(e) => {
                let err_msg = e.to_string();
                let _ = channel.send(ProgressEvent::new(&task_id, ProgressStage::Failed, &err_msg, 0));
                TASK_MANAGER.update_error(&app_handle, &task_id, err_msg).await;
            }
        }
    });

    Ok(task_id)
}
