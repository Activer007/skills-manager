use rusqlite::Connection;
use r2d2_sqlite::SqliteConnectionManager;
use r2d2::Pool;
use std::path::PathBuf;
use anyhow::Result;
use once_cell::sync::Lazy;
use std::sync::Mutex;

pub type DbPool = Pool<SqliteConnectionManager>;

pub static DB_POOL: Lazy<Mutex<Option<DbPool>>> = Lazy::new(|| Mutex::new(None));

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

    let mut global_pool = DB_POOL.lock().unwrap();
    *global_pool = Some(pool);

    Ok(())
}

pub fn get_connection() -> Result<r2d2::PooledConnection<SqliteConnectionManager>> {
    let pool = {
        let pool_guard = DB_POOL.lock().unwrap();
        pool_guard.as_ref().ok_or(anyhow::anyhow!("Database not initialized"))?.clone()
    };
    Ok(pool.get()?)
}

fn get_db_path() -> Result<PathBuf> {
    let mut path = dirs::home_dir().ok_or(anyhow::anyhow!("Cannot determine home directory"))?;
    path.push(".claude");
    path.push("skills-manager.db");
    Ok(path)
}

fn migrate(conn: &Connection) -> Result<()> {
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

    // Create indexes
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
