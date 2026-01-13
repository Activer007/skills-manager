// Skill Analyzer - Main coordinator for skill quality analysis
//
// This module orchestrates all scoring components to produce a comprehensive
// skill quality assessment with actionable improvement suggestions.
//
// Reference: ~/workspace/ordinary-claude-skills/tools/analyzer/skill_analyzer.py

use crate::analyzer::config::ScoringConfig;
use crate::analyzer::content_scorer::ContentScorer;
use crate::analyzer::maintenance_scorer::MaintenanceScorer;
use crate::analyzer::skill_document::SkillDocument;
use crate::analyzer::technical_scorer::TechnicalScorer;
use crate::analyzer::ux_scorer::UxScorer;
use crate::analyzer::{AnalyzerError, ScoreMetadata, SkillScore};
use chrono::Utc;
use std::path::Path;

const ANALYZER_VERSION: &str = "1.0.0";

pub struct SkillAnalyzer {
    config: ScoringConfig,
    content_scorer: ContentScorer,
    technical_scorer: TechnicalScorer,
    maintenance_scorer: MaintenanceScorer,
    ux_scorer: UxScorer,
}

impl SkillAnalyzer {
    /// Create a new skill analyzer with custom configuration
    pub fn new(config: ScoringConfig) -> Self {
        let content_scorer = ContentScorer::new(config.clone());
        let technical_scorer = TechnicalScorer::new(config.clone());
        let maintenance_scorer = MaintenanceScorer::new(config.clone());
        let ux_scorer = UxScorer::new(config.clone());

        Self {
            config,
            content_scorer,
            technical_scorer,
            maintenance_scorer,
            ux_scorer,
        }
    }

    /// Create a new analyzer with default configuration
    pub fn with_default_config() -> Result<Self, AnalyzerError> {
        let config = ScoringConfig::load_default()?;
        Ok(Self::new(config))
    }

    /// Analyze a skill from a file path
    pub fn analyze_file<P: AsRef<Path>>(&self, path: P) -> Result<SkillScore, AnalyzerError> {
        let doc = SkillDocument::from_file(path)?;
        self.analyze_document(&doc)
    }

    /// Analyze a skill from a document object
    pub fn analyze_document(&self, doc: &SkillDocument) -> Result<SkillScore, AnalyzerError> {
        // Score all dimensions
        let content_score = self.content_scorer.score(doc);
        let technical_score = self.technical_scorer.score(doc);
        let maintenance_score = self.maintenance_scorer.score(doc);
        let ux_score = self.ux_scorer.score(doc);

        // Generate improvement suggestions
        let suggestions = self.generate_suggestions(doc, &content_score, &technical_score, &maintenance_score, &ux_score);

        // Create metadata
        let metadata = ScoreMetadata {
            skill_name: doc.get_skill_name(),
            version: doc.metadata.version.clone(),
            author: doc.metadata.author.clone(),
            analyzed_at: Utc::now().to_rfc3339(),
            analyzer_version: ANALYZER_VERSION.to_string(),
        };

        // Create final score
        let skill_score = SkillScore::new(
            content_score,
            technical_score,
            maintenance_score,
            ux_score,
            suggestions,
            metadata,
        );

        Ok(skill_score)
    }

    /// Generate actionable improvement suggestions based on scores
    fn generate_suggestions(
        &self,
        doc: &SkillDocument,
        content: &crate::analyzer::types::ContentScore,
        technical: &crate::analyzer::types::TechnicalScore,
        maintenance: &crate::analyzer::types::MaintenanceScore,
        ux: &crate::analyzer::types::UxScore,
    ) -> Vec<String> {
        let mut suggestions = Vec::new();

        // Content quality suggestions
        if !content.clarity.has_when_to_use {
            suggestions.push("添加 'When to Use' 章节，明确说明技能的适用场景".to_string());
        }

        if content.clarity.use_cases_count < 3 {
            suggestions.push(format!(
                "增加使用场景示例（当前 {} 个，建议至少 3 个）",
                content.clarity.use_cases_count
            ));
        }

        if !content.technical_depth.has_best_practices {
            suggestions.push("添加最佳实践说明，提升技术深度".to_string());
        }

        if content.technical_depth.code_examples_count < self.config.analysis.min_code_blocks_for_full_score {
            suggestions.push(format!(
                "增加代码示例（当前 {} 个，建议至少 {} 个）",
                content.technical_depth.code_examples_count,
                self.config.analysis.min_code_blocks_for_full_score
            ));
        }

        if !content.technical_depth.has_io_examples {
            suggestions.push("添加输入/输出示例，提高可操作性".to_string());
        }

        if !content.documentation.has_quick_start {
            suggestions.push("添加 'Quick Start' 或 '快速开始' 章节".to_string());
        }

        if content.documentation.sections_count < self.config.analysis.min_sections_for_full_score {
            suggestions.push(format!(
                "完善文档结构（当前 {} 个章节，建议至少 {} 个）",
                content.documentation.sections_count,
                self.config.analysis.min_sections_for_full_score
            ));
        }

        // Technical quality suggestions
        if technical.code_quality.language_diversity < 2 {
            suggestions.push("增加多语言代码示例，提升适用范围".to_string());
        }

        if !technical.code_quality.has_security_keywords {
            suggestions.push("添加安全性相关说明（如输入验证、权限控制等）".to_string());
        }

        if !content.technical_depth.has_patterns {
            suggestions.push("说明相关的设计模式或架构方案".to_string());
        }

        if technical.error_handling < 3.0 {
            suggestions.push("完善错误处理和异常情况说明".to_string());
        }

        // Maintenance suggestions
        if let Some(days) = maintenance.last_update_days {
            if days > self.config.analysis.active_update_days {
                suggestions.push(format!(
                    "技能已 {} 天未更新，建议检查内容时效性",
                    days
                ));
            }
        }

        if doc.metadata.version.is_none() {
            suggestions.push("添加版本号信息".to_string());
        }

        // UX suggestions
        if !doc.has_step_by_step() {
            suggestions.push("添加分步指导，提升易用性".to_string());
        }

        let avg_len = content.documentation.avg_line_length;
        if avg_len < 20.0 {
            suggestions.push("增加描述性文字，提高内容详细度".to_string());
        } else if avg_len > 120.0 {
            suggestions.push("优化行长度，建议将长段落拆分为多个短段".to_string());
        }

        // Priority suggestions based on low scores
        if content.total < 30.0 {
            suggestions.insert(0, "⚠️ 内容质量较低，建议优先完善文档内容和示例".to_string());
        }

        if technical.total < 15.0 {
            suggestions.insert(0, "⚠️ 技术实现评分较低，建议增加代码示例和技术细节".to_string());
        }

        suggestions
    }

    /// Batch analyze multiple skills
    pub fn batch_analyze<P: AsRef<Path>>(&self, paths: &[P]) -> Vec<Result<SkillScore, AnalyzerError>> {
        paths.iter().map(|path| self.analyze_file(path)).collect()
    }

    /// Get a summary of score distribution
    pub fn get_score_summary(&self, score: &SkillScore) -> ScoreSummary {
        ScoreSummary {
            total_score: score.total_score,
            grade: score.grade.clone(),
            content_percentage: (score.content_score.total / 50.0 * 100.0),
            technical_percentage: (score.technical_score.total / 30.0 * 100.0),
            maintenance_percentage: (score.maintenance_score.total / 10.0 * 100.0),
            ux_percentage: (score.ux_score.total / 10.0 * 100.0),
            strengths: self.identify_strengths(score),
            weaknesses: self.identify_weaknesses(score),
        }
    }

    /// Identify strengths (scores above 80% in their category)
    fn identify_strengths(&self, score: &SkillScore) -> Vec<String> {
        let mut strengths = Vec::new();

        if score.content_score.total / 50.0 >= 0.8 {
            strengths.push("内容质量优秀".to_string());
        }

        if score.technical_score.total / 30.0 >= 0.8 {
            strengths.push("技术实现优秀".to_string());
        }

        if score.maintenance_score.total / 10.0 >= 0.8 {
            strengths.push("维护性良好".to_string());
        }

        if score.ux_score.total / 10.0 >= 0.8 {
            strengths.push("用户体验优秀".to_string());
        }

        strengths
    }

    /// Identify weaknesses (scores below 60% in their category)
    fn identify_weaknesses(&self, score: &SkillScore) -> Vec<String> {
        let mut weaknesses = Vec::new();

        if score.content_score.total / 50.0 < 0.6 {
            weaknesses.push("内容质量需要改进".to_string());
        }

        if score.technical_score.total / 30.0 < 0.6 {
            weaknesses.push("技术实现需要加强".to_string());
        }

        if score.maintenance_score.total / 10.0 < 0.6 {
            weaknesses.push("维护性需要提升".to_string());
        }

        if score.ux_score.total / 10.0 < 0.6 {
            weaknesses.push("用户体验需要优化".to_string());
        }

        weaknesses
    }
}

impl Default for SkillAnalyzer {
    fn default() -> Self {
        Self::with_default_config().unwrap_or_else(|_| {
            Self::new(ScoringConfig::default())
        })
    }
}

/// Score summary for reporting
#[derive(Debug, Clone)]
pub struct ScoreSummary {
    pub total_score: f64,
    pub grade: String,
    pub content_percentage: f64,
    pub technical_percentage: f64,
    pub maintenance_percentage: f64,
    pub ux_percentage: f64,
    pub strengths: Vec<String>,
    pub weaknesses: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_comprehensive_test_document() -> SkillDocument {
        let content = r#"---
name: comprehensive-skill
description: A comprehensive test skill
author: Test Author
version: 2.0.0
last_updated: "2026-01-10T00:00:00Z"
---

# Comprehensive Test Skill

A well-documented skill with all the features.

## When to Use

- Use when you need feature X
- Use for implementing pattern Y
- Ideal for scenarios involving Z
- Perfect for automating task W

## Quick Start

1. Install the package
2. Configure settings
3. Run the initial setup
4. Start using the skill

## Best Practices

Follow these recommended practices:
- Always validate and sanitize user input for security
- Use the factory pattern for object creation
- Implement proper error handling with try-catch
- Follow the singleton pattern for configuration

## Examples

### Rust Example

Input: User data object
Output: Validated and sanitized data

```rust
use validator::Validate;

fn validate_user_data(data: &UserData) -> Result<(), ValidationError> {
    data.validate()?;
    Ok(())
}
```

### Python Example

```python
def sanitize_input(user_input):
    """Sanitize user input for security"""
    try:
        return escape(user_input.strip())
    except Exception as e:
        logger.error(f"Sanitization error: {e}")
        raise
```

### JavaScript Example

```javascript
function handleError(error) {
    console.error('Error occurred:', error);
    throw new Error('Processing failed');
}
```

## API Reference

Detailed API documentation here.

## Compatibility

Compatible with all versions >= 1.0.0.
Requires Node.js 18+ or Python 3.8+.

## Contributing

See CONTRIBUTING.md for details.
"#;

        SkillDocument::from_string(content, "test.md".to_string()).unwrap()
    }

    #[test]
    fn test_skill_analyzer() {
        let analyzer = SkillAnalyzer::default();
        let doc = create_comprehensive_test_document();

        let result = analyzer.analyze_document(&doc);
        assert!(result.is_ok());

        let score = result.unwrap();
        assert!(score.total_score > 0.0);
        assert!(score.total_score <= 100.0);

        println!("Total Score: {}", score.total_score);
        println!("Grade: {}", score.grade);
        println!("Suggestions: {:?}", score.suggestions);
    }

    #[test]
    fn test_score_components() {
        let analyzer = SkillAnalyzer::default();
        let doc = create_comprehensive_test_document();

        let score = analyzer.analyze_document(&doc).unwrap();

        // All components should have positive scores
        assert!(score.content_score.total > 0.0);
        assert!(score.technical_score.total > 0.0);
        assert!(score.maintenance_score.total > 0.0);
        assert!(score.ux_score.total > 0.0);

        // Total should equal sum of components
        let sum = score.content_score.total
            + score.technical_score.total
            + score.maintenance_score.total
            + score.ux_score.total;

        assert!((score.total_score - sum).abs() < 0.01);
    }

    #[test]
    fn test_score_summary() {
        let analyzer = SkillAnalyzer::default();
        let doc = create_comprehensive_test_document();

        let score = analyzer.analyze_document(&doc).unwrap();
        let summary = analyzer.get_score_summary(&score);

        assert_eq!(summary.total_score, score.total_score);
        assert_eq!(summary.grade, score.grade);
        assert!(summary.content_percentage >= 0.0 && summary.content_percentage <= 100.0);
        assert!(summary.technical_percentage >= 0.0 && summary.technical_percentage <= 100.0);
    }

    #[test]
    fn test_suggestions_generation() {
        let analyzer = SkillAnalyzer::default();
        let minimal_content = r#"---
name: minimal-skill
---

# Minimal Skill

Just a title.
"#;

        let doc = SkillDocument::from_string(minimal_content, "minimal.md".to_string()).unwrap();
        let score = analyzer.analyze_document(&doc).unwrap();

        // Minimal skill should have many suggestions
        assert!(score.suggestions.len() > 5);
    }

    #[test]
    fn test_high_quality_skill() {
        let analyzer = SkillAnalyzer::default();
        let doc = create_comprehensive_test_document();

        let score = analyzer.analyze_document(&doc).unwrap();

        // Comprehensive skill should score reasonably well
        assert!(score.total_score >= 60.0);
        assert!(score.grade == "A" || score.grade == "B" || score.grade == "S");
    }
}
