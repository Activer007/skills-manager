//! Test helper utilities for database tests
//!
//! This module provides utilities for creating isolated test databases
//! to ensure tests don't interfere with each other.

use anyhow::Result;
use std::sync::{Mutex, OnceLock};
use tempfile::NamedTempFile;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;

use crate::services::db::DB_POOL;

/// Test database holder
struct TestDb {
    _temp_file: NamedTempFile,
}

/// Global test database lock to ensure tests don't run concurrently
static TEST_DB_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

/// Get the test database lock
fn get_test_lock() -> &'static Mutex<()> {
    TEST_DB_LOCK.get_or_init(|| Mutex::new(()))
}

/// Initialize a test database with a fresh temporary file
/// Call this at the beginning of each test for full isolation
///
/// # Example
/// ```no_run
/// #[test]
/// fn test_something() {
///     let _lock = setup_test_db().unwrap();
///     // ... test code ...
/// }
/// ```
///
/// # Returns
/// A RAII guard that cleans up the database when dropped
pub fn setup_test_db() -> Result<TestDbGuard> {
    // Acquire lock to prevent concurrent tests
    let _lock = get_test_lock().lock().unwrap();

    // Create a temporary file for the database
    let temp_file = NamedTempFile::new()?;

    // Create connection pool
    let manager = SqliteConnectionManager::file(temp_file.path());
    let pool = Pool::new(manager)?;

    // Run all migrations (v1-v11)
    let conn = pool.get()?;
    run_test_migrations(&conn)?;

    // Try to set the global pool
    // If it's already set (by a previous test), we'll get an error
    let pool_set = DB_POOL.try_insert(pool.clone());

    if pool_set.is_err() {
        // DB_POOL is already set, we'll use it
        log::warn!("DB_POOL already initialized, using existing pool for test");
    }

    Ok(TestDbGuard {
        _temp_file: temp_file,
        _lock: Some(get_test_lock().lock().unwrap()),
    })
}

/// RAII guard for test database
/// Automatically cleans up when dropped
pub struct TestDbGuard {
    _temp_file: NamedTempFile,
    _lock: Option<std::sync::MutexGuard<'static, ()>>,
}

impl Drop for TestDbGuard {
    fn drop(&mut self) {
        // Temporary file is automatically deleted here
        log::debug!("Test database cleaned up");
    }
}

/// Run migrations for test database (simplified version, includes all required tables)
fn run_test_migrations(conn: &r2d2::PooledConnection<r2d2_sqlite::SqliteConnectionManager>) -> Result<()> {
    use rusqlite::Connection;

    // Create schema_migrations table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Create repositories table (v4 + v11 enhancements)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS repositories (
            id TEXT PRIMARY KEY,
            url TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            description TEXT,
            enabled INTEGER DEFAULT 1,
            scan_subdirs INTEGER DEFAULT 0,
            added_at INTEGER NOT NULL,
            last_scanned INTEGER,
            cache_path TEXT,
            cached_commit_sha TEXT,
            featured INTEGER DEFAULT 0,
            category TEXT DEFAULT 'custom',
            source_type TEXT DEFAULT 'user',
            priority INTEGER DEFAULT 100,
            scan_status TEXT DEFAULT 'pending',
            etag TEXT
        )",
        [],
    )?;

    // Create repository_scan_queue table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS repository_scan_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            repository_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at INTEGER NOT NULL,
            started_at INTEGER,
            completed_at INTEGER,
            error_message TEXT,
            skills_found INTEGER DEFAULT 0,
            FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Create marketplace_skills table (v9 + v11 enhancements)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS marketplace_skills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            author TEXT,
            description TEXT,
            skill_path TEXT,
            repository_id TEXT,
            github_url TEXT,
            version TEXT,
            stars INTEGER DEFAULT 0,
            forks INTEGER DEFAULT 0,
            updated_at INTEGER NOT NULL,
            tags TEXT,
            security_score INTEGER,
            compatibility TEXT,
            config_schema TEXT,
            quality_score INTEGER,
            discovered_at INTEGER NOT NULL,
            synced_at INTEGER NOT NULL,
            data TEXT,
            FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Create FTS5 table
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS marketplace_skills_fts USING fts5(
            name,
            description,
            author,
            tags,
            skill_id UNINDEXED
        )",
        [],
    )?;

    // Create FTS triggers
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS marketplace_skills_ai AFTER INSERT ON marketplace_skills BEGIN
            INSERT INTO marketplace_skills_fts(rowid, name, description, author, tags, skill_id)
            VALUES (new.rowid, new.name, new.description, COALESCE(new.author, ''), new.tags, new.id);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS marketplace_skills_ad AFTER DELETE ON marketplace_skills BEGIN
            INSERT INTO marketplace_skills_fts(marketplace_skills_fts, rowid, name, description, author, tags, skill_id)
            VALUES('delete', old.rowid, old.name, old.description, COALESCE(old.author, ''), old.tags, old.id);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS marketplace_skills_au AFTER UPDATE ON marketplace_skills BEGIN
            INSERT INTO marketplace_skills_fts(marketplace_skills_fts, rowid, name, description, author, tags, skill_id)
            VALUES('delete', old.rowid, old.name, old.description, COALESCE(old.author, ''), old.tags, old.id);
            INSERT INTO marketplace_skills_fts(rowid, name, description, author, tags, skill_id)
            VALUES (new.rowid, new.name, new.description, COALESCE(new.author, ''), new.tags, new.id);
        END",
        [],
    )?;

    // Create indexes
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_repositories_url ON repositories(url)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_repositories_enabled ON repositories(enabled)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_marketplace_skills_stars ON marketplace_skills(stars DESC)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_marketplace_skills_repository ON marketplace_skills(repository_id)",
        [],
    )?;

    // Create installed_skills table (v11)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS installed_skills (
            id TEXT PRIMARY KEY,
            skill_path TEXT NOT NULL UNIQUE,
            skill_name TEXT NOT NULL,
            marketplace_skill_id TEXT,
            original_repository_id TEXT,
            author TEXT,
            description TEXT,
            version TEXT,
            installed_at INTEGER NOT NULL,
            last_updated INTEGER,
            metadata TEXT,
            FOREIGN KEY (marketplace_skill_id) REFERENCES marketplace_skills(id) ON DELETE SET NULL,
            FOREIGN KEY (original_repository_id) REFERENCES repositories(id) ON DELETE SET NULL
        )",
        [],
    )?;

    // Record migration as complete
    conn.execute(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (11, ?)",
        [chrono::Utc::now().timestamp_millis()],
    )?;

    log::info!("Test database migrations completed successfully");

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_setup_and_cleanup() {
        // Test 1: Create database
        let _guard = setup_test_db().unwrap();
        let conn = crate::services::db::get_connection().unwrap();
        assert!(conn.execute("SELECT COUNT(*) FROM repositories", []).is_ok());

        // Guard is dropped here, database is cleaned up
    }
}
