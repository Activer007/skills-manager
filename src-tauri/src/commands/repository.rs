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

/// Request to add a new repository
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddRepositoryRequest {
    pub url: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub scan_subdirs: Option<bool>,
}

/// Response for repository operations
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RepositoryResponse {
    pub success: bool,
    pub message: String,
    pub repository_id: Option<String>,
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
pub fn add_repository(request: AddRepositoryRequest) -> Result<RepositoryResponse, String> {
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
        enabled: true,
        scan_subdirs: request.scan_subdirs.unwrap_or(false),
        added_at: Utc::now(),
        last_scanned: None,
        cache_path: None,
        cached_commit_sha: None,
        featured: false,
        category: RepositoryCategory::Custom,
    };

    match service.add_repository(&repo) {
        Ok(id) => Ok(RepositoryResponse {
            success: true,
            message: format!("Repository '{}' added successfully", repo.name),
            repository_id: Some(id),
        }),
        Err(e) => Ok(RepositoryResponse {
            success: false,
            message: format!("Failed to add repository: {}", e),
            repository_id: None,
        }),
    }
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
