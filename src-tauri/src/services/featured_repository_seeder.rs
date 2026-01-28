//! Featured Repository Seeder
//!
//! This module handles seeding the database with featured repositories
//! from the featured-repositories.yaml configuration file.
//!
//! The seeder is designed to be idempotent - it can be run multiple times
//! without creating duplicate entries.

use anyhow::{Context, Result};
use chrono::Utc;

use crate::models::repository::{Repository, RepositoryCategory};
use crate::services::repository_service::RepositoryService;
use crate::services::featured_repository_service::{FeaturedRepositoryService, FeaturedRepository};

/// Seed featured repositories into the database
///
/// This function checks if any repositories exist, and if none exist,
/// it loads the featured repositories configuration and seeds the database.
///
/// # Returns
/// - `Ok(true)` if repositories were seeded
/// - `Ok(false)` if repositories already exist (idempotent)
/// - `Err(...)` if an error occurred during seeding
pub fn seed_featured_repositories() -> Result<bool> {
    log::debug!("Checking for featured repositories to seed...");

    let service = RepositoryService::new();

    // Check if any repositories exist
    let count = service.get_repository_count()
        .context("Failed to check repository count")?;

    if count > 0 {
        log::debug!("Repositories already exist (count: {}), skipping seeding", count);
        return Ok(false);
    }

    log::info!("No repositories found, seeding featured repositories...");

    // Load featured repositories configuration
    let config = FeaturedRepositoryService::get_config()
        .context("Failed to load featured repositories configuration")?;

    // Collect all featured repositories from all categories
    let featured_repos: Vec<Repository> = config.categories
        .into_iter()
        .flat_map(|category| {
            // Map category ID to RepositoryCategory
            let repo_category = match category.id.as_str() {
                "official" => RepositoryCategory::Official,
                "community" => RepositoryCategory::Community,
                _ => RepositoryCategory::Custom,
            };

            // Filter for featured repositories and convert to Repository
            category.repositories
                .into_iter()
                .filter(|repo| repo.featured)
                .map(move |repo| {
                    // Convert FeaturedRepository to Repository with category
                    featured_repo_to_repository(repo, repo_category.clone())
                })
        })
        .collect();

    if featured_repos.is_empty() {
        log::warn!("No featured repositories found in configuration");
        return Ok(false);
    }

    log::info!("Found {} featured repositories to inject", featured_repos.len());

    // Seed repositories in a transaction-like manner
    let mut seeded_count = 0;
    let mut repo_names = Vec::new();

    for repo in &featured_repos {
        match service.add_repository(repo) {
            Ok(_) => {
                seeded_count += 1;
                repo_names.push(repo.name.clone());
                log::debug!("Seeded featured repository: {}", repo.name);
            }
            Err(e) => {
                log::warn!("Failed to seed featured repository {}: {}", repo.name, e);
                // Continue with next repository instead of failing entirely
            }
        }
    }

    if seeded_count > 0 {
        log::info!("Successfully injected {} featured repositories: {}",
            seeded_count,
            repo_names.join(", ")
        );
    } else {
        log::warn!("No featured repositories were successfully injected");
    }

    log::debug!("Featured repository seeding completed");

    Ok(seeded_count > 0)
}

/// Convert a FeaturedRepository to a Repository with featured metadata
///
/// # Arguments
/// - `featured_repo`: The featured repository from configuration
/// - `category`: The repository category (official, community, custom)
///
/// # Returns
/// A Repository with appropriate metadata for featured sources
fn featured_repo_to_repository(
    featured_repo: FeaturedRepository,
    category: RepositoryCategory,
) -> Repository {
    // Get localized description (prefer Chinese, fallback to English)
    let description = FeaturedRepositoryService::get_repository_description(&featured_repo, "zh");

    Repository {
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
        category,
        source_type: "featured".to_string(),
        priority: 10,
        scan_status: "pending".to_string(),
        etag: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Test: Featured repository conversion preserves all required fields
    #[test]
    fn test_featured_repo_to_repository() {
        let featured_repo = FeaturedRepository {
            url: "https://github.com/test/repo".to_string(),
            name: "test-repo".to_string(),
            description: {
                let mut map = std::collections::HashMap::new();
                map.insert("en".to_string(), "Test repository".to_string());
                map.insert("zh".to_string(), "测试仓库".to_string());
                map
            },
            tags: vec!["test".to_string()],
            featured: true,
            scan_subdirs: true,
        };

        let repo = featured_repo_to_repository(featured_repo, RepositoryCategory::Official);

        assert_eq!(repo.url, "https://github.com/test/repo");
        assert_eq!(repo.name, "test-repo");
        assert_eq!(repo.source_type, "featured");
        assert_eq!(repo.priority, 10);
        assert_eq!(repo.enabled, true);
        assert_eq!(repo.scan_subdirs, true);
        assert_eq!(repo.category, RepositoryCategory::Official);
        assert_eq!(repo.featured, true);
        assert_eq!(repo.scan_status, "pending");
        assert_eq!(repo.description, Some("测试仓库".to_string()));
    }

    /// Test: Description fallback to English when Chinese is unavailable
    #[test]
    fn test_featured_repo_to_repository_fallback_description() {
        let featured_repo = FeaturedRepository {
            url: "https://github.com/test/repo".to_string(),
            name: "test-repo".to_string(),
            description: {
                let mut map = std::collections::HashMap::new();
                map.insert("en".to_string(), "Test repository".to_string());
                map
            },
            tags: vec![],
            featured: true,
            scan_subdirs: false,
        };

        let repo = featured_repo_to_repository(featured_repo, RepositoryCategory::Community);

        // Should fallback to English description when Chinese is not available
        assert_eq!(repo.description, Some("Test repository".to_string()));
        assert_eq!(repo.category, RepositoryCategory::Community);
    }

    /// Test: All default fields are set correctly
    #[test]
    fn test_featured_repo_to_repository_default_fields() {
        let featured_repo = FeaturedRepository {
            url: "https://github.com/test/repo".to_string(),
            name: "test-repo".to_string(),
            description: std::collections::HashMap::new(),
            tags: vec![],
            featured: true,
            scan_subdirs: false,
        };

        let repo = featured_repo_to_repository(featured_repo, RepositoryCategory::Custom);

        assert_eq!(repo.source_type, "featured");
        assert_eq!(repo.priority, 10);
        assert_eq!(repo.enabled, true);
        assert_eq!(repo.featured, true);
        assert_eq!(repo.scan_status, "pending");
        assert!(repo.etag.is_none());
        assert!(repo.last_scanned.is_none());
        assert!(repo.cache_path.is_none());
        assert!(repo.cached_commit_sha.is_none());
    }
}
