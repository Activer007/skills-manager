/// Migration v5: Create collections tables
fn migrate_v5(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS collections (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            icon TEXT,
            color TEXT,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS collection_items (
            collection_id TEXT NOT NULL,
            skill_identifier TEXT NOT NULL,
            added_at INTEGER NOT NULL,
            note TEXT,
            PRIMARY KEY (collection_id, skill_identifier),
            FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
        )",
        [],
    )?;

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_collection_items_collection_id ON collection_items(collection_id)",
        [],
    )?;

    log::info!("Created collections and collection_items tables");
    Ok(())
}
