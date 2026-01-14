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
const CURRENT_DB_VERSION: i32 = 1;

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
        println!("Database migration: v{} -> v{}", current_version, CURRENT_DB_VERSION);

        // Migration v1: Create initial schema
        if current_version < 1 {
            migrate_v1(conn)?;
            // Record migration
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)",
                [chrono::Utc::now().timestamp_millis()],
            )?;
        }

        // Future migrations would go here:
        // if current_version < 2 { migrate_v2(conn)?; ... }
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
