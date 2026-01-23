//! Repository service for database operations
//!
//! This module provides CRUD operations for repositories and scan queue entries.

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use rusqlite::params;

use crate::models::repository::{Repository, RepositoryCategory, ScanQueueEntry, ScanStatus};
use crate::services::db::get_connection;

/// Service for managing repositories in the database
pub struct RepositoryService;

impl RepositoryService {
    /// Create a new RepositoryService instance
    pub fn new() -> Self {
        Self
    }

    /// Add a new repository to the database
    pub fn add_repository(&self, repo: &Repository) -> Result<String> {
        let conn = get_connection()?;

        conn.execute(
            "INSERT OR IGNORE INTO repositories
            (id, url, name, description, enabled, scan_subdirs, added_at, last_scanned,
             cache_path, cached_commit_sha, featured, category)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                repo.id,
                repo.url,
                repo.name,
                repo.description,
                repo.enabled as i32,
                repo.scan_subdirs as i32,
                repo.added_at.timestamp_millis(),
                repo.last_scanned.as_ref().map(|d| d.timestamp_millis()),
                repo.cache_path,
                repo.cached_commit_sha,
                repo.featured as i32,
                repo.category.to_string(),
            ],
        ).context("Failed to insert repository")?;

        Ok(repo.id.clone())
    }

    /// Get a repository by ID
    pub fn get_repository(&self, id: &str) -> Result<Option<Repository>> {
        let conn = get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT id, url, name, description, enabled, scan_subdirs, added_at,
             last_scanned, cache_path, cached_commit_sha, featured, category
             FROM repositories WHERE id = ?1"
        )?;

        let result = stmt.query_row(params![id], |row| {
            Ok(self.row_to_repository(row)?)
        });

        match result {
            Ok(repo) => Ok(Some(repo)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// Get a repository by URL
    pub fn get_repository_by_url(&self, url: &str) -> Result<Option<Repository>> {
        let conn = get_connection()?;
        let normalized_url = url.trim_end_matches('/');

        let mut stmt = conn.prepare(
            "SELECT id, url, name, description, enabled, scan_subdirs, added_at,
             last_scanned, cache_path, cached_commit_sha, featured, category
             FROM repositories WHERE url = ?1 OR url = ?2"
        )?;

        let result = stmt.query_row(params![url, normalized_url], |row| {
            Ok(self.row_to_repository(row)?)
        });

        match result {
            Ok(repo) => Ok(Some(repo)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// List all repositories
    pub fn list_repositories(&self) -> Result<Vec<Repository>> {
        let conn = get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT id, url, name, description, enabled, scan_subdirs, added_at,
             last_scanned, cache_path, cached_commit_sha, featured, category
             FROM repositories ORDER BY featured DESC, added_at DESC"
        )?;

        let repos = stmt.query_map([], |row| {
            Ok(self.row_to_repository(row)?)
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(repos)
    }

    /// List enabled repositories
    pub fn list_enabled_repositories(&self) -> Result<Vec<Repository>> {
        let conn = get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT id, url, name, description, enabled, scan_subdirs, added_at,
             last_scanned, cache_path, cached_commit_sha, featured, category
             FROM repositories WHERE enabled = 1 ORDER BY featured DESC, added_at DESC"
        )?;

        let repos = stmt.query_map([], |row| {
            Ok(self.row_to_repository(row)?)
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(repos)
    }

    /// Update a repository
    pub fn update_repository(&self, repo: &Repository) -> Result<()> {
        let conn = get_connection()?;

        conn.execute(
            "UPDATE repositories SET
             name = ?1, description = ?2, enabled = ?3, scan_subdirs = ?4,
             last_scanned = ?5, cache_path = ?6, cached_commit_sha = ?7,
             featured = ?8, category = ?9
             WHERE id = ?10",
            params![
                repo.name,
                repo.description,
                repo.enabled as i32,
                repo.scan_subdirs as i32,
                repo.last_scanned.as_ref().map(|d| d.timestamp_millis()),
                repo.cache_path,
                repo.cached_commit_sha,
                repo.featured as i32,
                repo.category.to_string(),
                repo.id,
            ],
        ).context("Failed to update repository")?;

        Ok(())
    }

    /// Update repository cache information after a scan
    pub fn update_repository_cache(
        &self,
        id: &str,
        cache_path: &str,
        last_scanned: DateTime<Utc>,
        commit_sha: Option<&str>,
    ) -> Result<()> {
        let conn = get_connection()?;

        conn.execute(
            "UPDATE repositories SET
             cache_path = ?1, last_scanned = ?2, cached_commit_sha = ?3
             WHERE id = ?4",
            params![
                cache_path,
                last_scanned.timestamp_millis(),
                commit_sha,
                id,
            ],
        ).context("Failed to update repository cache")?;

        Ok(())
    }

    /// Delete a repository by ID (cascades to scan queue)
    pub fn delete_repository(&self, id: &str) -> Result<u64> {
        let conn = get_connection()?;

        // Delete scan queue entries first (manual cascade for safety)
        conn.execute(
            "DELETE FROM repository_scan_queue WHERE repository_id = ?1",
            params![id],
        )?;

        // Delete the repository
        let deleted = conn.execute(
            "DELETE FROM repositories WHERE id = ?1",
            params![id],
        )?;

        Ok(deleted as u64)
    }

    /// Get IDs of repositories that haven't been scanned yet
    pub fn get_unscanned_repository_ids(&self) -> Result<Vec<String>> {
        let conn = get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT id FROM repositories WHERE last_scanned IS NULL AND enabled = 1"
        )?;

        let ids = stmt.query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;

        Ok(ids)
    }

    /// Check if a repository URL already exists
    pub fn repository_exists(&self, url: &str) -> Result<bool> {
        let conn = get_connection()?;
        let normalized_url = url.trim_end_matches('/');

        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM repositories WHERE url = ?1 OR url = ?2",
            params![url, normalized_url],
            |row| row.get(0),
        )?;

        Ok(count > 0)
    }

    /// Toggle repository enabled state
    pub fn toggle_repository_enabled(&self, id: &str, enabled: bool) -> Result<()> {
        let conn = get_connection()?;

        conn.execute(
            "UPDATE repositories SET enabled = ?1 WHERE id = ?2",
            params![enabled as i32, id],
        )?;

        Ok(())
    }

    /// Get repository count
    pub fn get_repository_count(&self) -> Result<i32> {
        let conn = get_connection()?;

        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM repositories",
            [],
            |row| row.get(0),
        )?;

        Ok(count)
    }

    // ==================== Scan Queue Operations ====================

    /// Add a scan task to the queue
    pub fn add_scan_task(&self, repository_id: &str) -> Result<i64> {
        let conn = get_connection()?;

        conn.execute(
            "INSERT INTO repository_scan_queue (repository_id, status, created_at)
             VALUES (?1, ?2, ?3)",
            params![
                repository_id,
                ScanStatus::Pending.to_string(),
                Utc::now().timestamp_millis(),
            ],
        )?;

        Ok(conn.last_insert_rowid())
    }

    /// Update scan task status
    pub fn update_scan_status(
        &self,
        task_id: i64,
        status: ScanStatus,
        error_message: Option<&str>,
        skills_found: Option<i32>,
    ) -> Result<()> {
        let conn = get_connection()?;

        let now = Utc::now().timestamp_millis();

        match status {
            ScanStatus::Running => {
                conn.execute(
                    "UPDATE repository_scan_queue SET status = ?1, started_at = ?2 WHERE id = ?3",
                    params![status.to_string(), now, task_id],
                )?;
            }
            ScanStatus::Completed | ScanStatus::Failed => {
                conn.execute(
                    "UPDATE repository_scan_queue SET
                     status = ?1, completed_at = ?2, error_message = ?3, skills_found = ?4
                     WHERE id = ?5",
                    params![
                        status.to_string(),
                        now,
                        error_message,
                        skills_found.unwrap_or(0),
                        task_id
                    ],
                )?;
            }
            ScanStatus::Pending => {
                conn.execute(
                    "UPDATE repository_scan_queue SET status = ?1 WHERE id = ?2",
                    params![status.to_string(), task_id],
                )?;
            }
        }

        Ok(())
    }

    /// Get pending scan tasks
    pub fn get_pending_scan_tasks(&self) -> Result<Vec<ScanQueueEntry>> {
        let conn = get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT id, repository_id, status, created_at, started_at, completed_at,
             error_message, skills_found
             FROM repository_scan_queue
             WHERE status = 'pending'
             ORDER BY created_at ASC"
        )?;

        let entries = stmt.query_map([], |row| {
            Ok(self.row_to_scan_queue_entry(row)?)
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    /// Clean up old completed scan tasks (keep last N per repository)
    pub fn cleanup_old_scan_tasks(&self, keep_per_repo: i32) -> Result<u64> {
        let conn = get_connection()?;

        let deleted = conn.execute(
            "DELETE FROM repository_scan_queue
             WHERE id NOT IN (
                SELECT id FROM (
                    SELECT id, ROW_NUMBER() OVER (
                        PARTITION BY repository_id ORDER BY created_at DESC
                    ) as rn
                    FROM repository_scan_queue
                ) WHERE rn <= ?1
             )",
            params![keep_per_repo],
        )?;

        Ok(deleted as u64)
    }

    // ==================== Helper Methods ====================

    fn row_to_repository(&self, row: &rusqlite::Row) -> rusqlite::Result<Repository> {
        let added_at_millis: i64 = row.get(6)?;
        let last_scanned_millis: Option<i64> = row.get(7)?;
        let category_str: String = row.get(11)?;

        Ok(Repository {
            id: row.get(0)?,
            url: row.get(1)?,
            name: row.get(2)?,
            description: row.get(3)?,
            enabled: row.get::<_, i32>(4)? == 1,
            scan_subdirs: row.get::<_, i32>(5)? == 1,
            added_at: DateTime::from_timestamp_millis(added_at_millis)
                .unwrap_or_else(|| Utc::now()),
            last_scanned: last_scanned_millis
                .and_then(DateTime::from_timestamp_millis),
            cache_path: row.get(8)?,
            cached_commit_sha: row.get(9)?,
            featured: row.get::<_, i32>(10)? == 1,
            category: category_str.parse().unwrap_or(RepositoryCategory::Custom),
        })
    }

    fn row_to_scan_queue_entry(&self, row: &rusqlite::Row) -> rusqlite::Result<ScanQueueEntry> {
        let status_str: String = row.get(2)?;
        let created_at_millis: i64 = row.get(3)?;
        let started_at_millis: Option<i64> = row.get(4)?;
        let completed_at_millis: Option<i64> = row.get(5)?;

        Ok(ScanQueueEntry {
            id: row.get(0)?,
            repository_id: row.get(1)?,
            status: status_str.parse().unwrap_or(ScanStatus::Pending),
            created_at: DateTime::from_timestamp_millis(created_at_millis)
                .unwrap_or_else(|| Utc::now()),
            started_at: started_at_millis
                .and_then(DateTime::from_timestamp_millis),
            completed_at: completed_at_millis
                .and_then(DateTime::from_timestamp_millis),
            error_message: row.get(6)?,
            skills_found: row.get(7)?,
        })
    }
}

impl Default for RepositoryService {
    fn default() -> Self {
        Self::new()
    }
}
