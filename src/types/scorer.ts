// Skill Quality Scoring Types
// Mapping Rust structs from src-tauri/src/analyzer/types.rs

export interface SkillScore {
  total_score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  content_score: ContentScore;
  technical_score: TechnicalScore;
  maintenance_score: MaintenanceScore;
  ux_score: UxScore;
  suggestions: string[];
  metadata: ScoreMetadata;
}

export interface ContentScore {
  total: number;
  clarity: ClarityScore;
  technical_depth: TechnicalDepthScore;
  documentation: DocumentationScore;
  actionability: number;
}

export interface ClarityScore {
  total: number;
  has_when_to_use: boolean;
  use_cases_count: number;
  scenario_clarity: number;
}

export interface TechnicalDepthScore {
  total: number;
  code_examples_count: number;
  has_best_practices: boolean;
  has_patterns: boolean;
  has_io_examples: boolean;
}

export interface DocumentationScore {
  total: number;
  sections_count: number;
  has_quick_start: boolean;
  avg_line_length: number;
}

export interface TechnicalScore {
  total: number;
  code_quality: CodeQualityScore;
  pattern_design: number;
  error_handling: number;
}

export interface CodeQualityScore {
  total: number;
  code_blocks_count: number;
  language_diversity: number;
  has_security_keywords: boolean;
}

export interface MaintenanceScore {
  total: number;
  update_frequency: number;
  community_activity: number;
  compatibility: number;
  last_update_days: number | null;
}

export interface UxScore {
  total: number;
  ease_of_use: number;
  readability: number;
}

export interface ScoreMetadata {
  skill_name: string;
  version: string | null;
  author: string | null;
  analyzed_at: string;
  analyzer_version: string;
}

export interface BatchAnalysisResult {
  scores: SkillScore[];
  errors: AnalysisError[];
  total: number;
  successful: number;
  failed: number;
}

export interface AnalysisError {
  path: string;
  error: string;
}