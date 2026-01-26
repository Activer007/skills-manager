//! Marketplace Tauri commands
//!
//! This module provides Tauri commands for marketplace operations

use crate::services::marketplace_service::{MarketplaceService, MarketplaceStats};
use crate::models::marketplace::{MarketplaceSkill, MarketplaceSkillDTO};

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
