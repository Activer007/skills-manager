use rusqlite::Connection;
use r2d2_sqlite::SqliteConnectionManager;
use r2d2::Pool;
use std::path::PathBuf;
use anyhow::Result;
use once_cell::sync::OnceCell;

pub type DbPool = Pool<SqliteConnectionManager>;

/// Global database connection pool.
/// OnceCell is thread-safe and r2d2::Pool is already thread-safe internally,
/// so we don't need an additional Mutex layer.
pub static DB_POOL: OnceCell<DbPool> = OnceCell::new();

/// Initialize the database connection pool and run migrations.
/// This should be called once during application startup.
pub fn init_db() -> Result<()> {
    let db_path = get_db_path()?;
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let manager = SqliteConnectionManager::file(db_path);
    let pool = Pool::new(manager)?;

    // Run migrations
    let conn = pool.get()?;
    migrate(&conn)?;

    // Set the global pool
    DB_POOL.set(pool)
        .map_err(|_| anyhow::anyhow!("Database already initialized"))?;

    Ok(())
}

/// Get a database connection from the global pool.
/// This is thread-safe and efficient as it avoids unnecessary locking.
pub fn get_connection() -> Result<r2d2::PooledConnection<SqliteConnectionManager>> {
    DB_POOL
        .get()
        .ok_or_else(|| anyhow::anyhow!("Database not initialized"))?
        .get()
        .map_err(Into::into)
}

fn get_db_path() -> Result<PathBuf> {
    let mut path = dirs::home_dir().ok_or(anyhow::anyhow!("Cannot determine home directory"))?;
    path.push(".claude");
    path.push("skills-manager.db");
    Ok(path)
}

/// Current database schema version
const CURRENT_DB_VERSION: i32 = 4;

/// Run database migrations to ensure schema is up to date.
/// This function creates a schema_migrations table to track version.
fn migrate(conn: &Connection) -> Result<()> {
    // Create schema_migrations table first if it doesn't exist
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Get current version
    let current_version: i32 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    // Run migrations if needed
    if current_version < CURRENT_DB_VERSION {
        log::info!("Database migration: v{} -> v{}", current_version, CURRENT_DB_VERSION);

        // Migration v1: Create initial schema
        if current_version < 1 {
            migrate_v1(conn)?;
            // Record migration
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)",
                [chrono::Utc::now().timestamp_millis()],
            )?;
        }

        // Migration v2: Create cached_reports table for incremental scanning
        if current_version < 2 {
            migrate_v2(conn)?;
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (2, ?)",
                [chrono::Utc::now().timestamp_millis()],
            )?;
        }

        // Migration v3: Create whitelist table
        if current_version < 3 {
            migrate_v3(conn)?;
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (3, ?)",
                [chrono::Utc::now().timestamp_millis()],
            )?;
        }

        // Migration v4: Create repositories and repository_scan_queue tables
        if current_version < 4 {
            migrate_v4(conn)?;
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (4, ?)",
                [chrono::Utc::now().timestamp_millis()],
            )?;
        }
    }

    Ok(())
}

/// Migration v1: Create initial schema for scan history
fn migrate_v1(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS security_scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            skill_id TEXT NOT NULL,
            skill_name TEXT NOT NULL,
            scanned_at INTEGER NOT NULL,
            score INTEGER NOT NULL,
            level TEXT NOT NULL,
            issues_count INTEGER NOT NULL,
            blocked BOOLEAN NOT NULL,
            report_json TEXT NOT NULL
        )",
        [],
    )?;

    // Create indexes for better query performance
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_scan_history_skill_id ON security_scan_history(skill_id)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_at ON security_scan_history(scanned_at DESC)",
        [],
    )?;

    Ok(())
}

/// Migration v2: Create cached_reports table for incremental scanning
fn migrate_v2(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS cached_reports (
            skill_id TEXT PRIMARY KEY,
            skill_path TEXT NOT NULL,
            report_json TEXT NOT NULL,
            checksum TEXT NOT NULL,
            cached_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Create index on checksum for faster lookups
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_cached_reports_checksum ON cached_reports(checksum)",
        [],
    )?;

    log::info!("Created cached_reports table for incremental scanning");
    Ok(())
}

/// Migration v3: Create whitelist table
fn migrate_v3(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS whitelist (
            id TEXT PRIMARY KEY,
            entry_type TEXT NOT NULL,
            target TEXT NOT NULL,
            reason TEXT,
            added_at TEXT NOT NULL,
            UNIQUE(entry_type, target)
        )",
        [],
    )?;

    // Create indexes
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_whitelist_target ON whitelist(target)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_whitelist_type ON whitelist(entry_type)",
        [],
    )?;

    log::info!("Created whitelist table");
    Ok(())
}

/// Migration v4: Create repositories and repository_scan_queue tables for multi-source repository management
fn migrate_v4(conn: &Connection) -> Result<()> {
    // Create repositories table to store repository metadata
    // Note: Using INTEGER for timestamps (Unix milliseconds) for consistency with V1
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
            category TEXT DEFAULT 'custom'
        )",
        [],
    )?;

    // Create repository_scan_queue table for scan task queue
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

    // Create indexes for better query performance
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_repositories_url ON repositories(url)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_repositories_category ON repositories(category)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_repositories_enabled ON repositories(enabled)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_scan_queue_status ON repository_scan_queue(status)",
        [],
    )?;
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_scan_queue_repository_id ON repository_scan_queue(repository_id)",
        [],
    )?;

    log::info!("Created repositories and repository_scan_queue tables for multi-source repository management");
    Ok(())
}
