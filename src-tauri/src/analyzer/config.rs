#![allow(dead_code)]
#![allow(unused_variables)]
#![allow(unused_imports)]
// Configuration loader for the Skill Quality Analyzer
//
// This module loads scoring weights and analysis parameters from JSON configuration file.
// Reference: src-tauri/config/scoring_weights.json

use crate::analyzer::AnalyzerError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

/// Main scoring configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringConfig {
    /// Configuration version
    pub version: String,

    /// Configuration description
    pub description: String,

    /// Scoring weights for all dimensions
    pub weights: ScoringWeights,

    /// Grade thresholds
    pub grade_thresholds: GradeThresholds,

    /// Keyword lists for detection
    pub keywords: Keywords,

    /// Analysis parameters
    pub analysis: AnalysisParams,

    /// Stars thresholds (for community metrics)
    pub stars_thresholds: StarsThresholds,
}

/// Scoring weights for all dimensions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringWeights {
    /// Content quality weights (total 50 points)
    pub content_quality: ContentQualityWeights,

    /// Technical implementation weights (total 30 points)
    pub technical_implementation: TechnicalImplementationWeights,

    /// Maintenance weights (total 10 points)
    pub maintenance: MaintenanceWeights,

    /// User experience weights (total 10 points)
    pub user_experience: UserExperienceWeights,
}

/// Content quality scoring weights (50 points total)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentQualityWeights {
    pub total: u32,
    pub clarity: u32,
    pub technical_depth: u32,
    pub documentation: u32,
    pub actionability: u32,
}

/// Technical implementation scoring weights (30 points total)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnicalImplementationWeights {
    pub total: u32,
    pub code_quality: u32,
    pub pattern_design: u32,
    pub error_handling: u32,
}

/// Maintenance scoring weights (10 points total)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceWeights {
    pub total: u32,
    pub update_frequency: u32,
    pub community_activity: u32,
    pub compatibility: u32,
}

/// User experience scoring weights (10 points total)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserExperienceWeights {
    pub total: u32,
    pub ease_of_use: u32,
    pub readability: u32,
}

/// Grade thresholds
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GradeThresholds {
    #[serde(rename = "S")]
    pub s: u32,
    #[serde(rename = "A")]
    pub a: u32,
    #[serde(rename = "B")]
    pub b: u32,
    #[serde(rename = "C")]
    pub c: u32,
    #[serde(rename = "D")]
    pub d: u32,
}

/// Keyword lists for various detection tasks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Keywords {
    pub when_to_use: Vec<String>,
    pub best_practices: Vec<String>,
    pub security: Vec<String>,
    pub patterns: Vec<String>,
    pub error_handling: Vec<String>,
    pub quick_start: Vec<String>,
}

/// Analysis parameters
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalysisParams {
    /// Minimum code blocks for full score
    pub min_code_blocks_for_full_score: usize,

    /// Minimum sections for full score
    pub min_sections_for_full_score: usize,

    /// Ideal average line length minimum
    pub ideal_avg_line_length_min: usize,

    /// Ideal average line length maximum
    pub ideal_avg_line_length_max: usize,

    /// Recent update threshold in days
    pub recent_update_days: i64,

    /// Active update threshold in days
    pub active_update_days: i64,
}

/// Stars thresholds for community activity
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StarsThresholds {
    pub excellent: u32,
    pub good: u32,
    pub fair: u32,
}

impl ScoringConfig {
    /// Load configuration from JSON file
    pub fn load_from_file<P: AsRef<Path>>(path: P) -> Result<Self, AnalyzerError> {
        let content = fs::read_to_string(path.as_ref()).map_err(|e| {
            AnalyzerError::ConfigError(format!(
                "Failed to read config file '{}': {}",
                path.as_ref().display(),
                e
            ))
        })?;

        let config: ScoringConfig = serde_json::from_str(&content).map_err(|e| {
            AnalyzerError::ConfigError(format!("Failed to parse config JSON: {}", e))
        })?;

        Ok(config)
    }

    /// Load default configuration from embedded resource
    pub fn load_default() -> Result<Self, AnalyzerError> {
        // Try to load from the standard config location
        let config_path = std::env::current_dir()
            .map_err(|e| AnalyzerError::ConfigError(format!("Failed to get current dir: {}", e)))?
            .join("config/scoring_weights.json");

        if config_path.exists() {
            Self::load_from_file(config_path)
        } else {
            // If not found, use embedded default config
            Self::embedded_default()
        }
    }

    /// Get embedded default configuration
    fn embedded_default() -> Result<Self, AnalyzerError> {
        // Embedded default config for fallback
        let default_json = r#"{
  "version": "1.0",
  "description": "Skills 质量评分权重配置",
  "weights": {
    "content_quality": {
      "total": 50,
      "clarity": 13,
      "technical_depth": 19,
      "documentation": 13,
      "actionability": 5
    },
    "technical_implementation": {
      "total": 30,
      "code_quality": 15,
      "pattern_design": 10,
      "error_handling": 5
    },
    "maintenance": {
      "total": 10,
      "update_frequency": 3,
      "community_activity": 5,
      "compatibility": 2
    },
    "user_experience": {
      "total": 10,
      "ease_of_use": 5,
      "readability": 5
    }
  },
  "grade_thresholds": {
    "S": 90,
    "A": 80,
    "B": 70,
    "C": 60,
    "D": 0
  },
  "keywords": {
    "when_to_use": ["when to use", "use when", "usage scenario", "适用场景"],
    "best_practices": ["best practice", "recommended", "should", "最佳实践"],
    "security": ["validate", "sanitize", "escape", "auth", "security", "安全"],
    "patterns": ["factory", "singleton", "observer", "middleware", "decorator", "strategy"],
    "error_handling": ["error", "exception", "try", "catch", "handling", "错误处理"],
    "quick_start": ["quick start", "getting started", "快速开始", "入门"]
  },
  "analysis": {
    "min_code_blocks_for_full_score": 5,
    "min_sections_for_full_score": 6,
    "ideal_avg_line_length_min": 40,
    "ideal_avg_line_length_max": 100,
    "recent_update_days": 90,
    "active_update_days": 180
  },
  "stars_thresholds": {
    "excellent": 10000,
    "good": 1000,
    "fair": 100
  }
}"#;

        let config: ScoringConfig = serde_json::from_str(default_json)
            .map_err(|e| AnalyzerError::ConfigError(format!("Failed to parse embedded config: {}", e)))?;

        Ok(config)
    }

    /// Check if a keyword list contains any of the keywords (case-insensitive)
    pub fn check_keywords(&self, text: &str, keyword_type: &str) -> bool {
        let text_lower = text.to_lowercase();
        let keywords = match keyword_type {
            "when_to_use" => &self.keywords.when_to_use,
            "best_practices" => &self.keywords.best_practices,
            "security" => &self.keywords.security,
            "patterns" => &self.keywords.patterns,
            "error_handling" => &self.keywords.error_handling,
            "quick_start" => &self.keywords.quick_start,
            _ => return false,
        };

        keywords.iter().any(|kw| text_lower.contains(&kw.to_lowercase()))
    }
}

impl Default for ScoringConfig {
    fn default() -> Self {
        Self::embedded_default().unwrap_or_else(|_| {
            // Absolute fallback if even embedded config fails
            ScoringConfig {
                version: "1.0".to_string(),
                description: "Default scoring configuration".to_string(),
                weights: ScoringWeights {
                    content_quality: ContentQualityWeights {
                        total: 50,
                        clarity: 13,
                        technical_depth: 19,
                        documentation: 13,
                        actionability: 5,
                    },
                    technical_implementation: TechnicalImplementationWeights {
                        total: 30,
                        code_quality: 15,
                        pattern_design: 10,
                        error_handling: 5,
                    },
                    maintenance: MaintenanceWeights {
                        total: 10,
                        update_frequency: 3,
                        community_activity: 5,
                        compatibility: 2,
                    },
                    user_experience: UserExperienceWeights {
                        total: 10,
                        ease_of_use: 5,
                        readability: 5,
                    },
                },
                grade_thresholds: GradeThresholds {
                    s: 90,
                    a: 80,
                    b: 70,
                    c: 60,
                    d: 0,
                },
                keywords: Keywords {
                    when_to_use: vec!["when to use".to_string()],
                    best_practices: vec!["best practice".to_string()],
                    security: vec!["security".to_string()],
                    patterns: vec!["pattern".to_string()],
                    error_handling: vec!["error".to_string()],
                    quick_start: vec!["quick start".to_string()],
                },
                analysis: AnalysisParams {
                    min_code_blocks_for_full_score: 5,
                    min_sections_for_full_score: 6,
                    ideal_avg_line_length_min: 40,
                    ideal_avg_line_length_max: 100,
                    recent_update_days: 90,
                    active_update_days: 180,
                },
                stars_thresholds: StarsThresholds {
                    excellent: 10000,
                    good: 1000,
                    fair: 100,
                },
            }
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_load_default_config() {
        let config = ScoringConfig::default();
        assert_eq!(config.version, "1.0");
        assert_eq!(config.weights.content_quality.total, 50);
        assert_eq!(config.weights.technical_implementation.total, 30);
        assert_eq!(config.weights.maintenance.total, 10);
        assert_eq!(config.weights.user_experience.total, 10);
    }

    #[test]
    fn test_keyword_checking() {
        let config = ScoringConfig::default();

        assert!(config.check_keywords("This section explains when to use this skill", "when_to_use"));
        assert!(config.check_keywords("Follow these best practices", "best_practices"));
        assert!(config.check_keywords("Always validate user input for security", "security"));
        assert!(!config.check_keywords("Some random text", "when_to_use"));
    }

    #[test]
    fn test_weights_sum_to_100() {
        let config = ScoringConfig::default();
        let total = config.weights.content_quality.total
            + config.weights.technical_implementation.total
            + config.weights.maintenance.total
            + config.weights.user_experience.total;
        assert_eq!(total, 100);
    }
}
