//! 初始化数据库
//!
//! 创建数据库和表结构

use std::path::PathBuf;

fn main() {
    println!("🔧 初始化数据库...\n");

    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let db_path = PathBuf::from(home)
        .join(".claude")
        .join("skill-manager.db");

    println!("📄 数据库路径: {:?}", db_path);

    // 创建目录（如果不存在）
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent).expect("无法创建目录");
    }

    // 连接数据库（会自动创建）
    let mut conn = rusqlite::Connection::open(&db_path)
        .expect("无法打开数据库");

    println!("✅ 数据库已创建");

    // 创建表
    println!("📊 创建表结构...");

    conn.execute(
        "CREATE TABLE IF NOT EXISTS marketplace_skills (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            author TEXT,
            description TEXT,
            github_url TEXT,
            stars INTEGER DEFAULT 0,
            forks INTEGER DEFAULT 0,
            updated_at INTEGER DEFAULT 0,
            tags TEXT,
            security_score INTEGER,
            compatibility TEXT,
            data TEXT
        )",
        [],
    ).expect("无法创建 marketplace_skills 表");

    println!("✅ 表 marketplace_skills 已创建");

    // 创建索引
    println!("📇 创建索引...");

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_marketplace_skills_name ON marketplace_skills(name)",
        [],
    ).expect("无法创建索引 name");

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_marketplace_skills_stars ON marketplace_skills(stars)",
        [],
    ).expect("无法创建索引 stars");

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_marketplace_skills_updated_at ON marketplace_skills(updated_at)",
        [],
    ).expect("无法创建索引 updated_at");

    println!("✅ 索引已创建");

    println!("\n🎉 数据库初始化完成！");
    println!("路径: {:?}", db_path);
}
