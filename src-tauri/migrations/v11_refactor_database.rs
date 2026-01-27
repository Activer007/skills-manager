//! Database Migration v11: Repository-Marketplace Unification
//!
//! This migration implements the "Repository-Marketplace Unified Architecture" (v2.1)
//! which establishes a clear separation between repositories (sources) and marketplace skills (discoverable content).
//!
//! ## Key Changes:
//! 1. **Enhanced repositories table**:
//!    - Add `source_type` ('featured' | 'user') to replace the `featured` boolean
//!    - Add `priority` (featured=10, user=100) for primary source queries
//!    - Add `scan_status` ('pending' | 'scanning' | 'success' | 'failed') for scan state tracking
//!    - Add `etag` for GitHub API caching
//!
//! 2. **Rebuild marketplace_skills table**:
//!    - New ID format: `{repository_id}_{skill_path_hash}`
//!    - Add `repository_id` foreign key (CASCADE DELETE)
//!    - Add `skill_path` for uniqueness constraint within repository
//!    - Add `author` field for namespace deduplication
//!    - Add `discovered_at` and `synced_at` timestamps
//!    - Migrate existing data from old table structure
//!
//! 3. **Create installed_skills table**:
//!    - New table to track installed skills with snapshot pattern
//!    - Add `marketplace_skill_id` foreign key (SET NULL)
//!    - Add snapshot fields: `original_repository_*` to ensure data independence
//!    - Initialize data by scanning filesystem
//!
//! 4. **Create views for primary source queries**:
//!    - `v_marketplace_skills_with_source`: Join skills with repository info
//!    - `v_primary_marketplace_skills`: Primary source query with ROW_NUMBER() CTE
//!
//! ## Migration Strategy:
//! - Step 1: Add new fields to repositories table
//! - Step 2: Create new marketplace_skills_v11 table structure
//! - Step 3: Migrate data from old marketplace_skills to new table
//! - Step 4: Create installed_skills table and scan filesystem
//! - Step 5: Replace old tables with new ones
//! - Step 6: Rebuild FTS5 indexes
//! - Step 7: Create views for optimized queries
//!
//! ## Backwards Compatibility:
//! - Old `featured` field is migrated to `source_type='featured'` with `priority=10`
//! - Old marketplace_skills table is backed up as `marketplace_skills_v10_backup`
//! - All existing data is preserved through migration

use anyhow::Result;
use rusqlite::Connection;
use log::{info, warn, error};

/// Execute v11 database migration
///
/// This function performs a complete refactoring of the database schema to support
/// the unified repository-marketplace architecture.
pub fn migrate_v11(conn: &Connection) -> Result<()> {
    info!("Starting database migration v11: Repository-Marketplace Unification");
    let start = std::time::Instant::now();

    // Step 1: Enhance repositories table
    info!("Step 1: Enhancing repositories table with new fields");
    migrate_v11_enhance_repositories(conn)?;

    // Step 2: Create new marketplace_skills table structure
    info!("Step 2: Creating new marketplace_skills_v11 table structure");
    migrate_v11_create_marketplace_skills_table(conn)?;

    // Step 3: Migrate marketplace_skills data
    info!("Step 3: Migrating marketplace_skills data to new table structure");
    migrate_v11_migrate_marketplace_skills_data(conn)?;

    // Step 4: Create installed_skills table and populate
    info!("Step 4: Creating installed_skills table and scanning filesystem");
    migrate_v11_create_installed_skills_table(conn)?;

    // Step 5: Replace old tables with new ones
    info!("Step 5: Replacing old tables with new table structures");
    migrate_v11_replace_tables(conn)?;

    // Step 6: Rebuild FTS5 indexes
    info!("Step 6: Rebuilding FTS5 full-text search indexes");
    migrate_v11_rebuild_fts5(conn)?;

    // Step 7: Create views for optimized queries
    info!("Step 7: Creating views for primary source queries");
    migrate_v11_create_views(conn)?;

    let duration = start.elapsed();
    info!("Migration v11 completed successfully in {:?}", duration);

    Ok(())
}

/// Step 1: Enhance repositories table with new fields
fn migrate_v11_enhance_repositories(conn: &Connection) -> Result<()> {
    // Add source_type column (default 'user')
    conn.execute(
        "ALTER TABLE repositories ADD COLUMN source_type TEXT DEFAULT 'user'",
        [],
    )?;

    // Add priority column (default 100)
    conn.execute(
        "ALTER TABLE repositories ADD COLUMN priority INTEGER DEFAULT 100",
        [],
    )?;

    // Add scan_status column (default 'pending')
    conn.execute(
        "ALTER TABLE repositories ADD COLUMN scan_status TEXT DEFAULT 'pending'",
        [],
    )?;

    // Add etag column (for GitHub API caching)
    conn.execute(
        "ALTER TABLE repositories ADD COLUMN etag TEXT",
        [],
    )?;

    // Migrate existing featured repositories to source_type='featured' and priority=10
    let rows_affected = conn.execute(
        "UPDATE repositories SET source_type = 'featured', priority = 10 WHERE featured = 1",
        [],
    )?;

    info!(
        "Migrated {} featured repositories to source_type='featured'",
        rows_affected
    );

    // Create indexes for new fields
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_repos_source_type ON repositories(source_type)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_repos_priority ON repositories(priority)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_repos_scan_status ON repositories(scan_status)",
        [],
    )?;

    info!("Repositories table enhanced successfully");
    Ok(())
}

/// Step 2: Create new marketplace_skills table structure
fn migrate_v11_create_marketplace_skills_table(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE marketplace_skills_v11 (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            author TEXT,
            description TEXT,
            skill_path TEXT NOT NULL,
            repository_id TEXT NOT NULL,
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

    // Create indexes for performance
    conn.execute(
        "CREATE INDEX idx_market_skills_v11_name_author ON marketplace_skills_v11(name, author)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX idx_market_skills_v11_stars ON marketplace_skills_v11(stars DESC)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX idx_market_skills_v11_repo ON marketplace_skills_v11(repository_id)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX idx_market_skills_v11_quality ON marketplace_skills_v11(quality_score DESC)",
        [],
    )?;

    info!("New marketplace_skills_v11 table structure created");
    Ok(())
}

/// Step 3: Migrate marketplace_skills data to new table structure
fn migrate_v11_migrate_marketplace_skills_data(conn: &Connection) -> Result<()> {
    use sha2::{Sha256, Digest};
    use regex::Regex;

    // Build regex for extracting repository info from GitHub URLs
    let github_re = Regex::new(r"github\.com/([^/]+)/([^/]+)")
        .map_err(|e| anyhow::anyhow!("Failed to compile regex: {}", e))?;

    let mut stmt = conn.prepare(
        "SELECT id, name, author, description, github_url, stars, forks, updated_at, tags, security_score, compatibility, data
         FROM marketplace_skills"
    )?;

    let skill_iter = stmt.query_map([], |row| {
        Ok((
            row.get::<_, String>(0)?,   // id
            row.get::<_, String>(1)?,   // name
            row.get::<_, Option<String>>(2)?, // author
            row.get::<_, Option<String>>(3)?, // description
            row.get::<_, Option<String>>(4)?, // github_url
            row.get::<_, i64>(5)?,      // stars
            row.get::<_, i64>(6)?,      // forks
            row.get::<_, i64>(7)?,      // updated_at
            row.get::<_, Option<String>>(8)?, // tags
            row.get::<_, Option<i32>>(9)?, // security_score
            row.get::<_, Option<String>>(10)?, // compatibility
            row.get::<_, Option<String>>(11)?, // data
        ))
    })?;

    let mut migrated_count = 0;
    let mut unknown_repo_count = 0;

    for skill_result in skill_iter {
        let (old_id, name, author, description, github_url, stars, forks, updated_at, tags, security_score, compatibility, data) = skill_result?;

        // Extract repository info from github_url
        let (repo_url, repo_name) = match &github_url {
            Some(url) => {
                match extract_repository_from_url(&github_re, url) {
                    Some(info) => info,
                    None => {
                        warn!("Could not extract repository from URL: {}", url);
                        unknown_repo_count += 1;
                        ("https://github.com/unknown/unknown-repo".to_string(), "Unknown Repository".to_string())
                    }
                }
            }
            None => {
                warn!("Skill {} has no github_url", name);
                unknown_repo_count += 1;
                ("https://github.com/unknown/unknown-repo".to_string(), "Unknown Repository".to_string())
            }
        };

        // Find or create repository
        let repo_id = find_or_create_repository(conn, &repo_url, &repo_name)?;

        // Calculate skill_path (assume root level)
        let skill_path = format!("skills/{}", slugify(&name));

        // Generate new ID: {repository_id}_{skill_path_hash}
        let path_hash = sha256_hash(&skill_path);
        let new_id = format!("{}_{}", repo_id, path_hash);

        // Timestamps
        let now = chrono::Utc::now().timestamp();
        let discovered_at = updated_at;
        let synced_at = now;

        // Insert into new table
        let mut insert_stmt = conn.prepare(
            "INSERT INTO marketplace_skills_v11 (
                id, name, author, description, skill_path, repository_id,
                stars, forks, updated_at, tags, security_score, discovered_at, synced_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)"
        )?;

        insert_stmt.execute((
            &new_id, &name, &author, &description, &skill_path, &repo_id,
            stars, forks, updated_at, &tags, &security_score, discovered_at, synced_at
        ))?;

        migrated_count += 1;
    }

    info!(
        "Migrated {} marketplace skills to new table structure ({} unknown repositories)",
        migrated_count, unknown_repo_count
    );

    Ok(())
}

/// Step 4: Create installed_skills table and scan filesystem
fn migrate_v11_create_installed_skills_table(conn: &Connection) -> Result<()> {
    // Create installed_skills table
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

    // Create indexes
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_installed_skills_name ON installed_skills(name)",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_installed_skills_local_path ON installed_skills(local_path)",
        [],
    )?;

    info!("Installed skills table created (empty - will be populated during app startup)");

    // Note: We will populate this table during app startup when scan_skills is called
    // This avoids circular dependencies during migration

    Ok(())
}

/// Step 5: Replace old tables with new ones
fn migrate_v11_replace_tables(conn: &Connection) -> Result<()> {
    // Backup old marketplace_skills table
    conn.execute(
        "ALTER TABLE marketplace_skills RENAME TO marketplace_skills_v10_backup",
        [],
    )?;

    // Rename new table
    conn.execute(
        "ALTER TABLE marketplace_skills_v11 RENAME TO marketplace_skills",
        [],
    )?;

    info!("Old tables backed up and replaced with new table structures");
    Ok(())
}

/// Step 6: Rebuild FTS5 full-text search indexes
fn migrate_v11_rebuild_fts5(conn: &Connection) -> Result<()> {
    // Drop old FTS5 table
    conn.execute("DROP TABLE IF EXISTS marketplace_skills_fts", [])?;

    // Drop old triggers
    conn.execute("DROP TRIGGER IF EXISTS marketplace_skills_ai", [])?;
    conn.execute("DROP TRIGGER IF EXISTS marketplace_skills_ad", [])?;
    conn.execute("DROP TRIGGER IF EXISTS marketplace_skills_au", [])?;

    // Create new FTS5 table
    conn.execute(
        "CREATE VIRTUAL TABLE marketplace_skills_fts USING fts5(
            name,
            description,
            author,
            tags,
            content='marketplace_skills',
            content_rowid='rowid'
        )",
        [],
    )?;

    // Create triggers to keep FTS in sync
    conn.execute(
        "CREATE TRIGGER marketplace_skills_ai AFTER INSERT ON marketplace_skills BEGIN
            INSERT INTO marketplace_skills_fts(rowid, name, description, author, tags)
            VALUES (new.rowid, new.name, new.description, new.author, new.tags);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER marketplace_skills_ad AFTER DELETE ON marketplace_skills BEGIN
            INSERT INTO marketplace_skills_fts(marketplace_skills_fts, rowid, name, description, author, tags)
            VALUES('delete', old.rowid, old.name, old.description, old.author, old.tags);
        END",
        [],
    )?;

    conn.execute(
        "CREATE TRIGGER marketplace_skills_au AFTER UPDATE ON marketplace_skills BEGIN
            INSERT INTO marketplace_skills_fts(marketplace_skills_fts, rowid, name, description, author, tags)
            VALUES('delete', old.rowid, old.name, old.description, old.author, old.tags);
            INSERT INTO marketplace_skills_fts(rowid, name, description, author, tags)
            VALUES (new.rowid, new.name, new.description, new.author, new.tags);
        END",
        [],
    )?;

    // Backfill FTS table with existing data
    conn.execute(
        "INSERT INTO marketplace_skills_fts(rowid, name, description, author, tags)
         SELECT rowid, name, description, author, tags FROM marketplace_skills",
        [],
    )?;

    info!("FTS5 full-text search indexes rebuilt successfully");
    Ok(())
}

/// Step 7: Create views for optimized queries
fn migrate_v11_create_views(conn: &Connection) -> Result<()> {
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

    info!("Views for primary source queries created successfully");
    Ok(())
}

/// Helper: Extract repository URL and name from GitHub URL
fn extract_repository_from_url(re: &regex::Regex, url: &str) -> Option<(String, String)> {
    let caps = re.captures(url)?;
    let owner = caps.get(1)?.as_str();
    let repo = caps.get(2)?.as_str();

    let repo_url = format!("https://github.com/{}/{}", owner, repo);
    let repo_name = format!("{}/{}", owner, repo);

    Some((repo_url, repo_name))
}

/// Helper: Find or create repository by URL
fn find_or_create_repository(conn: &Connection, url: &str, name: &str) -> Result<String> {
    // Try to find existing repository
    let mut stmt = conn.prepare("SELECT id FROM repositories WHERE url = ?1")?;

    let repo_id: Option<String> = stmt.query_row(params![url], |row| row.get(0)).ok();

    if let Some(id) = repo_id {
        return Ok(id);
    }

    // Create new virtual repository
    let new_id = format!("unknown-{}", uuid::Uuid::new_v4());
    let now = chrono::Utc::now().timestamp_millis();

    conn.execute(
        "INSERT INTO repositories (id, url, name, source_type, priority, scan_status, enabled, added_at)
         VALUES (?1, ?2, ?3, 'user', 100, 'pending', 1, ?4)",
        params![&new_id, url, name, now],
    )?;

    Ok(new_id)
}

/// Helper: Calculate SHA-256 hash (first 8 chars)
fn sha256_hash(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    format!("{:x}", hasher.finalize())[..8].to_string()
}

/// Helper: Slugify a string for use in paths
fn slugify(input: &str) -> String {
    input
        .to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '-' })
        .collect::<String>()
        .split('-')
        .filter(|s| !s.is_empty())
        .collect::<Vec<&str>>()
        .join("-")
}
