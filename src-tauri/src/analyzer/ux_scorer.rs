// User Experience Scorer (10 points total)
//
// This module evaluates the user experience quality of skills,
// focusing on ease of use and readability.
//
// Scoring breakdown:
// - Ease of Use (5 points): Quick start, examples, simplicity
// - Readability (5 points): Structure, formatting, clarity
//
// Reference: ~/workspace/ordinary-claude-skills/tools/analyzer/ux_scorer.py

use crate::analyzer::config::ScoringConfig;
use crate::analyzer::skill_document::SkillDocument;
use crate::analyzer::types::UxScore;
use crate::analyzer::utils::calculate_readability_score;

pub struct UxScorer {
    config: ScoringConfig,
}

impl UxScorer {
    pub fn new(config: ScoringConfig) -> Self {
        Self { config }
    }

    /// Calculate total UX score (max 10 points)
    pub fn score(&self, doc: &SkillDocument) -> UxScore {
        let ease_of_use = self.score_ease_of_use(doc);
        let readability = self.score_readability(doc);

        let total = ease_of_use + readability;

        UxScore {
            total,
            ease_of_use,
            readability,
        }
    }

    /// Score ease of use (max 5 points)
    fn score_ease_of_use(&self, doc: &SkillDocument) -> f64 {
        let mut score: f64 = 0.0;

        // Has quick start section (2 points)
        if doc.check_keywords(&self.config.keywords.quick_start) {
            score += 2.0;
        }

        // Has code examples (1 point)
        if doc.code_blocks_count() > 0 {
            score += 1.0;
        }

        // Has step-by-step instructions (1 point)
        if doc.has_step_by_step() {
            score += 1.0;
        }

        // Has use cases (1 point)
        if !doc.extract_use_cases().is_empty() {
            score += 1.0;
        }

        score.min(5.0)
    }

    /// Score readability (max 5 points)
    fn score_readability(&self, doc: &SkillDocument) -> f64 {
        let avg_line_length = doc.avg_line_length();
        let sections_count = doc.sections_count();

        // Use the utility function for base readability score (max 5 points)
        let base_score = calculate_readability_score(&doc.content, avg_line_length, sections_count);

        base_score.min(5.0)
    }

    /// Analyze UX factors for detailed reporting
    pub fn analyze_ux(&self, doc: &SkillDocument) -> UxAnalysis {
        let has_quick_start = doc.check_keywords(&self.config.keywords.quick_start);
        let has_examples = doc.code_blocks_count() > 0;
        let has_step_by_step = doc.has_step_by_step();
        let has_use_cases = !doc.extract_use_cases().is_empty();
        let avg_line_length = doc.avg_line_length();
        let sections_count = doc.sections_count();
        let is_well_structured = doc.is_well_structured();

        UxAnalysis {
            has_quick_start,
            has_examples,
            has_step_by_step,
            has_use_cases,
            avg_line_length,
            sections_count,
            is_well_structured,
        }
    }
}

impl Default for UxScorer {
    fn default() -> Self {
        Self::new(ScoringConfig::default())
    }
}

/// UX analysis results
#[derive(Debug, Clone)]
pub struct UxAnalysis {
    pub has_quick_start: bool,
    pub has_examples: bool,
    pub has_step_by_step: bool,
    pub has_use_cases: bool,
    pub avg_line_length: f64,
    pub sections_count: usize,
    pub is_well_structured: bool,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_document() -> SkillDocument {
        let content = r#"---
name: ux-test
version: 1.0.0
---

# UX Test Skill

## Quick Start

Follow these simple steps:

1. Install the package
2. Configure settings
3. Run the command

## When to Use

- Use case 1
- Use case 2

## Example

```bash
npm install skill-package
```

## Features

- Easy to use
- Well documented
- Fast performance

## API Reference

Detailed API documentation here.
"#;

        SkillDocument::from_string(content, "test.md".to_string()).unwrap()
    }

    #[test]
    fn test_ux_scorer() {
        let scorer = UxScorer::default();
        let doc = create_test_document();

        let score = scorer.score(&doc);

        assert!(score.total > 0.0);
        assert!(score.total <= 10.0);
        assert!(score.ease_of_use > 0.0);
        assert!(score.readability > 0.0);
    }

    #[test]
    fn test_ease_of_use_scoring() {
        let scorer = UxScorer::default();
        let doc = create_test_document();

        let ease_score = scorer.score_ease_of_use(&doc);

        // Should have quick start, examples, step-by-step, and use cases
        assert!(ease_score >= 4.0);
        assert!(ease_score <= 5.0);
    }

    #[test]
    fn test_readability_scoring() {
        let scorer = UxScorer::default();
        let doc = create_test_document();

        let read_score = scorer.score_readability(&doc);

        assert!(read_score > 0.0);
        assert!(read_score <= 5.0);
    }

    #[test]
    fn test_ux_analysis() {
        let scorer = UxScorer::default();
        let doc = create_test_document();

        let analysis = scorer.analyze_ux(&doc);

        assert!(analysis.has_quick_start);
        assert!(analysis.has_examples);
        assert!(analysis.has_step_by_step);
        assert!(analysis.has_use_cases);
        assert!(analysis.sections_count > 0);
    }
}
