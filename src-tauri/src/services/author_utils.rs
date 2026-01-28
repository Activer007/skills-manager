// Author fallback utilities for marketplace skills
//
// This module provides utilities for handling missing or incomplete author information
// in marketplace skills, implementing the fallback strategy defined in the architecture.

use regex::Regex;
use anyhow::Result;

/// Extract author from GitHub URL
///
/// # Arguments
/// * `url` - GitHub repository URL (e.g., "https://github.com/owner/repo")
///
/// # Returns
/// * `Ok(Some(author))` - Author extracted from URL
/// * `Ok(None)` - URL does not contain author info
/// * `Err(e)` - Invalid URL format
///
/// # Examples
/// ```ignore
/// let author = extract_author_from_github_url("https://github.com/anthropics/skills")?;
/// assert_eq!(author, Some("anthropics".to_string()));
/// ```
pub fn extract_author_from_github_url(url: &str) -> Result<Option<String>> {
    let re = Regex::new(r"github\.com/([^/]+)")?;
    match re.captures(url) {
        Some(caps) => {
            let author = caps.get(1).map(|m| m.as_str().to_string());
            Ok(author)
        }
        None => Ok(None),
    }
}

/// Fallback strategy for author resolution
///
/// Implements the priority-based fallback strategy:
/// 1. Use provided author if not empty
/// 2. Extract from github_url
/// 3. Default to "unknown"
///
/// # Arguments
/// * `author` - Author from metadata (may be None or empty)
/// * `github_url` - GitHub repository URL
///
/// # Returns
/// Resolved author string (never empty)
pub fn resolve_author_fallback(author: Option<&str>, github_url: Option<&str>) -> String {
    // Strategy 1: Use provided author if not empty
    if let Some(a) = author {
        if !a.is_empty() {
            return a.to_string();
        }
    }

    // Strategy 2: Extract from github_url
    if let Some(url) = github_url {
        if let Ok(Some(extracted_author)) = extract_author_from_github_url(url) {
            return extracted_author;
        }
    }

    // Strategy 3: Default to "unknown"
    "unknown".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_author_from_github_url() {
        // Standard GitHub URL
        assert_eq!(
            extract_author_from_github_url("https://github.com/anthropics/skills").unwrap(),
            Some("anthropics".to_string())
        );

        // GitHub URL with .git suffix
        assert_eq!(
            extract_author_from_github_url("https://github.com/owner/repo.git").unwrap(),
            Some("owner".to_string())
        );

        // Non-GitHub URL
        assert_eq!(
            extract_author_from_github_url("https://gitlab.com/user/repo").unwrap(),
            None
        );

        // Invalid URL
        assert!(extract_author_from_github_url("not-a-url").is_ok());
    }

    #[test]
    fn test_resolve_author_fallback() {
        // Test Strategy 1: Use provided author
        assert_eq!(
            resolve_author_fallback(Some("test-author"), Some("https://github.com/owner/repo")),
            "test-author"
        );

        // Test Strategy 2: Extract from URL when author is None
        assert_eq!(
            resolve_author_fallback(None, Some("https://github.com/anthropics/skills")),
            "anthropics"
        );

        // Test Strategy 2: Extract from URL when author is empty
        assert_eq!(
            resolve_author_fallback(Some(""), Some("https://github.com/owner/repo")),
            "owner"
        );

        // Test Strategy 3: Default to "unknown"
        assert_eq!(
            resolve_author_fallback(None, None),
            "unknown"
        );

        assert_eq!(
            resolve_author_fallback(Some(""), None),
            "unknown"
        );

        assert_eq!(
            resolve_author_fallback(None, Some("https://gitlab.com/user/repo")),
            "unknown"
        );
    }

    #[test]
    fn test_resolve_author_with_real_world_examples() {
        // Anthropic official skills
        assert_eq!(
            resolve_author_fallback(
                Some("Anthropic"),
                Some("https://github.com/anthropics/courses")
            ),
            "Anthropic"
        );

        // Missing author, fallback to URL extraction
        assert_eq!(
            resolve_author_fallback(
                None,
                Some("https://github.com/obra/superpowers")
            ),
            "obra"
        );

        // Completely unknown source
        assert_eq!(
            resolve_author_fallback(None, None),
            "unknown"
        );
    }
}
