use rusqlite::{Connection, params};
use r2d2_sqlite::SqliteConnectionManager;
use r2d2::Pool;
use std::path::PathBuf;
use anyhow::Result;
use once_cell::sync::OnceCell;
use crate::models::security::SecurityReport;

pub type DbPool = Pool<SqliteConnectionManager>;

/// Global database connection pool.
pub static DB_POOL: OnceCell<DbPool> = OnceCell::new();

/// Initialize the database connection pool and schema.
/// This should be called once during application startup.
/// NOTE: Since we are in dev phase, we use a "clean slate" approach.
/// Existing databases with old schemas might fail or be incompatible.
/// Please delete ~/.claude/skills-manager.db if you encounter schema issues.
pub fn init_db() -> Result<()> {
    let db_path = get_db_path()?;
    log::info!("Initializing database at path: {:?}", db_path);

    if let Some(parent) = db_path.parent() {
        if !parent.exists() {
            log::debug!("Creating database directory: {:?}", parent);
            std::fs::create_dir_all(parent)?;
        }
    }

    let manager = SqliteConnectionManager::file(&db_path);
    log::debug!("Creating database connection pool...");
    let pool = Pool::new(manager).map_err(|e| {
        log::error!("Failed to create database pool: {}", e);
        e
    })?;

    // Initialize Schema
    log::debug!("Initializing database schema...");
    let conn = pool.get().map_err(|e| {
        log::error!("Failed to get connection from pool: {}", e);
        e
    })?;

    match init_schema(&conn) {
        Ok(_) => log::info!("Database schema initialized successfully"),
        Err(e) => {
            log::error!("Failed to initialize database schema: {:?}", e);
            return Err(e);
        }
    }

    if let Err(e) = ensure_repository_schema(&conn) {
        log::error!("Failed to ensure repository schema: {:?}", e);
        return Err(e);
    }

    // Set the global pool
    log::debug!("Setting global database pool...");
    DB_POOL.set(pool)
        .map_err(|_| {
            log::error!("Database already initialized (OnceCell error)");
            anyhow::anyhow!("Database already initialized")
        })?;

    log::info!("Database initialization completed");
    Ok(())
}

/// Get a database connection from the global pool.
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

/// Define and create the complete database schema (V11+) directly.
fn init_schema(conn: &Connection) -> Result<()> {
    // Enable Foreign Keys
    conn.execute("PRAGMA foreign_keys = ON;", [])?;

    // ==================================================================================
    // 1. Security & Caching
    // ==================================================================================

    // Security Scan History
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
    conn.execute("CREATE INDEX IF NOT EXISTS idx_scan_history_skill_id ON security_scan_history(skill_id)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_at ON security_scan_history(scanned_at DESC)", [])?;

    // Cached Reports
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
    conn.execute("CREATE INDEX IF NOT EXISTS idx_cached_reports_checksum ON cached_reports(checksum)", [])?;

    // Whitelist
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
    conn.execute("CREATE INDEX IF NOT EXISTS idx_whitelist_target ON whitelist(target)", [])?;

    // ==================================================================================
    // 2. Repositories (Unified Architecture)
    // ==================================================================================

    // Repositories Table (Enhanced with V11 fields directly)
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
            -- New fields from V11
            source_type TEXT DEFAULT 'user',
            priority INTEGER DEFAULT 100,
            scan_status TEXT DEFAULT 'pending',
            etag TEXT
        )",
        [],
    )?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_repositories_url ON repositories(url)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_repositories_category ON repositories(category)", [])?;

    // Repository Scan Queue
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
    conn.execute("CREATE INDEX IF NOT EXISTS idx_scan_queue_status ON repository_scan_queue(status)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_scan_queue_repository_id ON repository_scan_queue(repository_id)", [])?;

    // ==================================================================================
    // 3. Marketplace (Unified Architecture)
    // ==================================================================================

    // Marketplace Skills (V11 Structure)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS marketplace_skills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            author TEXT,
            description TEXT,
            skill_path TEXT NOT NULL,
            repository_id TEXT NOT NULL,
            version TEXT,
            stars INTEGER DEFAULT 0,
            forks INTEGER DEFAULT 0,
            updated_at INTEGER,
            tags TEXT,
            config_schema TEXT,
            quality_score INTEGER,
            security_score INTEGER,
            discovered_at INTEGER NOT NULL,
            synced_at INTEGER NOT NULL,
            FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
            UNIQUE(repository_id, skill_path)
        )",
        [],
    )?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_marketplace_skills_stars ON marketplace_skills(stars DESC)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_marketplace_skills_updated ON marketplace_skills(updated_at DESC)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_marketplace_skills_repo ON marketplace_skills(repository_id)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_marketplace_skills_name_author ON marketplace_skills(name, author)", [])?;

    // FTS5 Virtual Table & Triggers
    conn.execute(
        "CREATE VIRTUAL TABLE IF NOT EXISTS marketplace_skills_fts USING fts5(
            name,
            description,
            author,
            tags,
            content='marketplace_skills',
            content_rowid='rowid'
        )",
        [],
    )?;

    // Triggers for FTS sync
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS marketplace_skills_ai AFTER INSERT ON marketplace_skills BEGIN
            INSERT INTO marketplace_skills_fts(rowid, name, description, author, tags)
            VALUES (new.rowid, new.name, new.description, new.author, new.tags);
        END",
        [],
    )?;
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS marketplace_skills_ad AFTER DELETE ON marketplace_skills BEGIN
            INSERT INTO marketplace_skills_fts(marketplace_skills_fts, rowid, name, description, author, tags)
            VALUES('delete', old.rowid, old.name, old.description, old.author, old.tags);
        END",
        [],
    )?;
    conn.execute(
        "CREATE TRIGGER IF NOT EXISTS marketplace_skills_au AFTER UPDATE ON marketplace_skills BEGIN
            INSERT INTO marketplace_skills_fts(marketplace_skills_fts, rowid, name, description, author, tags)
            VALUES('delete', old.rowid, old.name, old.description, old.author, old.tags);
            INSERT INTO marketplace_skills_fts(rowid, name, description, author, tags)
            VALUES (new.rowid, new.name, new.description, new.author, new.tags);
        END",
        [],
    )?;

    // ==================================================================================
    // 4. Installed Skills (Unified Architecture)
    // ==================================================================================

    conn.execute(
        "CREATE TABLE IF NOT EXISTS installed_skills (
            id TEXT PRIMARY KEY,
            marketplace_skill_id TEXT,
            original_repository_id TEXT,
            original_repository_name TEXT,
            original_repository_url TEXT,
            original_skill_path TEXT,
            original_author TEXT,
            original_source_type TEXT,
            name TEXT NOT NULL,
            local_path TEXT NOT NULL,
            installed_at INTEGER NOT NULL,
            enabled INTEGER DEFAULT 1,
            FOREIGN KEY (marketplace_skill_id) REFERENCES marketplace_skills(id) ON DELETE SET NULL
        )",
        [],
    )?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_installed_skills_name ON installed_skills(name)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_installed_skills_local_path ON installed_skills(local_path)", [])?;

    // ==================================================================================
    // 5. Collections
    // ==================================================================================

    conn.execute(
        "CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            author TEXT,
            icon TEXT,
            color TEXT,
            is_public BOOLEAN DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_collections_created ON collections(created_at DESC)", [])?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS collection_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            skill_name TEXT NOT NULL,
            skill_path TEXT,
            skill_identifier TEXT,
            added_at INTEGER NOT NULL,
            note TEXT,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
        )",
        [],
    )?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_collection_items_coll_id ON collection_items(collection_id)", [])?;

    // ==================================================================================
    // 6. Social, Sharing & Publishing
    // ==================================================================================

    // Skill Forks
    conn.execute(
        "CREATE TABLE IF NOT EXISTS skill_forks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            child_skill_id TEXT NOT NULL,
            child_skill_name TEXT NOT NULL,
            child_skill_path TEXT NOT NULL,
            parent_skill_id TEXT NOT NULL,
            parent_skill_name TEXT NOT NULL,
            parent_skill_path TEXT,
            fork_type TEXT NOT NULL DEFAULT 'fork',
            fork_reason TEXT,
            author TEXT,
            created_at INTEGER NOT NULL
        )",
        [],
    )?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_skill_forks_child ON skill_forks(child_skill_id)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_skill_forks_parent ON skill_forks(parent_skill_id)", [])?;

    // Fork Stats View
    conn.execute(
        "CREATE VIEW IF NOT EXISTS skill_fork_stats AS
        SELECT
            parent_skill_id,
            parent_skill_name,
            COUNT(*) as fork_count,
            COUNT(CASE WHEN fork_type = 'fork' THEN 1 END) as fork_count_only,
            COUNT(CASE WHEN fork_type = 'remix' THEN 1 END) as remix_count,
            MAX(created_at) as last_forked_at
        FROM skill_forks
        GROUP BY parent_skill_id, parent_skill_name",
        [],
    )?;

    // Lineage Depth
    conn.execute(
        "CREATE TABLE IF NOT EXISTS skill_lineage_depth (
            skill_id TEXT PRIMARY KEY,
            depth INTEGER NOT NULL DEFAULT 0,
            root_skill_id TEXT,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Creators
    conn.execute(
        "CREATE TABLE IF NOT EXISTS creators (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            avatar_url TEXT,
            bio TEXT,
            github_url TEXT,
            website_url TEXT,
            skill_count INTEGER DEFAULT 0,
            verified BOOLEAN DEFAULT 0,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    // Followed Creators
    conn.execute(
        "CREATE TABLE IF NOT EXISTS followed_creators (
            creator_id TEXT PRIMARY KEY,
            followed_at INTEGER NOT NULL,
            FOREIGN KEY(creator_id) REFERENCES creators(id) ON DELETE CASCADE
        )",
        [],
    )?;

    // Shares
    conn.execute(
        "CREATE TABLE IF NOT EXISTS shares (
            share_id TEXT PRIMARY KEY,
            target_type TEXT NOT NULL,
            target_id TEXT NOT NULL,
            visibility TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT,
            metadata TEXT NOT NULL
        )",
        [],
    )?;

    // Publish History
    conn.execute(
        "CREATE TABLE IF NOT EXISTS publish_history (
            id TEXT PRIMARY KEY,
            skill_id TEXT NOT NULL,
            skill_name TEXT NOT NULL,
            version TEXT NOT NULL,
            published_at INTEGER NOT NULL,
            status TEXT NOT NULL,
            error_message TEXT,
            repository_url TEXT,
            tag_name TEXT,
            commit_sha TEXT,
            release_url TEXT,
            metadata TEXT
        )",
        [],
    )?;

    // ==================================================================================
    // 7. Views
    // ==================================================================================

    // View: marketplace skills with source information
    conn.execute(
        "CREATE VIEW IF NOT EXISTS v_marketplace_skills_with_source AS
        SELECT DISTINCT
            ms.id,
            ms.name,
            ms.description,
            ms.author,
            ms.stars,
            ms.forks,
            ms.updated_at as skill_updated_at,
            ms.tags,
            ms.quality_score,
            ms.security_score,
            ms.repository_id,
            r.name as repository_name,
            r.source_type,
            r.priority,
            ms.skill_path,
            ms.discovered_at,
            ms.synced_at
        FROM marketplace_skills ms
        JOIN repositories r ON ms.repository_id = r.id
        WHERE r.enabled = 1
        ORDER BY ms.stars DESC",
        [],
    )?;

    // View: primary marketplace skills (namespace deduplication with ROW_NUMBER)
    conn.execute(
        "CREATE VIEW IF NOT EXISTS v_primary_marketplace_skills AS
        WITH ranked_skills AS (
            SELECT
                ms.id,
                ms.name,
                ms.description,
                ms.author,
                ms.stars,
                ms.forks,
                r.source_type,
                r.priority,
                ROW_NUMBER() OVER (
                    PARTITION BY ms.name, ms.author
                    ORDER BY r.priority ASC, ms.discovered_at ASC
                ) as rn
            FROM marketplace_skills ms
            JOIN repositories r ON ms.repository_id = r.id
            WHERE r.enabled = 1
        )
        SELECT * FROM ranked_skills WHERE rn = 1",
        [],
    )?;

    Ok(())
}

fn ensure_repository_schema(conn: &Connection) -> Result<()> {
    let has_column = |table: &str, col: &str| -> Result<bool> {
        let count: i32 = conn.query_row(
            &format!("SELECT COUNT(*) FROM pragma_table_info('{}') WHERE name = '{}'", table, col),
            [],
            |row| row.get(0),
        )?;
        Ok(count > 0)
    };

    // Only attempt fixes if repositories table exists.
    let repositories_exists: i32 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'repositories'",
        [],
        |row| row.get(0),
    )?;
    if repositories_exists == 0 {
        return Ok(());
    }

    let has_source_type = has_column("repositories", "source_type")?;
    let has_priority = has_column("repositories", "priority")?;
    let has_scan_status = has_column("repositories", "scan_status")?;
    let has_etag = has_column("repositories", "etag")?;
    let has_featured = has_column("repositories", "featured")?;

    if !has_source_type {
        conn.execute(
            "ALTER TABLE repositories ADD COLUMN source_type TEXT DEFAULT 'user'",
            [],
        )?;
    }

    if !has_priority {
        conn.execute(
            "ALTER TABLE repositories ADD COLUMN priority INTEGER DEFAULT 100",
            [],
        )?;
    }

    if !has_scan_status {
        conn.execute(
            "ALTER TABLE repositories ADD COLUMN scan_status TEXT DEFAULT 'pending'",
            [],
        )?;
    }

    if !has_etag {
        conn.execute(
            "ALTER TABLE repositories ADD COLUMN etag TEXT",
            [],
        )?;
    }

    if has_featured {
        conn.execute(
            "UPDATE repositories
             SET source_type = CASE WHEN featured = 1 THEN 'featured' ELSE 'user' END
             WHERE source_type IS NULL OR source_type = ''",
            [],
        )?;

        conn.execute(
            "UPDATE repositories
             SET priority = CASE WHEN featured = 1 THEN 10 ELSE 100 END
             WHERE priority IS NULL",
            [],
        )?;
    } else {
        conn.execute(
            "UPDATE repositories
             SET source_type = 'user'
             WHERE source_type IS NULL OR source_type = ''",
            [],
        )?;

        conn.execute(
            "UPDATE repositories
             SET priority = 100
             WHERE priority IS NULL",
            [],
        )?;
    }

    conn.execute(
        "UPDATE repositories
         SET scan_status = 'pending'
         WHERE scan_status IS NULL OR scan_status = ''",
        [],
    )?;

    // Ensure indices for new columns (moved from init_schema to handle migration correctly)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_repos_source_type ON repositories(source_type)", [])?;
    conn.execute("CREATE INDEX IF NOT EXISTS idx_repos_priority ON repositories(priority)", [])?;

    Ok(())
}

// Helper methods for cache operations (Keep existing ones)

pub fn save_cached_report(skill_id: &str, skill_path: &str, report: &SecurityReport, checksum: &str) -> Result<()> {
    let conn = get_connection()?;
    let report_json = serde_json::to_string(report)?;
    let now = chrono::Utc::now().timestamp();

    conn.execute(
        "INSERT OR REPLACE INTO cached_reports (skill_id, skill_path, report_json, checksum, cached_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![skill_id, skill_path, report_json, checksum, now],
    )?;
    Ok(())
}

pub fn get_cached_report_by_path(skill_path: &str) -> Result<Option<(SecurityReport, String, i64)>> {
    let conn = get_connection()?;
    let mut stmt = conn.prepare("SELECT report_json, checksum, cached_at FROM cached_reports WHERE skill_path = ?1")?;
    let mut rows = stmt.query(params![skill_path])?;

    if let Some(row) = rows.next()? {
        let report_json: String = row.get(0)?;
        let checksum: String = row.get(1)?;
        let cached_at: i64 = row.get(2)?;
        match serde_json::from_str(&report_json) {
            Ok(report) => Ok(Some((report, checksum, cached_at))),
            Err(e) => {
                log::warn!("Failed to parse cached report for {}, cleaning up: {}", skill_path, e);
                let _ = delete_cached_report(skill_path);
                Ok(None)
            }
        }
    } else {
        Ok(None)
    }
}

pub fn delete_cached_report(skill_path: &str) -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM cached_reports WHERE skill_path = ?1", params![skill_path])?;
    Ok(())
}

pub fn clear_all_cached_reports() -> Result<()> {
    let conn = get_connection()?;
    conn.execute("DELETE FROM cached_reports", [])?;
    Ok(())
}

pub fn prune_expired_reports(ttl_seconds: u64) -> Result<usize> {
    let conn = get_connection()?;
    let now = chrono::Utc::now().timestamp();
    let threshold = now - (ttl_seconds as i64);
    let count = conn.execute("DELETE FROM cached_reports WHERE cached_at < ?1", params![threshold])?;
    Ok(count)
}

pub fn get_cache_stats_db() -> Result<usize> {
     let conn = get_connection()?;
     let count: usize = conn.query_row("SELECT COUNT(*) FROM cached_reports", [], |row| row.get(0))?;
     Ok(count)
}
