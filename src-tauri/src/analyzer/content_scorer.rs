// Content Quality Scorer (50 points total)
//
// This module implements the content quality scoring logic, the highest-weighted
// dimension in the skill quality assessment system.
//
// Scoring breakdown:
// - Clarity (13 points): Instruction clarity, use cases, scenario descriptions
// - Technical Depth (19 points): Code examples, best practices, patterns, I/O examples
// - Documentation (13 points): Section count, quick start, line length quality
// - Actionability (5 points): Step-by-step instructions, practical guidance
//
// Reference: ~/workspace/ordinary-claude-skills/tools/analyzer/content_scorer.py

use crate::analyzer::config::ScoringConfig;
use crate::analyzer::skill_document::SkillDocument;
use crate::analyzer::types::{
    ClarityScore, ContentScore, DocumentationScore, TechnicalDepthScore,
};

pub struct ContentScorer {
    config: ScoringConfig,
}

impl ContentScorer {
    pub fn new(config: ScoringConfig) -> Self {
        Self { config }
    }

    /// Calculate total content quality score (max 50 points)
    pub fn score(&self, doc: &SkillDocument) -> ContentScore {
        let clarity = self.score_clarity(doc);
        let technical_depth = self.score_technical_depth(doc);
        let documentation = self.score_documentation(doc);
        let actionability = self.score_actionability(doc);

        let total = clarity.total + technical_depth.total + documentation.total + actionability;

        ContentScore {
            total,
            clarity,
            technical_depth,
            documentation,
            actionability,
        }
    }

    /// Score instruction clarity (max 13 points)
    fn score_clarity(&self, doc: &SkillDocument) -> ClarityScore {
        let mut score: f64 = 0.0;

        // Check for "When to Use" section (5 points)
        let has_when_to_use = doc.check_keywords(&self.config.keywords.when_to_use);
        if has_when_to_use {
            score += 5.0;
        }

        // Count use cases (5 points)
        let use_cases = doc.extract_use_cases();
        let use_cases_count = use_cases.len();
        let use_case_score = if use_cases_count >= 5 {
            5.0
        } else if use_cases_count >= 3 {
            4.0
        } else if use_cases_count >= 2 {
            3.0
        } else if use_cases_count >= 1 {
            2.0
        } else {
            0.0
        };
        score += use_case_score;

        // Scenario clarity based on use case descriptions (3 points)
        let scenario_clarity = if use_cases_count > 0 {
            let avg_use_case_length: f64 = use_cases
                .iter()
                .map(|uc| uc.len())
                .sum::<usize>() as f64
                / use_cases_count as f64;

            // Good use cases should be descriptive (20-100 chars)
            if (20.0..=100.0).contains(&avg_use_case_length) {
                3.0
            } else if (10.0..=150.0).contains(&avg_use_case_length) {
                2.0
            } else {
                1.0
            }
        } else {
            0.0
        };
        score += scenario_clarity;

        ClarityScore {
            total: score.min(13.0),
            has_when_to_use,
            use_cases_count,
            scenario_clarity,
        }
    }

    /// Score technical depth (max 19 points)
    fn score_technical_depth(&self, doc: &SkillDocument) -> TechnicalDepthScore {
        let mut score: f64 = 0.0;

        // Code examples count (8 points)
        let code_examples_count = doc.code_blocks_count();
        let min_for_full = self.config.analysis.min_code_blocks_for_full_score;
        let code_score = if code_examples_count >= min_for_full {
            8.0
        } else if code_examples_count >= 3 {
            6.0
        } else if code_examples_count >= 2 {
            4.0
        } else if code_examples_count >= 1 {
            2.0
        } else {
            0.0
        };
        score += code_score;

        // Best practices (5 points)
        let has_best_practices = doc.check_keywords(&self.config.keywords.best_practices);
        if has_best_practices {
            score += 5.0;
        }

        // Design patterns/architecture (4 points)
        let has_patterns = doc.check_keywords(&self.config.keywords.patterns);
        if has_patterns {
            score += 4.0;
        }

        // Input/Output examples (2 points)
        let has_io_examples = doc.has_io_examples();
        if has_io_examples {
            score += 2.0;
        }

        TechnicalDepthScore {
            total: score.min(19.0),
            code_examples_count,
            has_best_practices,
            has_patterns,
            has_io_examples,
        }
    }

    /// Score documentation completeness (max 13 points)
    fn score_documentation(&self, doc: &SkillDocument) -> DocumentationScore {
        let mut score: f64 = 0.0;

        // Section count (7 points)
        let sections_count = doc.sections_count();
        let min_sections = self.config.analysis.min_sections_for_full_score;
        let section_score = if sections_count >= min_sections {
            7.0
        } else if sections_count >= 4 {
            5.0
        } else if sections_count >= 3 {
            3.0
        } else if sections_count >= 2 {
            2.0
        } else {
            0.0
        };
        score += section_score;

        // Quick start section (3 points)
        let has_quick_start = doc.check_keywords(&self.config.keywords.quick_start);
        if has_quick_start {
            score += 3.0;
        }

        // Line length quality (3 points)
        let avg_line_length = doc.avg_line_length();
        let min_ideal = self.config.analysis.ideal_avg_line_length_min as f64;
        let max_ideal = self.config.analysis.ideal_avg_line_length_max as f64;

        let line_length_score = if (min_ideal..=max_ideal).contains(&avg_line_length) {
            3.0
        } else if ((min_ideal - 10.0)..=(max_ideal + 20.0)).contains(&avg_line_length) {
            2.0
        } else {
            1.0
        };
        score += line_length_score;

        DocumentationScore {
            total: score.min(13.0),
            sections_count,
            has_quick_start,
            avg_line_length,
        }
    }

    /// Score actionability (max 5 points)
    fn score_actionability(&self, doc: &SkillDocument) -> f64 {
        let mut score: f64 = 0.0;

        // Has step-by-step instructions (3 points)
        if doc.has_step_by_step() {
            score += 3.0;
        }

        // Has code examples (actionable content) (2 points)
        if doc.code_blocks_count() > 0 {
            score += 2.0;
        }

        score.min(5.0)
    }
}

impl Default for ContentScorer {
    fn default() -> Self {
        Self::new(ScoringConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_document() -> SkillDocument {
        let content = r#"---
name: test-skill
version: 1.0.0
---

# Test Skill

## When to Use

- Use case 1: When you need to do X
- Use case 2: When you want to achieve Y
- Use case 3: For scenarios involving Z

## Quick Start

1. First step
2. Second step
3. Third step

## Best Practices

Follow these recommendations:
- Use proper validation
- Follow the factory pattern

## Example

Input: test data
Output: result

```rust
fn main() {
    println!("Hello");
}
```

```python
def example():
    print("World")
```

```javascript
console.log("Test");
```
"#;

        SkillDocument::from_string(content, "test.md".to_string()).unwrap()
    }

    #[test]
    fn test_content_scorer() {
        let scorer = ContentScorer::default();
        let doc = create_test_document();

        let score = scorer.score(&doc);

        assert!(score.total > 0.0);
        assert!(score.total <= 50.0);

        // Check individual components
        assert!(score.clarity.total > 0.0);
        assert!(score.clarity.has_when_to_use);
        assert_eq!(score.clarity.use_cases_count, 3);

        assert!(score.technical_depth.total > 0.0);
        assert!(score.technical_depth.has_best_practices);
        assert!(score.technical_depth.has_patterns);
        assert!(score.technical_depth.has_io_examples);

        assert!(score.documentation.total > 0.0);
        assert!(score.documentation.has_quick_start);

        assert!(score.actionability > 0.0);
    }

    #[test]
    fn test_clarity_scoring() {
        let scorer = ContentScorer::default();
        let doc = create_test_document();

        let clarity = scorer.score_clarity(&doc);

        assert!(clarity.has_when_to_use);
        assert_eq!(clarity.use_cases_count, 3);
        assert!(clarity.total <= 13.0);
    }

    #[test]
    fn test_technical_depth_scoring() {
        let scorer = ContentScorer::default();
        let doc = create_test_document();

        let tech_depth = scorer.score_technical_depth(&doc);

        assert_eq!(tech_depth.code_examples_count, 3);
        assert!(tech_depth.has_best_practices);
        assert!(tech_depth.has_patterns);
        assert!(tech_depth.has_io_examples);
        assert!(tech_depth.total <= 19.0);
    }

    #[test]
    fn test_documentation_scoring() {
        let scorer = ContentScorer::default();
        let doc = create_test_document();

        let doc_score = scorer.score_documentation(&doc);

        assert!(doc_score.sections_count >= 4);
        assert!(doc_score.has_quick_start);
        assert!(doc_score.total <= 13.0);
    }

    #[test]
    fn test_actionability_scoring() {
        let scorer = ContentScorer::default();
        let doc = create_test_document();

        let actionability = scorer.score_actionability(&doc);

        assert!(actionability > 0.0);
        assert!(actionability <= 5.0);
    }
}
