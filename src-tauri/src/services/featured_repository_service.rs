//! Featured Repository Service
//!
//! This module handles loading and caching of featured repository configurations
//! from both local embedded YAML and remote sources.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

/// Remote URL for featured repositories configuration
const FEATURED_REPOSITORIES_REMOTE_URL: &str =
    "https://raw.githubusercontent.com/anthropics/skills/main/featured-repositories.yaml";

/// Default embedded featured repositories YAML
const DEFAULT_FEATURED_REPOSITORIES_YAML: &str = include_str!("../../featured-repositories.yaml");

/// Featured repositories configuration structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeaturedRepositoriesConfig {
    pub version: String,
    pub last_updated: String,
    pub categories: Vec<FeaturedCategory>,
}

/// A category of featured repositories
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeaturedCategory {
    pub id: String,
    pub name: HashMap<String, String>,
    pub description: HashMap<String, String>,
    pub repositories: Vec<FeaturedRepository>,
}

/// A featured repository entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeaturedRepository {
    pub url: String,
    pub name: String,
    pub description: HashMap<String, String>,
    pub tags: Vec<String>,
    pub featured: bool,
    #[serde(default)]
    pub scan_subdirs: bool,
}

/// Service for managing featured repositories
pub struct FeaturedRepositoryService;

impl FeaturedRepositoryService {
    /// Get the cache directory for featured repositories
    fn get_cache_dir() -> Result<PathBuf> {
        let home = dirs::home_dir()
            .ok_or_else(|| anyhow::anyhow!("Cannot determine home directory"))?;
        let cache_dir = home.join(".claude").join("skills-manager-cache");
        fs::create_dir_all(&cache_dir)?;
        Ok(cache_dir)
    }

    /// Get the cache file path for featured repositories
    fn get_cache_path() -> Result<PathBuf> {
        Ok(Self::get_cache_dir()?.join("featured-repositories.yaml"))
    }

    /// Load featured repositories configuration
    /// Priority: cached file -> embedded default
    pub fn get_config() -> Result<FeaturedRepositoriesConfig> {
        // Try to load from cache first
        if let Ok(cache_path) = Self::get_cache_path() {
            if cache_path.exists() {
                if let Ok(cached_yaml) = fs::read_to_string(&cache_path) {
                    match serde_yaml::from_str::<FeaturedRepositoriesConfig>(&cached_yaml) {
                        Ok(config) => {
                            log::debug!("Loaded featured repositories from cache");
                            return Ok(config);
                        }
                        Err(e) => {
                            log::warn!(
                                "Failed to parse cached featured repositories, falling back to default: {}",
                                e
                            );
                        }
                    }
                }
            }
        }

        // Fall back to embedded default
        Self::get_default_config()
    }

    /// Get the default embedded configuration
    pub fn get_default_config() -> Result<FeaturedRepositoriesConfig> {
        serde_yaml::from_str(DEFAULT_FEATURED_REPOSITORIES_YAML)
            .context("Failed to parse embedded featured repositories YAML")
    }

    /// Refresh featured repositories from remote source
    pub async fn refresh() -> Result<FeaturedRepositoriesConfig> {
        log::info!("Refreshing featured repositories from remote...");

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        let response = client
            .get(FEATURED_REPOSITORIES_REMOTE_URL)
            .header(reqwest::header::USER_AGENT, "skills-manager")
            .send()
            .await
            .context("Failed to fetch featured repositories")?;

        if !response.status().is_success() {
            // Fall back to default if remote fetch fails
            log::warn!(
                "Remote fetch returned status {}, using default config",
                response.status()
            );
            return Self::get_default_config();
        }

        let yaml_content = response
            .text()
            .await
            .context("Failed to read response body")?;

        // Parse the YAML first to validate
        let config: FeaturedRepositoriesConfig = serde_yaml::from_str(&yaml_content)
            .context("Failed to parse remote featured repositories YAML")?;

        // Save to cache
        if let Ok(cache_path) = Self::get_cache_path() {
            if let Err(e) = fs::write(&cache_path, &yaml_content) {
                log::warn!("Failed to cache featured repositories: {}", e);
            } else {
                log::info!("Cached featured repositories to {:?}", cache_path);
            }
        }

        Ok(config)
    }

    /// Get all featured repository URLs
    pub fn get_featured_urls() -> Result<Vec<String>> {
        let config = Self::get_config()?;
        let urls: Vec<String> = config
            .categories
            .into_iter()
            .flat_map(|cat| cat.repositories.into_iter())
            .filter(|repo| repo.featured)
            .map(|repo| repo.url)
            .collect();
        Ok(urls)
    }

    /// Get repositories by category ID
    pub fn get_repositories_by_category(category_id: &str) -> Result<Vec<FeaturedRepository>> {
        let config = Self::get_config()?;
        let repos = config
            .categories
            .into_iter()
            .find(|cat| cat.id == category_id)
            .map(|cat| cat.repositories)
            .unwrap_or_default();
        Ok(repos)
    }

    /// Get localized category name
    pub fn get_category_name(category: &FeaturedCategory, lang: &str) -> String {
        category
            .name
            .get(lang)
            .or_else(|| category.name.get("en"))
            .cloned()
            .unwrap_or_else(|| category.id.clone())
    }

    /// Get localized category description
    pub fn get_category_description(category: &FeaturedCategory, lang: &str) -> String {
        category
            .description
            .get(lang)
            .or_else(|| category.description.get("en"))
            .cloned()
            .unwrap_or_default()
    }

    /// Get localized repository description
    pub fn get_repository_description(repo: &FeaturedRepository, lang: &str) -> String {
        repo.description
            .get(lang)
            .or_else(|| repo.description.get("en"))
            .cloned()
            .unwrap_or_default()
    }

    /// Clear the cached configuration
    pub fn clear_cache() -> Result<()> {
        if let Ok(cache_path) = Self::get_cache_path() {
            if cache_path.exists() {
                fs::remove_file(&cache_path)?;
                log::info!("Cleared featured repositories cache");
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_default_config() {
        let config = FeaturedRepositoryService::get_default_config().unwrap();
        assert_eq!(config.version, "1.0");
        assert!(!config.categories.is_empty());
    }

    #[test]
    fn test_get_featured_urls() {
        let urls = FeaturedRepositoryService::get_featured_urls().unwrap();
        assert!(!urls.is_empty());
        assert!(urls.iter().any(|url| url.contains("github.com")));
    }

    #[test]
    fn test_localized_names() {
        let config = FeaturedRepositoryService::get_default_config().unwrap();
        let category = &config.categories[0];

        let en_name = FeaturedRepositoryService::get_category_name(category, "en");
        let zh_name = FeaturedRepositoryService::get_category_name(category, "zh");

        assert!(!en_name.is_empty());
        assert!(!zh_name.is_empty());
        // English and Chinese names should be different
        assert_ne!(en_name, zh_name);
    }

    #[test]
    fn test_get_repositories_by_category() {
        let repos = FeaturedRepositoryService::get_repositories_by_category("official").unwrap();
        assert!(!repos.is_empty());

        let empty = FeaturedRepositoryService::get_repositories_by_category("nonexistent").unwrap();
        assert!(empty.is_empty());
    }
}
