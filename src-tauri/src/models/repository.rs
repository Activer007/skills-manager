//! Repository model for multi-source repository management
//!
//! This module defines the Repository struct and related types for managing
//! skill repositories from various sources (GitHub, local, etc.)

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

/// Repository category classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum RepositoryCategory {
    /// Official repositories from Anthropic or verified partners
    Official,
    /// Community-curated repositories with quality endorsement
    Community,
    /// User-added custom repositories
    #[default]
    Custom,
}

impl std::fmt::Display for RepositoryCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Official => write!(f, "official"),
            Self::Community => write!(f, "community"),
            Self::Custom => write!(f, "custom"),
        }
    }
}

impl std::str::FromStr for RepositoryCategory {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "official" => Ok(Self::Official),
            "community" => Ok(Self::Community),
            "custom" => Ok(Self::Custom),
            _ => Err(format!("Unknown repository category: {}", s)),
        }
    }
}

/// Scan queue task status
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "lowercase")]
pub enum ScanStatus {
    #[default]
    Pending,
    Running,
    Completed,
    Failed,
}

impl std::fmt::Display for ScanStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Pending => write!(f, "pending"),
            Self::Running => write!(f, "running"),
            Self::Completed => write!(f, "completed"),
            Self::Failed => write!(f, "failed"),
        }
    }
}

impl std::str::FromStr for ScanStatus {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "pending" => Ok(Self::Pending),
            "running" => Ok(Self::Running),
            "completed" => Ok(Self::Completed),
            "failed" => Ok(Self::Failed),
            _ => Err(format!("Unknown scan status: {}", s)),
        }
    }
}

/// Repository metadata for skill source management
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Repository {
    /// Unique identifier (UUID)
    pub id: String,
    /// Repository URL (e.g., https://github.com/owner/repo)
    pub url: String,
    /// Display name for the repository
    pub name: String,
    /// Optional description
    pub description: Option<String>,
    /// Whether this repository is enabled for scanning
    pub enabled: bool,
    /// Whether to scan subdirectories for skills
    pub scan_subdirs: bool,
    /// When this repository was added
    pub added_at: DateTime<Utc>,
    /// Last successful scan time
    pub last_scanned: Option<DateTime<Utc>>,
    /// Local cache path for downloaded repository
    pub cache_path: Option<String>,
    /// Cached commit SHA for change detection
    pub cached_commit_sha: Option<String>,
    /// Whether this is a featured repository
    pub featured: bool,
    /// Repository category (official, community, custom)
    pub category: RepositoryCategory,
}

impl Repository {
    /// Create a new repository with default values
    pub fn new(url: String, name: String) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            url,
            name,
            description: None,
            enabled: true,
            scan_subdirs: false,
            added_at: Utc::now(),
            last_scanned: None,
            cache_path: None,
            cached_commit_sha: None,
            featured: false,
            category: RepositoryCategory::Custom,
        }
    }

    /// Create a new featured repository
    pub fn new_featured(url: String, name: String, description: String, category: RepositoryCategory) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            url,
            name,
            description: Some(description),
            enabled: true,
            scan_subdirs: true,
            added_at: Utc::now(),
            last_scanned: None,
            cache_path: None,
            cached_commit_sha: None,
            featured: true,
            category,
        }
    }

    /// Parse owner and repo name from GitHub URL
    ///
    /// # Examples
    /// ```
    /// use skill_manager_lib::models::repository::Repository;
    /// let (owner, repo) = Repository::parse_github_url("https://github.com/anthropics/skills").unwrap();
    /// assert_eq!(owner, "anthropics");
    /// assert_eq!(repo, "skills");
    /// ```
    pub fn parse_github_url(url: &str) -> Result<(String, String), String> {
        let url = url.trim_end_matches('/').trim_end_matches(".git");

        // Handle various GitHub URL formats
        let parts: Vec<&str> = url.split('/').collect();

        if parts.len() < 2 {
            return Err("Invalid GitHub URL: too few path segments".to_string());
        }

        // Find github.com in the URL and get the next two parts
        let github_idx = parts.iter().position(|&p| p == "github.com");

        match github_idx {
            Some(idx) if parts.len() > idx + 2 => {
                let owner = parts[idx + 1].to_string();
                let repo = parts[idx + 2].to_string();

                if owner.is_empty() || repo.is_empty() {
                    return Err("Invalid GitHub URL: empty owner or repo".to_string());
                }

                Ok((owner, repo))
            }
            _ => Err("Invalid GitHub URL: cannot parse owner/repo".to_string()),
        }
    }

    /// Validate GitHub URL format
    pub fn validate_github_url(url: &str) -> Result<(), String> {
        if !url.starts_with("https://github.com/") && !url.starts_with("http://github.com/") {
            return Err("URL must start with https://github.com/".to_string());
        }

        let (owner, repo) = Self::parse_github_url(url)?;

        if owner.is_empty() {
            return Err("Repository owner cannot be empty".to_string());
        }

        if repo.is_empty() {
            return Err("Repository name cannot be empty".to_string());
        }

        Ok(())
    }

    /// Check if URL is a valid GitHub repository URL
    pub fn is_github_url(url: &str) -> bool {
        url.starts_with("https://github.com/") || url.starts_with("http://github.com/")
    }
}

/// Scan queue entry for tracking repository scan tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanQueueEntry {
    /// Auto-increment ID
    pub id: i64,
    /// Associated repository ID
    pub repository_id: String,
    /// Current scan status
    pub status: ScanStatus,
    /// When the scan was queued
    pub created_at: DateTime<Utc>,
    /// When the scan started
    pub started_at: Option<DateTime<Utc>>,
    /// When the scan completed
    pub completed_at: Option<DateTime<Utc>>,
    /// Error message if scan failed
    pub error_message: Option<String>,
    /// Number of skills found during scan
    pub skills_found: i32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_github_url_standard() {
        let (owner, repo) = Repository::parse_github_url("https://github.com/anthropics/skills").unwrap();
        assert_eq!(owner, "anthropics");
        assert_eq!(repo, "skills");
    }

    #[test]
    fn test_parse_github_url_with_git_suffix() {
        let (owner, repo) = Repository::parse_github_url("https://github.com/obra/superpowers.git").unwrap();
        assert_eq!(owner, "obra");
        assert_eq!(repo, "superpowers");
    }

    #[test]
    fn test_parse_github_url_with_trailing_slash() {
        let (owner, repo) = Repository::parse_github_url("https://github.com/test/repo/").unwrap();
        assert_eq!(owner, "test");
        assert_eq!(repo, "repo");
    }

    #[test]
    fn test_parse_github_url_invalid() {
        assert!(Repository::parse_github_url("https://gitlab.com/user/repo").is_err());
        assert!(Repository::parse_github_url("not-a-url").is_err());
    }

    #[test]
    fn test_validate_github_url() {
        assert!(Repository::validate_github_url("https://github.com/anthropics/skills").is_ok());
        assert!(Repository::validate_github_url("https://gitlab.com/user/repo").is_err());
        assert!(Repository::validate_github_url("https://github.com/").is_err());
    }

    #[test]
    fn test_repository_category_display() {
        assert_eq!(RepositoryCategory::Official.to_string(), "official");
        assert_eq!(RepositoryCategory::Community.to_string(), "community");
        assert_eq!(RepositoryCategory::Custom.to_string(), "custom");
    }

    #[test]
    fn test_repository_category_parse() {
        assert_eq!("official".parse::<RepositoryCategory>().unwrap(), RepositoryCategory::Official);
        assert_eq!("COMMUNITY".parse::<RepositoryCategory>().unwrap(), RepositoryCategory::Community);
        assert_eq!("Custom".parse::<RepositoryCategory>().unwrap(), RepositoryCategory::Custom);
    }

    #[test]
    fn test_new_repository() {
        let repo = Repository::new(
            "https://github.com/test/repo".to_string(),
            "test-repo".to_string(),
        );

        assert!(!repo.id.is_empty());
        assert_eq!(repo.url, "https://github.com/test/repo");
        assert_eq!(repo.name, "test-repo");
        assert!(repo.enabled);
        assert!(!repo.featured);
        assert_eq!(repo.category, RepositoryCategory::Custom);
    }

    #[test]
    fn test_new_featured_repository() {
        let repo = Repository::new_featured(
            "https://github.com/anthropics/skills".to_string(),
            "anthropics".to_string(),
            "Official Anthropic skills".to_string(),
            RepositoryCategory::Official,
        );

        assert!(repo.featured);
        assert!(repo.scan_subdirs);
        assert_eq!(repo.category, RepositoryCategory::Official);
        assert!(repo.description.is_some());
    }
}
