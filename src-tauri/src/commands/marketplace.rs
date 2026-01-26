//! Marketplace Tauri commands
//!
//! This module provides Tauri commands for marketplace operations

use crate::services::marketplace_service::{MarketplaceService, MarketplaceStats};
use crate::models::marketplace::{MarketplaceSkill, MarketplaceSkillDTO};
use std::fs;
use std::path::PathBuf;

/// Raw marketplace skill JSON structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct RawMarketplaceSkill {
    id: String,
    name: String,
    author: Option<String>,
    #[serde(default)]
    author_avatar: Option<String>,
    description: Option<String>,
    #[serde(rename = "githubUrl")]
    github_url: Option<String>,
    stars: i64,
    forks: i64,
    #[serde(rename = "updatedAt")]
    updated_at: i64,
    #[serde(default)]
    has_marketplace: Option<bool>,
    #[serde(default)]
    path: Option<String>,
    #[serde(default)]
    branch: Option<String>,
    #[serde(default)]
    description_hash: Option<String>,
    #[serde(default)]
    deleted: Option<bool>,
    #[serde(rename = "description_cn")]
    #[serde(default)]
    description_cn: Option<String>,
    #[serde(default)]
    tags: Option<Vec<String>>,
    #[serde(default)]
    security_score: Option<i32>,
    #[serde(default)]
    compatibility: Option<serde_json::Value>,
}

impl From<RawMarketplaceSkill> for MarketplaceSkill {
    fn from(raw: RawMarketplaceSkill) -> Self {
        // Serialize the entire raw structure first
        let data = serde_json::to_string(&raw).ok();

        MarketplaceSkill {
            id: raw.id,
            name: raw.name,
            author: raw.author,
            description: raw.description,
            github_url: raw.github_url,
            stars: raw.stars,
            forks: raw.forks,
            updated_at: raw.updated_at,
            tags: raw.tags.as_ref().and_then(|t| serde_json::to_string(t).ok()),
            security_score: raw.security_score,
            compatibility: raw.compatibility.as_ref().and_then(|c| serde_json::to_string(c).ok()),
            data,
        }
    }
}

/// Search marketplace Skills by query
#[tauri::command]
pub async fn search_marketplace_skills(
    query: String,
    limit: Option<usize>
) -> Result<Vec<MarketplaceSkillDTO>, String> {
    let service = MarketplaceService::new();
    service.search_skills(&query, limit)
        .map_err(|e| e.to_string())
}

/// List marketplace Skills with optional filters
#[tauri::command]
pub async fn list_marketplace_skills(
    tag_filter: Option<String>,
    min_stars: Option<i64>,
    limit: Option<usize>
) -> Result<Vec<MarketplaceSkillDTO>, String> {
    let service = MarketplaceService::new();
    service.list_skills(
        tag_filter.as_deref(),
        min_stars,
        limit
    ).map_err(|e| e.to_string())
}

/// Get a single marketplace Skill by ID
#[tauri::command]
pub async fn get_marketplace_skill(
    id: String
) -> Result<Option<MarketplaceSkillDTO>, String> {
    let service = MarketplaceService::new();
    service.get_skill(&id)
        .map_err(|e| e.to_string())
}

/// Upsert a marketplace Skill (save or update)
#[tauri::command]
pub async fn upsert_marketplace_skill(
    skill: MarketplaceSkill
) -> Result<(), String> {
    let service = MarketplaceService::new();
    service.upsert_skill(&skill)
        .map_err(|e| e.to_string())
}

/// Delete a marketplace Skill
#[tauri::command]
pub async fn delete_marketplace_skill(
    id: String
) -> Result<(), String> {
    let service = MarketplaceService::new();
    service.delete_skill(&id)
        .map_err(|e| e.to_string())
}

/// Get marketplace statistics
#[tauri::command]
pub async fn get_marketplace_stats() -> Result<MarketplaceStats, String> {
    let service = MarketplaceService::new();
    service.get_stats()
        .map_err(|e| e.to_string())
}

/// Clear all marketplace Skills
#[tauri::command]
pub async fn clear_marketplace_skills() -> Result<(), String> {
    let service = MarketplaceService::new();
    service.clear_all()
        .map_err(|e| e.to_string())
}

/// Import marketplace skills from JSON file
///
/// This command reads the marketplace.json file and imports all skills into the database.
/// It performs a batch upsert operation, so it can be run multiple times safely.
#[tauri::command]
pub async fn import_marketplace_from_json(
    json_path: Option<String>
) -> Result<ImportResult, String> {
    // Determine JSON file path
    let json_file = if let Some(path) = json_path {
        PathBuf::from(path)
    } else {
        // Default path: public/data/marketplace.json
        let mut path = PathBuf::from("public/data/marketplace.json");

        // Try development path first
        if !path.exists() {
            // Try dist path (for production builds)
            let dist_path = PathBuf::from("dist/data/marketplace.json");
            if dist_path.exists() {
                path = dist_path;
            }
        }

        path
    };

    log::info!("Importing marketplace skills from: {:?}", json_file);

    // Read JSON file
    let json_content = fs::read_to_string(&json_file)
        .map_err(|e| format!("Failed to read JSON file: {}", e))?;

    // Parse JSON
    let raw_skills: Vec<RawMarketplaceSkill> = serde_json::from_str(&json_content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;

    let total_count = raw_skills.len();
    log::info!("Found {} skills in JSON file", total_count);

    // Import to database
    let service = MarketplaceService::new();
    let mut success_count = 0;
    let mut error_count = 0;
    let skipped_count = 0;

    for raw_skill in raw_skills {
        let skill: MarketplaceSkill = raw_skill.into();

        match service.upsert_skill(&skill) {
            Ok(_) => success_count += 1,
            Err(e) => {
                log::error!("Failed to import skill {}: {}", skill.id, e);
                error_count += 1;
            }
        }
    }

    log::info!("Import completed: {} success, {} errors, {} skipped",
        success_count, error_count, skipped_count);

    Ok(ImportResult {
        total_count: total_count as i64,
        success_count,
        error_count,
        skipped_count,
    })
}

/// Result of marketplace import operation
#[derive(Debug, Clone, serde::Serialize)]
pub struct ImportResult {
    pub total_count: i64,
    pub success_count: i64,
    pub error_count: i64,
    pub skipped_count: i64,
}
