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

        // Use FTS match query
        let mut stmt = conn.prepare(
            "SELECT m.id, m.name, m.author, m.description, m.github_url, m.version, m.stars, m.forks, m.updated_at, m.tags, m.security_score, m.compatibility
             FROM marketplace_skills m
             JOIN marketplace_skills_fts f ON m.id = f.skill_id
             WHERE f.marketplace_skills_fts MATCH ?1
             ORDER BY m.stars DESC, m.updated_at DESC
             LIMIT ?2"
        )?;

        let skill_iter = stmt.query_map(
            params![search_query, max_limit as i64],
            |row| {
                Ok(MarketplaceSkill::from_row_legacy(
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                    row.get(8)?,
                    row.get(9)?,
                    row.get(10)?,
                    row.get(11)?,
                ))
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
    pub fn list_skills(
        &self,
        tag_filter: Option<&str>,
        min_stars: Option<i64>,
        limit: Option<usize>
    ) -> MarketplaceResult<Vec<MarketplaceSkillDTO>> {
        let conn = get_connection()?;
        let max_limit = limit.unwrap_or(100);

        // Build dynamic query
        let mut query = String::from(
            "SELECT id, name, author, description, github_url, version, stars, forks, updated_at, tags, security_score, compatibility
             FROM marketplace_skills WHERE 1=1"
        );
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        // Add Tag Filter
        if let Some(tag) = tag_filter {
            query.push_str(" AND tags LIKE ?");
            params.push(Box::new(format!("%{}%", tag)));
        }

        // Add Min Stars Filter
        if let Some(stars) = min_stars {
            query.push_str(" AND stars >= ?");
            params.push(Box::new(stars));
        }

        // Add Ordering and Limit
        query.push_str(" ORDER BY stars DESC, updated_at DESC LIMIT ?");
        params.push(Box::new(max_limit as i64));

        // Execute
        let mut stmt = conn.prepare(&query)?;

        // Convert params to dyn ToSql references for rusqlite
        let mut param_refs: Vec<&dyn rusqlite::ToSql> = Vec::new();
        for p in &params {
            param_refs.push(p.as_ref());
        }

        let skill_iter = stmt.query_map(
            rusqlite::params_from_iter(param_refs.iter()),
            |row| {
                Ok(MarketplaceSkill::from_row_legacy(
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                    row.get(8)?,
                    row.get(9)?,
                    row.get(10)?,
                    row.get(11)?,
                ))
            }
        )?;

        let mut results = Vec::new();
        for skill in skill_iter {
            let skill = skill?;
            results.push(MarketplaceSkillDTO::from(skill));
        }

        Ok(results)
    }

    /// Get a single marketplace Skill by ID
    pub fn get_skill(&self, id: &str) -> MarketplaceResult<Option<MarketplaceSkillDTO>> {
        let conn = get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT id, name, author, description, github_url, version, stars, forks, updated_at, tags, security_score, compatibility
             FROM marketplace_skills
             WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(MarketplaceSkill::from_row_legacy(
                row.get(0)?,
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
                row.get(6)?,
                row.get(7)?,
                row.get(8)?,
                row.get(9)?,
                row.get(10)?,
                row.get(11)?,
            ))
        });

        match result {
            Ok(skill) => Ok(Some(MarketplaceSkillDTO::from(skill))),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Save or update a marketplace Skill
    pub fn upsert_skill(&self, skill: &MarketplaceSkill) -> MarketplaceResult<()> {
        let conn = get_connection()?;

        conn.execute(
            "INSERT OR REPLACE INTO marketplace_skills
            (id, name, author, description, github_url, stars, forks, updated_at, tags, security_score, compatibility, data)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                skill.id,
                skill.name,
                skill.author,
                skill.description,
                skill.github_url,
                skill.stars,
                skill.forks,
                skill.updated_at,
                skill.tags,
                skill.security_score,
                skill.compatibility,
                skill.data,
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
