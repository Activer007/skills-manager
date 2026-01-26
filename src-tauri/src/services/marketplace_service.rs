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

        let search_pattern = format!("%{}%", query);

        let mut stmt = conn.prepare(
            "SELECT id, name, author, description, github_url, stars, forks, updated_at, tags, security_score, compatibility
             FROM marketplace_skills
             WHERE name LIKE ?1 OR description LIKE ?1 OR author LIKE ?1
             ORDER BY stars DESC, updated_at DESC
             LIMIT ?2"
        )?;

        let skill_iter = stmt.query_map(
            params![search_pattern, max_limit as i64],
            |row| {
                Ok(MarketplaceSkill {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    author: row.get(2)?,
                    description: row.get(3)?,
                    github_url: row.get(4)?,
                    stars: row.get(5)?,
                    forks: row.get(6)?,
                    updated_at: row.get(7)?,
                    tags: row.get(8)?,
                    security_score: row.get(9)?,
                    compatibility: row.get(10)?,
                    data: None, // data field not needed for search results
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
    pub fn list_skills(
        &self,
        tag_filter: Option<&str>,
        min_stars: Option<i64>,
        limit: Option<usize>
    ) -> MarketplaceResult<Vec<MarketplaceSkillDTO>> {
        let conn = get_connection()?;
        let max_limit = limit.unwrap_or(100);

        let (sql, params) = if let Some(tag) = tag_filter {
            (
                "SELECT id, name, author, description, github_url, stars, forks, updated_at, tags, security_score, compatibility
                 FROM marketplace_skills
                 WHERE tags LIKE ?1
                 ORDER BY stars DESC, updated_at DESC
                 LIMIT ?2",
                params![format!("%{}%", tag), max_limit as i64]
            )
        } else {
            (
                "SELECT id, name, author, description, github_url, stars, forks, updated_at, tags, security_score, compatibility
                 FROM marketplace_skills
                 ORDER BY stars DESC, updated_at DESC
                 LIMIT ?1",
                params![max_limit as i64]
            )
        };

        let mut stmt = conn.prepare(sql)?;

        let skill_iter = stmt.query_map(params, |row| {
            Ok(MarketplaceSkill {
                id: row.get(0)?,
                name: row.get(1)?,
                author: row.get(2)?,
                description: row.get(3)?,
                github_url: row.get(4)?,
                stars: row.get(5)?,
                forks: row.get(6)?,
                updated_at: row.get(7)?,
                tags: row.get(8)?,
                security_score: row.get(9)?,
                compatibility: row.get(10)?,
                data: None,
            })
        })?;

        let mut results = Vec::new();
        for skill in skill_iter {
            let skill = skill?;
            if min_stars.map_or(true, |min| skill.stars >= min) {
                results.push(MarketplaceSkillDTO::from(skill));
            }
        }

        Ok(results)
    }

    /// Get a single marketplace Skill by ID
    pub fn get_skill(&self, id: &str) -> MarketplaceResult<Option<MarketplaceSkillDTO>> {
        let conn = get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT id, name, author, description, github_url, stars, forks, updated_at, tags, security_score, compatibility
             FROM marketplace_skills
             WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(MarketplaceSkill {
                id: row.get(0)?,
                name: row.get(1)?,
                author: row.get(2)?,
                description: row.get(3)?,
                github_url: row.get(4)?,
                stars: row.get(5)?,
                forks: row.get(6)?,
                updated_at: row.get(7)?,
                tags: row.get(8)?,
                security_score: row.get(9)?,
                compatibility: row.get(10)?,
                data: None,
            })
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
