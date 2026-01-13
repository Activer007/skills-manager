// Maintenance Scorer (10 points total)
//
// This module evaluates the maintainability and sustainability of skills,
// including update frequency, community engagement, and compatibility.
//
// Scoring breakdown:
// - Update Frequency (3 points): How recently the skill was updated
// - Community Activity (5 points): Stars, contributors, engagement
// - Compatibility (2 points): Version info, compatibility notes
//
// Reference: ~/workspace/ordinary-claude-skills/tools/analyzer/maintenance_scorer.py

use crate::analyzer::config::ScoringConfig;
use crate::analyzer::skill_document::SkillDocument;
use crate::analyzer::types::MaintenanceScore;
use chrono::{DateTime, Utc};

pub struct MaintenanceScorer {
    config: ScoringConfig,
}

impl MaintenanceScorer {
    pub fn new(config: ScoringConfig) -> Self {
        Self { config }
    }

    /// Calculate total maintenance score (max 10 points)
    pub fn score(&self, doc: &SkillDocument) -> MaintenanceScore {
        let update_frequency = self.score_update_frequency(doc);
        let community_activity = self.score_community_activity(doc);
        let compatibility = self.score_compatibility(doc);

        let last_update_days = self.calculate_days_since_update(doc);

        let total = update_frequency + community_activity + compatibility;

        MaintenanceScore {
            total,
            update_frequency,
            community_activity,
            compatibility,
            last_update_days,
        }
    }

    /// Score update frequency (max 3 points)
    fn score_update_frequency(&self, doc: &SkillDocument) -> f64 {
        let days_since_update = self.calculate_days_since_update(doc);

        match days_since_update {
            Some(days) => {
                let recent_threshold = self.config.analysis.recent_update_days;
                let active_threshold = self.config.analysis.active_update_days;

                if days <= recent_threshold {
                    // Updated within recent threshold (e.g., 90 days) - full score
                    3.0
                } else if days <= active_threshold {
                    // Updated within active threshold (e.g., 180 days) - partial score
                    2.0
                } else if days <= 365 {
                    // Updated within a year
                    1.0
                } else {
                    // Outdated
                    0.5
                }
            }
            None => {
                // No update info available - give benefit of the doubt
                1.5
            }
        }
    }

    /// Score community activity (max 5 points)
    /// Note: This is primarily for marketplace skills with GitHub stats
    fn score_community_activity(&self, _doc: &SkillDocument) -> f64 {
        // For local skills without GitHub stats, we give a neutral score
        // In a full implementation, this would check GitHub stars, forks, contributors, etc.
        // For now, we'll give a base score of 2.5 (neutral)
        2.5
    }

    /// Score compatibility and version information (max 2 points)
    fn score_compatibility(&self, doc: &SkillDocument) -> f64 {
        let mut score = 0.0;

        // Has version information (1 point)
        if doc.metadata.version.is_some() {
            score += 1.0;
        }

        // Content mentions compatibility or version requirements (1 point)
        let content_lower = doc.content.to_lowercase();
        if content_lower.contains("compatibility")
            || content_lower.contains("version")
            || content_lower.contains("requires")
            || content_lower.contains("兼容")
        {
            score += 1.0;
        }

        score.min(2.0)
    }

    /// Calculate days since last update
    fn calculate_days_since_update(&self, doc: &SkillDocument) -> Option<i64> {
        if let Some(ref last_updated) = doc.metadata.last_updated {
            // Try to parse the date
            if let Ok(update_date) = DateTime::parse_from_rfc3339(last_updated) {
                let now = Utc::now();
                let duration = now.signed_duration_since(update_date);
                return Some(duration.num_days());
            }
        }

        None
    }
}

impl Default for MaintenanceScorer {
    fn default() -> Self {
        Self::new(ScoringConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_document() -> SkillDocument {
        let content = r#"---
name: maintenance-test
version: 2.1.0
last_updated: "2026-01-01T00:00:00Z"
---

# Maintenance Test Skill

## Compatibility

This skill is compatible with all versions >= 1.0.0.

## Requirements

Requires Node.js version 18 or higher.
"#;

        SkillDocument::from_string(content, "test.md".to_string()).unwrap()
    }

    #[test]
    fn test_maintenance_scorer() {
        let scorer = MaintenanceScorer::default();
        let doc = create_test_document();

        let score = scorer.score(&doc);

        assert!(score.total > 0.0);
        assert!(score.total <= 10.0);
        assert!(score.update_frequency > 0.0);
        assert!(score.community_activity > 0.0);
        assert!(score.compatibility > 0.0);
    }

    #[test]
    fn test_update_frequency_scoring() {
        let scorer = MaintenanceScorer::default();
        let doc = create_test_document();

        let freq_score = scorer.score_update_frequency(&doc);

        assert!(freq_score > 0.0);
        assert!(freq_score <= 3.0);
    }

    #[test]
    fn test_compatibility_scoring() {
        let scorer = MaintenanceScorer::default();
        let doc = create_test_document();

        let compat_score = scorer.score_compatibility(&doc);

        // Should have version (1.0) and mentions compatibility (1.0)
        assert_eq!(compat_score, 2.0);
    }

    #[test]
    fn test_days_since_update() {
        let scorer = MaintenanceScorer::default();
        let doc = create_test_document();

        let days = scorer.calculate_days_since_update(&doc);

        assert!(days.is_some());
        assert!(days.unwrap() >= 0);
    }
}
