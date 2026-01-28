//! Source types and scan result models for repository-marketplace integration
//!
//! This module defines the SourceType enum and related structures for managing
//! skill sources and synchronization results.

use serde::{Deserialize, Serialize};

/// Source type for repositories
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SourceType {
    /// Featured/official repositories (priority=10)
    Featured,
    /// User-added custom repositories (priority=100)
    #[default]
    User,
}

impl SourceType {
    /// Get the default priority for this source type
    pub fn default_priority(&self) -> i32 {
        match self {
            SourceType::Featured => 10,
            SourceType::User => 100,
        }
    }

    /// Check if this is a featured source
    pub fn is_featured(&self) -> bool {
        matches!(self, SourceType::Featured)
    }
}

impl std::fmt::Display for SourceType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Featured => write!(f, "featured"),
            Self::User => write!(f, "user"),
        }
    }
}

impl std::str::FromStr for SourceType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "featured" => Ok(Self::Featured),
            "user" => Ok(Self::User),
            _ => Err(format!("Unknown source type: {}", s)),
        }
    }
}

/// Filter for source type queries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum SourceFilter {
    /// Show only featured sources
    Featured,
    /// Show only user sources
    User,
    /// Show all sources (default)
    #[default]
    All,
}

impl std::fmt::Display for SourceFilter {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Featured => write!(f, "featured"),
            Self::User => write!(f, "user"),
            Self::All => write!(f, "all"),
        }
    }
}

impl std::str::FromStr for SourceFilter {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "featured" => Ok(Self::Featured),
            "user" => Ok(Self::User),
            "all" => Ok(Self::All),
            _ => Err(format!("Unknown source filter: {}", s)),
        }
    }
}

/// Result of a repository scan operation
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    /// Repository ID that was scanned
    pub repository_id: String,
    /// Total number of skills found
    pub total_found: usize,
    /// Number of skills successfully synced to marketplace
    pub synced_count: usize,
    /// Number of skills that failed to sync
    pub failed_count: usize,
    /// List of skill names that were synced
    pub synced_skills: Vec<String>,
    /// Error messages for failed skills
    pub errors: Vec<SkillSyncError>,
    /// Scan duration in milliseconds
    pub duration_ms: u64,
}

impl ScanResult {
    /// Create a new empty scan result
    pub fn new(repository_id: String) -> Self {
        Self {
            repository_id,
            total_found: 0,
            synced_count: 0,
            failed_count: 0,
            synced_skills: Vec::new(),
            errors: Vec::new(),
            duration_ms: 0,
        }
    }

    /// Check if the scan was fully successful
    pub fn is_success(&self) -> bool {
        self.failed_count == 0 && self.synced_count > 0
    }

    /// Check if the scan had any errors
    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }
}

/// Error during skill synchronization
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSyncError {
    /// Skill name or path that failed
    pub skill_identifier: String,
    /// Error message
    pub message: String,
    /// Error code (optional)
    pub code: Option<String>,
}

impl SkillSyncError {
    pub fn new(skill_identifier: String, message: String) -> Self {
        Self {
            skill_identifier,
            message,
            code: None,
        }
    }

    pub fn with_code(skill_identifier: String, message: String, code: String) -> Self {
        Self {
            skill_identifier,
            message,
            code: Some(code),
        }
    }
}

/// Result of syncing a single skill to marketplace
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillSyncResult {
    /// The generated skill ID
    pub skill_id: String,
    /// Skill name
    pub name: String,
    /// Skill path within repository
    pub skill_path: String,
    /// Whether this was an insert or update
    pub operation: SyncOperation,
    /// Optional error message
    pub error: Option<String>,
}

/// Type of sync operation performed
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SyncOperation {
    /// New skill was inserted
    Insert,
    /// Existing skill was updated
    Update,
    /// Skill was skipped (unchanged)
    Skip,
    /// Sync failed
    Failed,
}

impl std::fmt::Display for SyncOperation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Insert => write!(f, "insert"),
            Self::Update => write!(f, "update"),
            Self::Skip => write!(f, "skip"),
            Self::Failed => write!(f, "failed"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_source_type_display() {
        assert_eq!(SourceType::Featured.to_string(), "featured");
        assert_eq!(SourceType::User.to_string(), "user");
    }

    #[test]
    fn test_source_type_parse() {
        assert_eq!("featured".parse::<SourceType>().unwrap(), SourceType::Featured);
        assert_eq!("user".parse::<SourceType>().unwrap(), SourceType::User);
        assert_eq!("FEATURED".parse::<SourceType>().unwrap(), SourceType::Featured);
        assert!("invalid".parse::<SourceType>().is_err());
    }

    #[test]
    fn test_source_type_priority() {
        assert_eq!(SourceType::Featured.default_priority(), 10);
        assert_eq!(SourceType::User.default_priority(), 100);
    }

    #[test]
    fn test_source_filter_display() {
        assert_eq!(SourceFilter::Featured.to_string(), "featured");
        assert_eq!(SourceFilter::User.to_string(), "user");
        assert_eq!(SourceFilter::All.to_string(), "all");
    }

    #[test]
    fn test_source_filter_parse() {
        assert_eq!("featured".parse::<SourceFilter>().unwrap(), SourceFilter::Featured);
        assert_eq!("user".parse::<SourceFilter>().unwrap(), SourceFilter::User);
        assert_eq!("all".parse::<SourceFilter>().unwrap(), SourceFilter::All);
    }

    #[test]
    fn test_scan_result_new() {
        let result = ScanResult::new("repo-123".to_string());
        assert_eq!(result.repository_id, "repo-123");
        assert_eq!(result.total_found, 0);
        assert_eq!(result.synced_count, 0);
        assert!(!result.is_success());
        assert!(!result.has_errors());
    }

    #[test]
    fn test_scan_result_success() {
        let mut result = ScanResult::new("repo-123".to_string());
        result.total_found = 5;
        result.synced_count = 5;
        result.synced_skills = vec!["skill1".to_string(), "skill2".to_string()];

        assert!(result.is_success());
        assert!(!result.has_errors());
    }

    #[test]
    fn test_scan_result_with_errors() {
        let mut result = ScanResult::new("repo-123".to_string());
        result.total_found = 5;
        result.synced_count = 3;
        result.failed_count = 2;
        result.errors.push(SkillSyncError::new(
            "skill4".to_string(),
            "Parse error".to_string(),
        ));

        assert!(!result.is_success());
        assert!(result.has_errors());
    }

    #[test]
    fn test_skill_sync_error() {
        let error = SkillSyncError::new("skill1".to_string(), "Failed to parse".to_string());
        assert_eq!(error.skill_identifier, "skill1");
        assert!(error.code.is_none());

        let error_with_code = SkillSyncError::with_code(
            "skill2".to_string(),
            "Network error".to_string(),
            "E001".to_string(),
        );
        assert_eq!(error_with_code.code, Some("E001".to_string()));
    }

    #[test]
    fn test_sync_operation_display() {
        assert_eq!(SyncOperation::Insert.to_string(), "insert");
        assert_eq!(SyncOperation::Update.to_string(), "update");
        assert_eq!(SyncOperation::Skip.to_string(), "skip");
        assert_eq!(SyncOperation::Failed.to_string(), "failed");
    }
}
