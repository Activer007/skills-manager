use std::path::PathBuf;
use walkdir::WalkDir;
use tauri::State;
use crate::models::skill::{SkillInfo, ScanResult};
use crate::constants::SKILL_SCAN_DEPTH;
use crate::services::config_service::ConfigService;

pub struct SkillService;

impl SkillService {
    pub fn get_claude_skills_dir() -> Option<PathBuf> {
        dirs::home_dir().map(|h| h.join(".claude").join("skills"))
    }

    pub fn parse_skill_md(path: &PathBuf, skill_type: &str) -> Option<SkillInfo> {
        // Use the analyzer's parser for robust frontmatter extraction
        use crate::analyzer::skill_document::SkillDocument;

        let doc = SkillDocument::from_file(path).ok()?;

        let name = if !doc.metadata.name.is_empty() {
            doc.metadata.name
        } else {
            path.parent()?.file_name()?.to_string_lossy().to_string()
        };

        let description = doc.metadata.description.unwrap_or_else(|| {
            // Fallback to first 200 chars of content if no description in frontmatter
            doc.content
                .lines()
                .take(5) // Take first few lines
                .collect::<Vec<_>>()
                .join(" ")
                .chars()
                .take(200)
                .collect::<String>()
        });

        let tags = doc.metadata.tags.unwrap_or_default();
        let config_schema = doc.metadata.config_schema;
        let author = doc.metadata.author;
        let derived_from = doc.metadata.derived_from;
        let fork_type = doc.metadata.fork_type;

        // Check if it's an MCP skill based on tags
        let is_mcp = tags.iter().any(|t| t.to_lowercase() == "mcp" || t.to_lowercase() == "mcp-server");

        Some(SkillInfo {
            name,
            description,
            path: path.parent()?.to_string_lossy().to_string(),
            skill_type: skill_type.to_string(),
            is_mcp,
            tags,
            config_schema,
            author,
            derived_from,
            fork_type,
        })
    }

    pub fn scan_skills(state: &State<'_, ConfigService>) -> Result<ScanResult, String> {
        let mut system_skills = Vec::new();
        let mut project_skills = Vec::new();

        if let Some(skills_dir) = Self::get_claude_skills_dir() {
            if skills_dir.exists() {
                for entry in WalkDir::new(&skills_dir).max_depth(SKILL_SCAN_DEPTH).into_iter().flatten() {
                    let path = entry.path();
                    if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
                        if let Some(skill) = Self::parse_skill_md(&path.to_path_buf(), "system") {
                            system_skills.push(skill);
                        }
                    }
                }
            }
        }

        let paths = state.get_project_paths();
        for project_path in paths {
            let skills_dir = PathBuf::from(&project_path).join(".claude").join("skills");
            if skills_dir.exists() {
                for entry in WalkDir::new(&skills_dir).max_depth(SKILL_SCAN_DEPTH).into_iter().flatten() {
                    let path = entry.path();
                    if path.file_name().map(|n| n == "SKILL.md").unwrap_or(false) {
                        if let Some(skill) = Self::parse_skill_md(&path.to_path_buf(), "project") {
                            project_skills.push(skill);
                        }
                    }
                }
            }
        }

        Ok(ScanResult {
            system_skills,
            project_skills,
        })
    }
}
