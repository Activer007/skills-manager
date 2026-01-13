// Core data structures for the Skill Quality Analyzer
//
// This module defines all data types used throughout the skill scoring system.
// Migrated from Python implementation at ~/workspace/ordinary-claude-skills/tools/analyzer/

use serde::{Deserialize, Serialize};
use std::fmt;

/// Main skill score result containing all scoring dimensions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillScore {
    /// Total score (0-100)
    pub total_score: f64,

    /// Grade level: S(90+) / A(80+) / B(70+) / C(60+) / D(<60)
    pub grade: String,

    /// Content quality score (max 50 points)
    pub content_score: ContentScore,

    /// Technical implementation score (max 30 points)
    pub technical_score: TechnicalScore,

    /// Maintenance score (max 10 points)
    pub maintenance_score: MaintenanceScore,

    /// User experience score (max 10 points)
    pub ux_score: UxScore,

    /// Improvement suggestions
    pub suggestions: Vec<String>,

    /// Analysis metadata
    pub metadata: ScoreMetadata,
}

/// Content quality scoring (50 points total)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContentScore {
    /// Total content quality score
    pub total: f64,

    /// Instruction clarity (max 13 points)
    pub clarity: ClarityScore,

    /// Technical depth (max 19 points)
    pub technical_depth: TechnicalDepthScore,

    /// Documentation completeness (max 13 points)
    pub documentation: DocumentationScore,

    /// Actionability (max 5 points)
    pub actionability: f64,
}

/// Clarity scoring details (max 13 points)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClarityScore {
    pub total: f64,
    pub has_when_to_use: bool,
    pub use_cases_count: usize,
    pub scenario_clarity: f64,
}

/// Technical depth scoring details (max 19 points)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnicalDepthScore {
    pub total: f64,
    pub code_examples_count: usize,
    pub has_best_practices: bool,
    pub has_patterns: bool,
    pub has_io_examples: bool,
}

/// Documentation completeness scoring details (max 13 points)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentationScore {
    pub total: f64,
    pub sections_count: usize,
    pub has_quick_start: bool,
    pub avg_line_length: f64,
}

/// Technical implementation scoring (30 points total)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechnicalScore {
    /// Total technical score
    pub total: f64,

    /// Code example quality (max 15 points)
    pub code_quality: CodeQualityScore,

    /// Pattern design (max 10 points)
    pub pattern_design: f64,

    /// Error handling (max 5 points)
    pub error_handling: f64,
}

/// Code quality scoring details (max 15 points)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodeQualityScore {
    pub total: f64,
    pub code_blocks_count: usize,
    pub language_diversity: usize,
    pub has_security_keywords: bool,
}

/// Maintenance scoring (10 points total)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaintenanceScore {
    /// Total maintenance score
    pub total: f64,

    /// Update frequency (max 3 points)
    pub update_frequency: f64,

    /// Community activity (max 5 points)
    pub community_activity: f64,

    /// Compatibility (max 2 points)
    pub compatibility: f64,

    /// Last update information
    pub last_update_days: Option<i64>,
}

/// User experience scoring (10 points total)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UxScore {
    /// Total UX score
    pub total: f64,

    /// Ease of use (max 5 points)
    pub ease_of_use: f64,

    /// Readability (max 5 points)
    pub readability: f64,
}

/// Analysis metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreMetadata {
    /// Skill name
    pub skill_name: String,

    /// Skill version
    pub version: Option<String>,

    /// Author
    pub author: Option<String>,

    /// Analysis timestamp
    pub analyzed_at: String,

    /// Analyzer version
    pub analyzer_version: String,
}

/// Skill metadata parsed from YAML frontmatter
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillMetadata {
    pub name: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub version: Option<String>,
    pub tags: Option<Vec<String>>,
    pub last_updated: Option<String>,
}

/// Error types for the analyzer
#[derive(Debug)]
pub enum AnalyzerError {
    /// File not found or cannot be read
    FileReadError(String),

    /// Invalid YAML frontmatter
    YamlParseError(String),

    /// Invalid markdown structure
    MarkdownParseError(String),

    /// Configuration loading error
    ConfigError(String),

    /// Generic analysis error
    AnalysisError(String),
}

impl fmt::Display for AnalyzerError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AnalyzerError::FileReadError(msg) => write!(f, "File read error: {}", msg),
            AnalyzerError::YamlParseError(msg) => write!(f, "YAML parse error: {}", msg),
            AnalyzerError::MarkdownParseError(msg) => write!(f, "Markdown parse error: {}", msg),
            AnalyzerError::ConfigError(msg) => write!(f, "Configuration error: {}", msg),
            AnalyzerError::AnalysisError(msg) => write!(f, "Analysis error: {}", msg),
        }
    }
}

impl std::error::Error for AnalyzerError {}

impl SkillScore {
    /// Calculate grade based on total score
    pub fn calculate_grade(total_score: f64) -> String {
        if total_score >= 90.0 {
            "S".to_string()
        } else if total_score >= 80.0 {
            "A".to_string()
        } else if total_score >= 70.0 {
            "B".to_string()
        } else if total_score >= 60.0 {
            "C".to_string()
        } else {
            "D".to_string()
        }
    }

    /// Create a new skill score with calculated grade
    pub fn new(
        content_score: ContentScore,
        technical_score: TechnicalScore,
        maintenance_score: MaintenanceScore,
        ux_score: UxScore,
        suggestions: Vec<String>,
        metadata: ScoreMetadata,
    ) -> Self {
        let total_score = content_score.total
            + technical_score.total
            + maintenance_score.total
            + ux_score.total;

        let grade = Self::calculate_grade(total_score);

        Self {
            total_score,
            grade,
            content_score,
            technical_score,
            maintenance_score,
            ux_score,
            suggestions,
            metadata,
        }
    }
}

impl Default for SkillMetadata {
    fn default() -> Self {
        Self {
            name: String::new(),
            description: None,
            author: None,
            version: None,
            tags: None,
            last_updated: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_grade_calculation() {
        assert_eq!(SkillScore::calculate_grade(95.0), "S");
        assert_eq!(SkillScore::calculate_grade(85.0), "A");
        assert_eq!(SkillScore::calculate_grade(75.0), "B");
        assert_eq!(SkillScore::calculate_grade(65.0), "C");
        assert_eq!(SkillScore::calculate_grade(55.0), "D");
    }

    #[test]
    fn test_skill_score_creation() {
        let content = ContentScore {
            total: 40.0,
            clarity: ClarityScore {
                total: 10.0,
                has_when_to_use: true,
                use_cases_count: 3,
                scenario_clarity: 10.0,
            },
            technical_depth: TechnicalDepthScore {
                total: 15.0,
                code_examples_count: 5,
                has_best_practices: true,
                has_patterns: true,
                has_io_examples: true,
            },
            documentation: DocumentationScore {
                total: 10.0,
                sections_count: 6,
                has_quick_start: true,
                avg_line_length: 80.0,
            },
            actionability: 5.0,
        };

        let technical = TechnicalScore {
            total: 25.0,
            code_quality: CodeQualityScore {
                total: 13.0,
                code_blocks_count: 5,
                language_diversity: 2,
                has_security_keywords: true,
            },
            pattern_design: 8.0,
            error_handling: 4.0,
        };

        let maintenance = MaintenanceScore {
            total: 8.0,
            update_frequency: 3.0,
            community_activity: 4.0,
            compatibility: 1.0,
            last_update_days: Some(30),
        };

        let ux = UxScore {
            total: 8.0,
            ease_of_use: 4.0,
            readability: 4.0,
        };

        let metadata = ScoreMetadata {
            skill_name: "test-skill".to_string(),
            version: Some("1.0.0".to_string()),
            author: Some("Test Author".to_string()),
            analyzed_at: "2026-01-13T00:00:00Z".to_string(),
            analyzer_version: "1.0.0".to_string(),
        };

        let score = SkillScore::new(
            content,
            technical,
            maintenance,
            ux,
            vec![],
            metadata,
        );

        assert_eq!(score.total_score, 81.0);
        assert_eq!(score.grade, "A");
    }
}
