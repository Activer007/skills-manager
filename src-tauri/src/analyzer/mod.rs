// Skill Quality Analyzer Module
//
// This module implements a comprehensive skill quality scoring system
// migrated from the Python implementation at ~/workspace/ordinary-claude-skills/tools/analyzer/
//
// Scoring breakdown (100 points total):
// - Content Quality: 50 points ⭐ (highest weight)
// - Technical Implementation: 30 points
// - Maintenance: 10 points
// - User Experience: 10 points

pub mod types;
pub mod config;
pub mod utils;
pub mod skill_document;
pub mod content_scorer;
pub mod technical_scorer;
pub mod maintenance_scorer;
pub mod ux_scorer;
pub mod skill_analyzer;

// Re-export main types for convenience
pub use types::*;
pub use skill_analyzer::SkillAnalyzer;
