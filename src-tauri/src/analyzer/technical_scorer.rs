// Technical Implementation Scorer (30 points total)
//
// This module evaluates the technical quality of skill implementations,
// focusing on code examples, design patterns, and error handling.
//
// Scoring breakdown:
// - Code Quality (15 points): Code block count, language diversity, security practices
// - Pattern Design (10 points): Design patterns, architecture, best practices
// - Error Handling (5 points): Error handling patterns, validation, edge cases
//
// Reference: ~/workspace/ordinary-claude-skills/tools/analyzer/technical_scorer.py

use crate::analyzer::config::ScoringConfig;
use crate::analyzer::skill_document::SkillDocument;
use crate::analyzer::types::{CodeQualityScore, TechnicalScore};

pub struct TechnicalScorer {
    config: ScoringConfig,
}

impl TechnicalScorer {
    pub fn new(config: ScoringConfig) -> Self {
        Self { config }
    }

    /// Calculate total technical implementation score (max 30 points)
    pub fn score(&self, doc: &SkillDocument) -> TechnicalScore {
        let code_quality = self.score_code_quality(doc);
        let pattern_design = self.score_pattern_design(doc);
        let error_handling = self.score_error_handling(doc);

        let total = code_quality.total + pattern_design + error_handling;

        TechnicalScore {
            total,
            code_quality,
            pattern_design,
            error_handling,
        }
    }

    /// Score code example quality (max 15 points)
    fn score_code_quality(&self, doc: &SkillDocument) -> CodeQualityScore {
        let mut score = 0.0;

        // Code blocks count (8 points)
        let code_blocks_count = doc.code_blocks_count();
        let min_for_full = self.config.analysis.min_code_blocks_for_full_score;
        let code_count_score = if code_blocks_count >= min_for_full {
            8.0
        } else if code_blocks_count >= 3 {
            6.0
        } else if code_blocks_count >= 2 {
            4.0
        } else if code_blocks_count >= 1 {
            2.0
        } else {
            0.0
        };
        score += code_count_score;

        // Language diversity (4 points)
        let language_diversity = doc.language_diversity();
        let diversity_score = if language_diversity >= 3 {
            4.0
        } else if language_diversity >= 2 {
            3.0
        } else if language_diversity >= 1 {
            1.5
        } else {
            0.0
        };
        score += diversity_score;

        // Security keywords (3 points)
        let has_security_keywords = doc.check_keywords(&self.config.keywords.security);
        if has_security_keywords {
            score += 3.0;
        }

        CodeQualityScore {
            total: score.min(15.0),
            code_blocks_count,
            language_diversity,
            has_security_keywords,
        }
    }

    /// Score pattern design (max 10 points)
    fn score_pattern_design(&self, doc: &SkillDocument) -> f64 {
        let mut score = 0.0;

        // Design patterns mentioned (6 points)
        let has_patterns = doc.check_keywords(&self.config.keywords.patterns);
        if has_patterns {
            score += 6.0;
        }

        // Best practices (4 points)
        let has_best_practices = doc.check_keywords(&self.config.keywords.best_practices);
        if has_best_practices {
            score += 4.0;
        }

        score.min(10.0)
    }

    /// Score error handling (max 5 points)
    fn score_error_handling(&self, doc: &SkillDocument) -> f64 {
        let mut score = 0.0;

        // Error handling keywords (3 points)
        let has_error_handling = doc.check_keywords(&self.config.keywords.error_handling);
        if has_error_handling {
            score += 3.0;
        }

        // Security/validation (related to error handling) (2 points)
        let has_validation = doc.check_keywords(&self.config.keywords.security);
        if has_validation {
            score += 2.0;
        }

        score.min(5.0)
    }

    /// Analyze code block quality metrics
    pub fn analyze_code_blocks(&self, doc: &SkillDocument) -> CodeBlockAnalysis {
        let code_blocks = &doc.code_blocks;

        let total_blocks = code_blocks.len();
        let total_lines: usize = code_blocks.iter().map(|b| b.line_count).sum();
        let avg_lines_per_block = if total_blocks > 0 {
            total_lines as f64 / total_blocks as f64
        } else {
            0.0
        };

        let languages = doc.get_languages();

        // Check for inline code comments
        let blocks_with_comments = code_blocks
            .iter()
            .filter(|block| {
                block.content.contains("//")
                    || block.content.contains("#")
                    || block.content.contains("/*")
            })
            .count();

        CodeBlockAnalysis {
            total_blocks,
            total_lines,
            avg_lines_per_block,
            languages,
            blocks_with_comments,
        }
    }
}

impl Default for TechnicalScorer {
    fn default() -> Self {
        Self::new(ScoringConfig::default())
    }
}

/// Code block analysis results
#[derive(Debug, Clone)]
pub struct CodeBlockAnalysis {
    pub total_blocks: usize,
    pub total_lines: usize,
    pub avg_lines_per_block: f64,
    pub languages: Vec<String>,
    pub blocks_with_comments: usize,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::analyzer::skill_document::SkillDocument;

    fn create_test_document() -> SkillDocument {
        let content = r#"---
name: technical-test
version: 1.0.0
---

# Technical Skill

## Implementation

This skill follows the factory pattern and uses proper error handling.
Always validate user input for security.

## Examples

```rust
// Rust example with error handling
fn process(input: &str) -> Result<String, Error> {
    if input.is_empty() {
        return Err(Error::InvalidInput);
    }
    Ok(input.to_uppercase())
}
```

```python
# Python example with validation
def validate_data(data):
    if not data:
        raise ValueError("Invalid data")
    return sanitize(data)
```

```javascript
// JavaScript with try-catch
try {
    processData(input);
} catch (error) {
    console.error("Error:", error);
}
```

## Best Practices

- Use the singleton pattern for configuration
- Implement proper exception handling
- Sanitize all user inputs
"#;

        SkillDocument::from_string(content, "test.md".to_string()).unwrap()
    }

    #[test]
    fn test_technical_scorer() {
        let scorer = TechnicalScorer::default();
        let doc = create_test_document();

        let score = scorer.score(&doc);

        assert!(score.total > 0.0);
        assert!(score.total <= 30.0);

        // Check components
        assert!(score.code_quality.total > 0.0);
        assert!(score.pattern_design > 0.0);
        assert!(score.error_handling > 0.0);
    }

    #[test]
    fn test_code_quality_scoring() {
        let scorer = TechnicalScorer::default();
        let doc = create_test_document();

        let code_quality = scorer.score_code_quality(&doc);

        assert_eq!(code_quality.code_blocks_count, 3);
        assert_eq!(code_quality.language_diversity, 3);
        assert!(code_quality.has_security_keywords);
        assert!(code_quality.total <= 15.0);
    }

    #[test]
    fn test_pattern_design_scoring() {
        let scorer = TechnicalScorer::default();
        let doc = create_test_document();

        let pattern_score = scorer.score_pattern_design(&doc);

        assert!(pattern_score > 0.0);
        assert!(pattern_score <= 10.0);
    }

    #[test]
    fn test_error_handling_scoring() {
        let scorer = TechnicalScorer::default();
        let doc = create_test_document();

        let error_score = scorer.score_error_handling(&doc);

        assert!(error_score > 0.0);
        assert!(error_score <= 5.0);
    }

    #[test]
    fn test_code_block_analysis() {
        let scorer = TechnicalScorer::default();
        let doc = create_test_document();

        let analysis = scorer.analyze_code_blocks(&doc);

        assert_eq!(analysis.total_blocks, 3);
        assert!(analysis.total_lines > 0);
        assert!(analysis.avg_lines_per_block > 0.0);
        assert_eq!(analysis.languages.len(), 3);
        assert!(analysis.blocks_with_comments > 0);
    }
}
