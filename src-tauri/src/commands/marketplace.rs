//! Marketplace Tauri commands
//!
//! This module provides Tauri commands for marketplace operations

use crate::services::marketplace_service::{MarketplaceService, MarketplaceStats};
use crate::services::repository_service::RepositoryService;
use crate::models::repository::{Repository, RepositoryCategory};
use crate::models::marketplace::{MarketplaceSkill, MarketplaceSkillDTO};
use crate::models::source::SourceFilter;
use std::fs;
use std::path::PathBuf;
use std::collections::HashMap;

/// Raw marketplace skill JSON structure
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct RawMarketplaceSkill {
    id: String,
    name: String,
    author: Option<String>,
    #[serde(default)]
    author_avatar: Option<String>,
    description: Option<String>,
    #[serde(rename = "githubUrl", alias = "url")]  // Add alias to handle both field names
    github_url: Option<String>,
    #[serde(default)]
    version: Option<String>,
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
            skill_path: String::new(),  // Empty for legacy
            repository_id: String::new(),  // Empty for legacy
            github_url: raw.github_url,
            version: raw.version,
            stars: raw.stars,
            forks: raw.forks,
            updated_at: raw.updated_at,
            tags: raw.tags.as_ref().and_then(|t| serde_json::to_string(t).ok()),
            security_score: raw.security_score,
            compatibility: raw.compatibility.as_ref().and_then(|c| serde_json::to_string(c).ok()),
            config_schema: None,
            discovered_at: raw.updated_at,
            synced_at: chrono::Utc::now().timestamp(),
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

/// List marketplace Skills by source type with deduplication
///
/// This command lists marketplace skills filtered by source type.
/// When multiple repositories provide the same skill, only the one from
/// the highest priority source is returned (featured > user).
///
/// # Arguments
/// * `source_type` - Filter by source: "featured", "user", or "all" (default)
/// * `limit` - Maximum number of skills to return
/// * `offset` - Pagination offset (optional, default: 0)
///
/// # Returns
/// Vector of MarketplaceSkillDTO with primary source deduplication applied
#[tauri::command]
pub async fn list_marketplace_skills_by_source(
    source_type: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<Vec<MarketplaceSkillDTO>, String> {
    let service = MarketplaceService::new();

    // Parse source filter
    let source_filter = match source_type.as_deref() {
        Some("featured") => SourceFilter::Featured,
        Some("user") => SourceFilter::User,
        Some("all") | None => SourceFilter::All,
        Some(other) => {
            return Err(format!(
                "Invalid source_type '{}'. Expected 'featured', 'user', or 'all'",
                other
            ));
        }
    };

    service.list_skills_by_source(source_filter, limit)
        .map_err(|e| e.to_string())
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
        // Try multiple possible paths for the marketplace.json file
        let candidates = vec![
            "public/data/marketplace.json",           // From project root
            "../public/data/marketplace.json",       // From src-tauri (dev mode)
            "../../public/data/marketplace.json",    // From deeper directory
            "dist/data/marketplace.json",            // Production build
            "../dist/data/marketplace.json",         // Production from src-tauri
        ];

        let mut found_path = None;
        for candidate in &candidates {
            let path = PathBuf::from(candidate);
            if path.exists() {
                found_path = Some(path);
                break;
            }
        }

        found_path.ok_or_else(|| {
            format!(
                "Cannot find marketplace.json. Tried: {:?}",
                candidates
            )
        })?
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
    let repository_service = RepositoryService::new();
    let mut repository_cache: HashMap<String, String> = HashMap::new();
    let mut success_count = 0;
    let mut error_count = 0;
    let skipped_count = 0;

    let fallback_repo_url = "https://github.com/marketplace/legacy-json";

    let resolve_repository_id = |repo_url: &str,
                                 repository_service: &RepositoryService,
                                 repository_cache: &mut HashMap<String, String>| -> Result<String, String> {
        if let Some(id) = repository_cache.get(repo_url) {
            return Ok(id.clone());
        }

        if let Ok(Some(existing)) = repository_service.get_repository_by_url(repo_url) {
            repository_cache.insert(repo_url.to_string(), existing.id.clone());
            return Ok(existing.id);
        }

        let repo_name = Repository::parse_github_url(repo_url)
            .map(|(_, repo)| repo)
            .unwrap_or_else(|_| "marketplace".to_string());

        let repo = Repository {
            id: uuid::Uuid::new_v4().to_string(),
            url: repo_url.to_string(),
            name: repo_name,
            description: Some("Imported from marketplace.json".to_string()),
            source_type: "featured".to_string(),
            priority: 10,
            scan_status: "pending".to_string(),
            etag: None,
            enabled: true,
            scan_subdirs: true,
            added_at: chrono::Utc::now(),
            last_scanned: None,
            cache_path: None,
            cached_commit_sha: None,
            featured: true,
            category: RepositoryCategory::Community,
        };

        match repository_service.add_repository(&repo) {
            Ok(_) => {
                repository_cache.insert(repo.url.clone(), repo.id.clone());
                Ok(repo.id)
            }
            Err(e) => Err(format!("Failed to add repository {}: {}", repo.url, e)),
        }
    };

    let parse_repo_info = |url: &str| -> Option<(String, Option<String>)> {
        let (owner, repo) = Repository::parse_github_url(url).ok()?;
        let repo_url = format!("https://github.com/{}/{}", owner, repo);

        let skill_path = if let Some(pos) = url.find("/tree/") {
            let remainder = &url[(pos + "/tree/".len())..];
            let mut parts = remainder.split('/');
            let _branch = parts.next();
            let path = parts.collect::<Vec<_>>().join("/");
            if path.is_empty() { None } else { Some(path) }
        } else if let Some(pos) = url.find("/blob/") {
            let remainder = &url[(pos + "/blob/".len())..];
            let mut parts = remainder.split('/');
            let _branch = parts.next();
            let path = parts.collect::<Vec<_>>().join("/");
            if path.is_empty() { None } else { Some(path) }
        } else {
            None
        };

        Some((repo_url, skill_path))
    };

    for raw_skill in raw_skills {
        let (repo_url, inferred_path) = raw_skill.github_url
            .as_deref()
            .and_then(parse_repo_info)
            .unwrap_or_else(|| (fallback_repo_url.to_string(), None));

        let repository_id = match resolve_repository_id(&repo_url, &repository_service, &mut repository_cache) {
            Ok(id) => id,
            Err(e) => {
                log::error!("{}", e);
                error_count += 1;
                continue;
            }
        };

        let mut skill: MarketplaceSkill = raw_skill.into();
        skill.repository_id = repository_id;
        skill.skill_path = inferred_path.unwrap_or_else(|| skill.id.clone());

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
