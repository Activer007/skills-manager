//! Error types for the application
//!
//! This module provides a unified error handling system for the application.

use std::fmt;

/// Unified API error type
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "code", content = "details")]
pub enum ApiError {
    /// Resource not found
    #[serde(rename = "NOT_FOUND")]
    NotFound {
        message: String,
    },

    /// Invalid input parameters
    #[serde(rename = "INVALID_INPUT")]
    InvalidInput {
        message: String,
        field: Option<String>,
    },

    /// Database operation error
    #[serde(rename = "DATABASE_ERROR")]
    DatabaseError {
        message: String,
    },

    /// Git operation error
    #[serde(rename = "GIT_ERROR")]
    GitError {
        message: String,
    },

    /// API rate limit exceeded
    #[serde(rename = "API_RATE_LIMIT_EXCEEDED")]
    ApiRateLimitExceeded {
        message: String,
        help_url: Option<String>,
    },

    /// Repository already exists
    #[serde(rename = "REPOSITORY_EXISTS")]
    RepositoryExists {
        message: String,
        repository_id: Option<String>,
    },

    /// Repository has installed skills
    #[serde(rename = "REPOSITORY_HAS_INSTALLED_SKILLS")]
    RepositoryHasInstalledSkills {
        message: String,
        installed_count: usize,
    },

    /// Internal server error
    #[serde(rename = "INTERNAL_ERROR")]
    InternalError {
        message: String,
    },
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::NotFound { message } => write!(f, "{}", message),
            ApiError::InvalidInput { message, .. } => write!(f, "{}", message),
            ApiError::DatabaseError { message } => write!(f, "Database error: {}", message),
            ApiError::GitError { message } => write!(f, "Git error: {}", message),
            ApiError::ApiRateLimitExceeded { message, .. } => write!(f, "{}", message),
            ApiError::RepositoryExists { message, .. } => write!(f, "{}", message),
            ApiError::RepositoryHasInstalledSkills { message, .. } => write!(f, "{}", message),
            ApiError::InternalError { message } => write!(f, "Internal error: {}", message),
        }
    }
}

impl std::error::Error for ApiError {}

impl From<rusqlite::Error> for ApiError {
    fn from(err: rusqlite::Error) -> Self {
        ApiError::DatabaseError {
            message: err.to_string(),
        }
    }
}

impl From<std::io::Error> for ApiError {
    fn from(err: std::io::Error) -> Self {
        ApiError::InternalError {
            message: err.to_string(),
        }
    }
}

/// Helper function to detect API rate limiting from Git errors
pub fn detect_api_rate_limit(error_message: &str) -> Option<ApiError> {
    let lower = error_message.to_lowercase();

    // Check for HTTP 403/429 status codes or rate limit keywords
    if lower.contains("403") || lower.contains("429") ||
       lower.contains("rate limit") || lower.contains("api rate limit exceeded") {
        return Some(ApiError::ApiRateLimitExceeded {
            message: "GitHub API 限流，请配置 Personal Access Token 以提高限额".to_string(),
            help_url: Some("https://github.com/settings/tokens".to_string()),
        });
    }

    None
}

/// Result type alias for API operations
pub type ApiResult<T> = Result<T, ApiError>;
