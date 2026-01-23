//! Default Repository Initializer
//!
//! This module handles the initialization of default repositories
//! when the application starts for the first time.

use anyhow::Result;
use chrono::Utc;

use crate::models::repository::{Repository, RepositoryCategory};
use crate::services::repository_service::RepositoryService;
use crate::services::featured_repository_service::FeaturedRepositoryService;

/// Default official repositories to initialize
const DEFAULT_REPOSITORIES: &[(&str, &str, &str, bool)] = &[
    (
        "https://github.com/anthropics/skills",
        "anthropics",
        "Anthropic 官方 Claude Code 技能仓库",
        true, // scan_subdirs
    ),
    (
        "https://github.com/obra/superpowers",
        "superpowers",
        "专为 AI 编程助手设计的全自动开发工作流",
        true,
    ),
];

/// Initialize default repositories if none exist
///
/// This function should be called during application startup.
/// It checks if any repositories exist and if not, adds the default ones.
pub fn initialize_default_repositories() -> Result<bool> {
    let service = RepositoryService::new();

    // Check if any repositories exist
    let count = service.get_repository_count()?;
    if count > 0 {
        log::debug!("Repositories already exist (count: {}), skipping initialization", count);
        return Ok(false);
    }

    log::info!("No repositories found, initializing default repositories...");

    // Add default repositories
    for (url, name, description, scan_subdirs) in DEFAULT_REPOSITORIES {
        let repo = Repository {
            id: uuid::Uuid::new_v4().to_string(),
            url: url.to_string(),
            name: name.to_string(),
            description: Some(description.to_string()),
            enabled: true,
            scan_subdirs: *scan_subdirs,
            added_at: Utc::now(),
            last_scanned: None,
            cache_path: None,
            cached_commit_sha: None,
            featured: true,
            category: RepositoryCategory::Official,
        };

        match service.add_repository(&repo) {
            Ok(id) => {
                log::info!("Added default repository: {} (id: {})", name, id);
            }
            Err(e) => {
                log::warn!("Failed to add default repository {}: {}", name, e);
            }
        }
    }

    Ok(true)
}

/// Initialize repositories from featured configuration
///
/// This is an alternative initialization method that uses the featured
/// repositories configuration file instead of hardcoded defaults.
pub fn initialize_from_featured_config() -> Result<bool> {
    let service = RepositoryService::new();

    // Check if any repositories exist
    let count = service.get_repository_count()?;
    if count > 0 {
        log::debug!("Repositories already exist, skipping featured initialization");
        return Ok(false);
    }

    log::info!("Initializing repositories from featured configuration...");

    let config = FeaturedRepositoryService::get_config()?;

    let mut added_count = 0;

    for category in config.categories {
        let repo_category = match category.id.as_str() {
            "official" => RepositoryCategory::Official,
            "community" => RepositoryCategory::Community,
            _ => RepositoryCategory::Custom,
        };

        for featured_repo in category.repositories {
            // Only auto-add featured repositories
            if !featured_repo.featured {
                continue;
            }

            let description = featured_repo
                .description
                .get("zh")
                .or_else(|| featured_repo.description.get("en"))
                .cloned()
                .unwrap_or_default();

            let repo = Repository {
                id: uuid::Uuid::new_v4().to_string(),
                url: featured_repo.url.clone(),
                name: featured_repo.name.clone(),
                description: Some(description),
                enabled: true,
                scan_subdirs: featured_repo.scan_subdirs,
                added_at: Utc::now(),
                last_scanned: None,
                cache_path: None,
                cached_commit_sha: None,
                featured: true,
                category: repo_category.clone(),
            };

            match service.add_repository(&repo) {
                Ok(id) => {
                    log::info!("Added featured repository: {} (id: {})", featured_repo.name, id);
                    added_count += 1;
                }
                Err(e) => {
                    log::warn!("Failed to add featured repository {}: {}", featured_repo.name, e);
                }
            }
        }
    }

    log::info!("Initialized {} featured repositories", added_count);
    Ok(added_count > 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_repositories_defined() {
        assert!(!DEFAULT_REPOSITORIES.is_empty());

        for (url, name, description, _) in DEFAULT_REPOSITORIES {
            assert!(!url.is_empty());
            assert!(!name.is_empty());
            assert!(!description.is_empty());
            assert!(url.starts_with("https://github.com/"));
        }
    }
}
