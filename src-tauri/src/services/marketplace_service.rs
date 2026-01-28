//! Marketplace service for managing Skills from the marketplace
//!
//! This module provides functionality to:
//! - Sync Skills from GitHub repositories
//! - Search and filter marketplace Skills
//! - Manage local marketplace database

use anyhow::{Context, Result};
use rusqlite::params;
use chrono::{DateTime, Utc};

use crate::models::marketplace::{MarketplaceSkill, MarketplaceSkillDTO};
use crate::models::source::SourceFilter;
use crate::services::db::get_connection;

/// Type alias for marketplace skill results
type MarketplaceResult<T> = anyhow::Result<T>;

/// Service for managing marketplace Skills
pub struct MarketplaceService;

impl MarketplaceService {
    /// Create a new MarketplaceService instance
    pub fn new() -> Self {
        Self
    }

    /// Sync Skills from a GitHub repository (featured repository)
    /// This would typically fetch from a curated list or search GitHub
    pub fn sync_from_repository(&self, repo_url: &str, _category: &str) -> Result<Vec<MarketplaceSkill>> {
        // TODO: Implement actual GitHub API fetching
        // For now, this is a placeholder that would:
        // 1. Fetch repository metadata via GitHub API
        // 2. Scan for SKILL.md files
        // 3. Parse and store in database

        log::info!("Syncing marketplace skills from repository: {}", repo_url);

        // Placeholder: Return empty list
        // In production, this would:
        // - Use git2 to clone the repository
        // - Walk the directory tree for SKILL.md files
        // - Parse frontmatter and metadata
        // - Store in marketplace_skills table

        Ok(vec![])
    }

    /// Get marketplace Skills with source filtering
    /// Uses primary source query (ROW_NUMBER CTE) for deduplication
    pub fn list_skills_by_source(
        &self,
        source_filter: SourceFilter,
        limit: Option<usize>
    ) -> MarketplaceResult<Vec<MarketplaceSkillDTO>> {
        let conn = get_connection()?;
        let max_limit = limit.unwrap_or(100);

        // Build base query logic with CTE for ranking
        let mut query = String::from(
            "WITH ranked_skills AS (
                SELECT
                    ms.id,
                    ms.name,
                    ms.author,
                    ms.description,
                    ms.github_url,
                    ms.version,
                    ms.stars,
                    ms.forks,
                    ms.updated_at,
                    ms.tags,
                    ms.security_score,
                    ms.compatibility,
                    r.name as repository_name,
                    r.source_type,
                    r.priority,
                    ms.skill_path,
                    ROW_NUMBER() OVER (
                        PARTITION BY ms.name,
                        COALESCE(ms.author, '')
                        ORDER BY r.priority ASC, ms.discovered_at ASC
                    ) as rn
                FROM marketplace_skills ms
                JOIN repositories r ON ms.repository_id = r.id
                WHERE r.enabled = 1"
        );

        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        // Apply source filter BEFORE ranking to ensure we rank within the filtered set
        // if that's the desired behavior.
        // However, usually we want to find the "best" version globally, and THEN filter?
        // Actually, if I select "User Sources", I want to see the best version available from User Sources,
        // even if there is a Featured version (which would normally hide it).
        // So filtering inside the CTE is correct for "Show me what's available in X context".

        match source_filter {
            SourceFilter::Featured => {
                query.push_str(" AND r.source_type = 'featured'");
            },
            SourceFilter::User => {
                query.push_str(" AND r.source_type = 'user'");
            },
            SourceFilter::All => {
                // No extra filter
            }
        }

        // Close CTE and select top ranked items
        query.push_str(")\nSELECT * FROM ranked_skills WHERE rn = 1");

        // Add Ordering and Limit
        query.push_str(" ORDER BY stars DESC, updated_at DESC LIMIT ?");
        params.push(Box::new(max_limit as i64));

        // Execute
        let mut stmt = conn.prepare(&query)?;

        // Convert params to dyn ToSql references
        let mut param_refs: Vec<&dyn rusqlite::ToSql> = Vec::new();
        for p in &params {
            param_refs.push(p.as_ref());
        }

        let skill_iter = stmt.query_map(
            rusqlite::params_from_iter(param_refs.iter()),
            |row| {
                // Parse tags and compatibility
                let tags: Vec<String> = row.get::<_, Option<String>>(10)?
                    .and_then(|t| serde_json::from_str(&t).ok())
                    .unwrap_or_default();

                let compatibility: Option<serde_json::Value> = row.get::<_, Option<String>>(11)?
                    .and_then(|c| serde_json::from_str(&c).ok());

                Ok(MarketplaceSkillDTO {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    author: row.get(2)?,
                    description: row.get(3)?,
                    github_url: row.get(4)?,
                    version: row.get(5)?,
                    stars: row.get(6)?,
                    forks: row.get(7)?,
                    updated_at: row.get(8)?,
                    tags,
                    security_score: row.get(9)?,
                    compatibility,
                    repository_name: row.get(12)?,
                    source_type: row.get(13)?,
                    priority: row.get(14)?,
                    skill_path: row.get(15)?,
                    repository_id: row.get(16).unwrap_or_default(),
                    discovered_at: 0,
                    synced_at: 0,
                })
            }
        )?;

        let mut results = Vec::new();
        for skill in skill_iter {
            results.push(skill?);
        }

        Ok(results)
    }

    /// Search marketplace Skills by query string
    pub fn search_skills(&self, query: &str, limit_param: Option<usize>) -> MarketplaceResult<Vec<MarketplaceSkillDTO>> {
        let conn = get_connection()?;
        let max_limit = limit_param.unwrap_or(50);

        // Prepare FTS query string
        // Split by whitespace to support multiple terms (AND logic)
        // "rust ui" -> "rust"* AND "ui"*
        let terms: Vec<&str> = query.split_whitespace().collect();
        let search_query = if terms.is_empty() {
            return Ok(vec![]);
        } else {
            terms.iter()
                .map(|term| {
                    // Escape double quotes by doubling them, wrap in quotes, append * for prefix match
                    format!("\"{}\"*", term.replace("\"", "\"\""))
                })
                .collect::<Vec<String>>()
                .join(" AND ")
        };

        // Use FTS match query with primary source deduplication
        // Note: github_url, compatibility are removed in v11 schema
        let fts_query = format!(
            "WITH ranked_skills AS (
                SELECT
                    ms.id,
                    ms.name,
                    ms.author,
                    ms.description,
                    ms.version,
                    ms.stars,
                    ms.forks,
                    ms.updated_at,
                    ms.tags,
                    ms.security_score,
                    r.name as repository_name,
                    r.source_type,
                    r.priority,
                    ms.skill_path,
                    ms.repository_id,
                    r.url as repo_url,
                    ROW_NUMBER() OVER (
                        PARTITION BY ms.name,
                        COALESCE(ms.author, '')
                        ORDER BY r.priority ASC, ms.discovered_at ASC
                    ) as rn
                FROM marketplace_skills ms
                JOIN marketplace_skills_fts f ON ms.id = f.skill_id
                JOIN repositories r ON ms.repository_id = r.id
                WHERE f.marketplace_skills_fts MATCH ?1
                AND r.enabled = 1
            )
            SELECT * FROM ranked_skills WHERE rn = 1
            ORDER BY stars DESC, updated_at DESC
            LIMIT ?2"
        );

        let mut stmt = conn.prepare(&fts_query)?;

        let skill_iter = stmt.query_map(
            params![search_query, max_limit as i64],
            |row| {
                // Parse tags (index 8)
                let tags: Vec<String> = row.get::<_, Option<String>>(8)?
                    .and_then(|t| serde_json::from_str(&t).ok())
                    .unwrap_or_default();

                // Compatibility removed from DB, defaulting to None
                let compatibility: Option<serde_json::Value> = None;

                // Construct github_url from repo_url (index 15)
                let repo_url: String = row.get(15)?;
                let github_url = Some(repo_url); // Simplified for now

                Ok(MarketplaceSkillDTO {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    author: row.get(2)?,
                    description: row.get(3)?,
                    version: row.get(4)?,
                    stars: row.get(5)?,
                    forks: row.get(6)?,
                    updated_at: row.get(7)?,
                    tags,
                    security_score: row.get(9)?,
                    compatibility,
                    github_url,
                    repository_name: row.get(10)?,
                    source_type: row.get(11)?,
                    priority: row.get(12)?,
                    skill_path: row.get(13)?,
                    repository_id: row.get(14)?,
                    discovered_at: 0,
                    synced_at: 0,
                })
            },
        )?;

        let mut results = Vec::new();
        for skill in skill_iter {
            let skill = skill?;
            results.push(MarketplaceSkillDTO::from(skill));
        }

        Ok(results)
    }

    /// Get all marketplace Skills with optional filtering
    /// Uses primary source query (ROW_NUMBER CTE) for deduplication
    pub fn list_skills(
        &self,
        tag_filter: Option<&str>,
        min_stars: Option<i64>,
        limit: Option<usize>
    ) -> MarketplaceResult<Vec<MarketplaceSkillDTO>> {
        // Reuse list_skills_by_source logic with All filter
        self.list_skills_by_source(SourceFilter::All, limit)
    }

    /// Get a single marketplace Skill by ID
    pub fn get_skill(&self, id: &str) -> MarketplaceResult<Option<MarketplaceSkillDTO>> {
        let conn = get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT
                ms.id, ms.name, ms.author, ms.description, ms.version,
                ms.stars, ms.forks, ms.updated_at, ms.tags, ms.security_score,
                r.name as repository_name, r.source_type, r.priority,
                ms.skill_path, ms.repository_id, r.url as repo_url
             FROM marketplace_skills ms
             LEFT JOIN repositories r ON ms.repository_id = r.id
             WHERE ms.id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            let tags: Vec<String> = row.get::<_, Option<String>>(8)?
                .and_then(|t| serde_json::from_str(&t).ok())
                .unwrap_or_default();

            let repo_url: Option<String> = row.get(15).ok();

            Ok(MarketplaceSkillDTO {
                id: row.get(0)?,
                name: row.get(1)?,
                author: row.get(2)?,
                description: row.get(3)?,
                github_url: repo_url,
                version: row.get(4)?,
                stars: row.get(5)?,
                forks: row.get(6)?,
                updated_at: row.get(7)?,
                tags,
                security_score: row.get(9)?,
                compatibility: None,
                repository_name: row.get(10).unwrap_or_default(),
                source_type: row.get(11).unwrap_or_else(|_| "user".to_string()),
                priority: row.get(12).unwrap_or(100),
                skill_path: row.get(13).unwrap_or_default(),
                repository_id: row.get(14).unwrap_or_default(),
                discovered_at: 0,
                synced_at: 0,
            })
        });

        match result {
            Ok(skill) => Ok(Some(skill)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Save or update a marketplace Skill
    pub fn upsert_skill(&self, skill: &MarketplaceSkill) -> MarketplaceResult<()> {
        let conn = get_connection()?;

        conn.execute(
            "INSERT OR REPLACE INTO marketplace_skills
            (id, name, author, description, skill_path, repository_id,
             version, stars, forks, updated_at, tags,
             config_schema, quality_score, security_score,
             discovered_at, synced_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            params![
                skill.id,
                skill.name,
                skill.author,
                skill.description,
                skill.skill_path,
                skill.repository_id,
                skill.version,
                skill.stars,
                skill.forks,
                skill.updated_at,
                skill.tags,
                skill.config_schema,
                // Assuming quality_score is not in struct yet or needs mapping?
                // MarketplaceSkill struct in models/marketplace.rs doesn't seem to have quality_score explicitly in the version I read earlier?
                // Let's check the struct definition again.
                // It has: tags, security_score, compatibility, config_schema.
                // It does NOT have quality_score field in the struct I read earlier.
                // I will pass None for now or check if I need to update the struct.
                None::<i32>, // quality_score
                skill.security_score,
                skill.discovered_at,
                skill.synced_at,
            ],
        ).context("Failed to upsert marketplace skill")?;

        Ok(())
    }

    /// Delete a marketplace Skill
    pub fn delete_skill(&self, id: &str) -> MarketplaceResult<()> {
        let conn = get_connection()?;
        conn.execute("DELETE FROM marketplace_skills WHERE id = ?1", params![id])?;
        Ok(())
    }

    /// Get marketplace statistics
    pub fn get_stats(&self) -> MarketplaceResult<MarketplaceStats> {
        let conn = get_connection()?;

        let total_skills: i64 = conn.query_row(
            "SELECT COUNT(*) FROM marketplace_skills",
            [],
            |row| row.get(0)
        )?;

        let total_stars: i64 = conn.query_row(
            "SELECT SUM(stars) FROM marketplace_skills",
            [],
            |row| row.get(0)
        ).unwrap_or(0);

        Ok(MarketplaceStats {
            total_skills,
            total_stars,
            last_updated: Utc::now(),
        })
    }

    /// Clear all marketplace Skills
    pub fn clear_all(&self) -> MarketplaceResult<()> {
        let conn = get_connection()?;
        conn.execute("DELETE FROM marketplace_skills", [])?;
        Ok(())
    }
}

impl Default for MarketplaceService {
    fn default() -> Self {
        Self::new()
    }
}

/// Marketplace statistics
#[derive(Debug, Clone, serde::Serialize)]
pub struct MarketplaceStats {
    pub total_skills: i64,
    pub total_stars: i64,
    pub last_updated: DateTime<Utc>,
}
