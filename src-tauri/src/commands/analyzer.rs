// Tauri Commands for Skill Quality Analysis
//
// This module exposes the skill analyzer functionality to the frontend
// through Tauri's command system.

use crate::analyzer::{SkillAnalyzer, SkillScore};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// Error type for Tauri commands (must be serializable)
#[derive(Debug, Serialize, Deserialize)]
pub struct AnalyzerCommandError {
    pub message: String,
}

impl From<crate::analyzer::AnalyzerError> for AnalyzerCommandError {
    fn from(error: crate::analyzer::AnalyzerError) -> Self {
        AnalyzerCommandError {
            message: error.to_string(),
        }
    }
}

/// Analyze a single skill file and return quality score
///
/// # Arguments
/// * `skill_path` - Path to the SKILL.md file
///
/// # Returns
/// * `Result<SkillScore, AnalyzerCommandError>` - Skill quality score or error
#[tauri::command]
pub async fn analyze_skill_quality(
    skill_path: String,
) -> Result<SkillScore, AnalyzerCommandError> {
    // Create analyzer
    let analyzer = SkillAnalyzer::with_default_config()
        .map_err(|e| AnalyzerCommandError::from(e))?;

    // Analyze the skill
    let path = PathBuf::from(skill_path);
    let score = analyzer
        .analyze_file(&path)
        .map_err(|e| AnalyzerCommandError::from(e))?;

    Ok(score)
}

/// Batch analyze multiple skill files
///
/// # Arguments
/// * `skill_paths` - Vector of paths to SKILL.md files
///
/// # Returns
/// * `Result<Vec<SkillScore>, AnalyzerCommandError>` - Vector of skill scores
#[tauri::command]
pub async fn batch_analyze_skills(
    skill_paths: Vec<String>,
) -> Result<Vec<SkillScore>, AnalyzerCommandError> {
    // Create analyzer
    let analyzer = SkillAnalyzer::with_default_config()
        .map_err(|e| AnalyzerCommandError::from(e))?;

    // Convert strings to PathBuf
    let paths: Vec<PathBuf> = skill_paths.iter().map(|s| PathBuf::from(s)).collect();

    // Analyze all skills
    let results = analyzer.batch_analyze(&paths);

    // Collect successful results, skip errors
    let scores: Vec<SkillScore> = results
        .into_iter()
        .filter_map(|result| result.ok())
        .collect();

    Ok(scores)
}

/// Batch analyze skills with detailed results including errors
///
/// # Arguments
/// * `skill_paths` - Vector of paths to SKILL.md files
///
/// # Returns
/// * `BatchAnalysisResult` - Contains both successful scores and errors
#[tauri::command]
pub async fn batch_analyze_skills_detailed(
    skill_paths: Vec<String>,
) -> Result<BatchAnalysisResult, AnalyzerCommandError> {
    // Create analyzer
    let analyzer = SkillAnalyzer::with_default_config()
        .map_err(|e| AnalyzerCommandError::from(e))?;

    // Convert strings to PathBuf
    let paths: Vec<PathBuf> = skill_paths.iter().map(|s| PathBuf::from(s)).collect();

    // Analyze all skills
    let results = analyzer.batch_analyze(&paths);

    let mut scores = Vec::new();
    let mut errors = Vec::new();

    for (i, result) in results.into_iter().enumerate() {
        match result {
            Ok(score) => scores.push(score),
            Err(e) => errors.push(AnalysisError {
                path: skill_paths[i].clone(),
                error: e.to_string(),
            }),
        }
    }

    Ok(BatchAnalysisResult {
        scores,
        errors,
        total: skill_paths.len(),
        successful: scores.len(),
        failed: errors.len(),
    })
}

/// Result of batch analysis with details
#[derive(Debug, Serialize, Deserialize)]
pub struct BatchAnalysisResult {
    /// Successfully analyzed skills
    pub scores: Vec<SkillScore>,

    /// Analysis errors
    pub errors: Vec<AnalysisError>,

    /// Total number of skills analyzed
    pub total: usize,

    /// Number of successful analyses
    pub successful: usize,

    /// Number of failed analyses
    pub failed: usize,
}

/// Individual analysis error
#[derive(Debug, Serialize, Deserialize)]
pub struct AnalysisError {
    /// Path to the skill that failed
    pub path: String,

    /// Error message
    pub error: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::io::Write;
    use tempfile::TempDir;

    fn create_test_skill_file(dir: &TempDir, name: &str, content: &str) -> PathBuf {
        let file_path = dir.path().join(name);
        let mut file = fs::File::create(&file_path).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file_path
    }

    #[tokio::test]
    async fn test_analyze_skill_quality() {
        let temp_dir = TempDir::new().unwrap();
        let content = r#"---
name: test-skill
version: 1.0.0
---

# Test Skill

## When to Use

- Use case 1

```rust
fn main() {}
```
"#;

        let file_path = create_test_skill_file(&temp_dir, "SKILL.md", content);

        let result = analyze_skill_quality(file_path.to_string_lossy().to_string()).await;
        assert!(result.is_ok());

        let score = result.unwrap();
        assert!(score.total_score > 0.0);
        assert!(score.total_score <= 100.0);
    }

    #[tokio::test]
    async fn test_batch_analyze_skills() {
        let temp_dir = TempDir::new().unwrap();

        let skill1 = create_test_skill_file(
            &temp_dir,
            "skill1.md",
            "---\nname: skill1\n---\n# Skill 1\n```rust\nfn main() {}\n```",
        );

        let skill2 = create_test_skill_file(
            &temp_dir,
            "skill2.md",
            "---\nname: skill2\n---\n# Skill 2\n```python\nprint('hi')\n```",
        );

        let paths = vec![
            skill1.to_string_lossy().to_string(),
            skill2.to_string_lossy().to_string(),
        ];

        let result = batch_analyze_skills(paths).await;
        assert!(result.is_ok());

        let scores = result.unwrap();
        assert_eq!(scores.len(), 2);
    }

    #[tokio::test]
    async fn test_batch_analyze_detailed_with_errors() {
        let temp_dir = TempDir::new().unwrap();

        let valid_skill = create_test_skill_file(
            &temp_dir,
            "valid.md",
            "---\nname: valid\n---\n# Valid Skill\n```rust\nfn main() {}\n```",
        );

        let paths = vec![
            valid_skill.to_string_lossy().to_string(),
            "/nonexistent/skill.md".to_string(),
        ];

        let result = batch_analyze_skills_detailed(paths).await;
        assert!(result.is_ok());

        let batch_result = result.unwrap();
        assert_eq!(batch_result.total, 2);
        assert_eq!(batch_result.successful, 1);
        assert_eq!(batch_result.failed, 1);
        assert_eq!(batch_result.scores.len(), 1);
        assert_eq!(batch_result.errors.len(), 1);
    }
}
