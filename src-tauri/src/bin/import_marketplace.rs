//! Marketplace 数据导入工具
//!
//! 使用方法:
//! ```bash
//! cd src-tauri
//! cargo run --bin import_marketplace
//! ```

use std::collections::HashMap;

use chrono::Utc;
use rusqlite::params;
use sha2::{Digest, Sha256};

fn main() {
    println!("🚀 开始导入 Marketplace 数据...\n");

    // 确定路径
    let json_path = if std::path::Path::new("public/data/marketplace.json").exists() {
        "public/data/marketplace.json"
    } else if std::path::Path::new("../public/data/marketplace.json").exists() {
        "../public/data/marketplace.json"
    } else {
        eprintln!("❌ 错误: 找不到 marketplace.json 文件");
        eprintln!("请确认文件路径：public/data/marketplace.json");
        std::process::exit(1);
    };

    println!("📁 JSON 文件: {}", json_path);

    // 读取 JSON 文件
    println!("📖 正在读取 JSON 文件...");
    let json_content = std::fs::read_to_string(json_path)
        .expect("无法读取 JSON 文件");

    println!("✅ 文件大小: {:.1} MB", json_content.len() as f64 / 1024.0 / 1024.0);

    // 解析 JSON
    println!("📊 正在解析 JSON...");
    let raw_skills: Vec<serde_json::Value> = serde_json::from_str(&json_content)
        .expect("无法解析 JSON");

    println!("✅ 找到 {} 条 Skills\n", raw_skills.len());

    // 连接数据库
    let db_path = dirs::home_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join(".claude")
        .join("skills-manager.db");

    println!("🗄️  数据库: {:?}", db_path);

    if !db_path.exists() {
        println!("⚠️  数据库不存在，请先运行应用创建数据库");
        std::process::exit(1);
    }

    let mut conn = rusqlite::Connection::open(&db_path)
        .expect("无法打开数据库");
    conn.execute("PRAGMA foreign_keys = ON;", [])
        .expect("无法启用外键约束");

    // 开始导入
    println!("📥 开始导入数据...\n");

    let tx = conn.transaction().expect("无法创建事务");
    let mut success_count = 0;
    let mut error_count = 0;
    let mut repository_cache: HashMap<String, String> = HashMap::new();

    let fallback_repo_url = "https://github.com/marketplace/legacy-json";

    for (index, skill) in raw_skills.iter().enumerate() {
        if index % 1000 == 0 {
            print!("⏳ 进度: {}/{}\r", index, raw_skills.len());
            use std::io::Write;
            std::io::stdout().flush().ok();
        }

        let id = skill.get("id").and_then(|v| v.as_str()).unwrap_or("");
        let name = skill.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let author = skill.get("author").and_then(|v| v.as_str());
        let description = skill.get("description").and_then(|v| v.as_str());
        let github_url = skill.get("githubUrl").and_then(|v| v.as_str());
        let version = skill.get("version").and_then(|v| v.as_str());
        let stars = skill.get("stars").and_then(|v| v.as_i64()).unwrap_or(0);
        let forks = skill.get("forks").and_then(|v| v.as_i64()).unwrap_or(0);
        let updated_at = skill.get("updatedAt").and_then(|v| v.as_i64()).unwrap_or(0);
        let tags = skill.get("tags").and_then(|v| v.as_array());
        let tags_json = tags.map(|t| serde_json::to_string(t).ok()).flatten();
        let security_score = skill.get("security_score").and_then(|v| v.as_i64()).map(|v| v as i32);

        let (repo_url, skill_path) = parse_repo_info(github_url)
            .unwrap_or_else(|| (fallback_repo_url.to_string(), None));

        let repo_id = match resolve_repository_id(&tx, &repo_url, &mut repository_cache) {
            Ok(id) => id,
            Err(e) => {
                error_count += 1;
                if error_count <= 10 {
                    eprintln!("❌ 导入失败 [{}]: {}", id, e);
                }
                continue;
            }
        };

        let resolved_skill_path = skill_path.unwrap_or_else(|| id.to_string());
        let skill_id = format!("{}_{}", repo_id, hash_skill_path(&resolved_skill_path));

        let result = tx.execute(
            "INSERT OR REPLACE INTO marketplace_skills
            (id, name, author, description, skill_path, repository_id,
             version, stars, forks, updated_at, tags,
             config_schema, quality_score, security_score,
             discovered_at, synced_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
            params![
                skill_id,
                name,
                author,
                description,
                resolved_skill_path,
                repo_id,
                version,
                stars,
                forks,
                updated_at,
                tags_json,
                Option::<String>::None, // config_schema
                Option::<i32>::None, // quality_score
                security_score,
                updated_at,
                Utc::now().timestamp(),
            ],
        );

        match result {
            Ok(_) => success_count += 1,
            Err(e) => {
                error_count += 1;
                if error_count <= 10 {
                    eprintln!("❌ 导入失败 [{}]: {}", id, e);
                }
            }
        }
    }

    println!("\n\n✅ 提交事务...");
    tx.commit().expect("无法提交事务");

    println!("\n🎉 导入完成！");
    println!("┌─────────────────────────┐");
    println!("│ 总计: {} 条", raw_skills.len());
    println!("│ ✅ 成功: {} 条", success_count);
    println!("│ ❌ 失败: {} 条", error_count);
    println!("└─────────────────────────┘");

    // 查询统计
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM marketplace_skills",
        [],
        |row| row.get(0),
    ).unwrap_or(0);

    println!("\n📊 数据库统计: {} 条记录", count);
}

fn parse_repo_info(url: Option<&str>) -> Option<(String, Option<String>)> {
    let url = url?;

    let url = url.trim_end_matches('/');
    let parts: Vec<&str> = url.split('/').collect();
    let github_idx = parts.iter().position(|&p| p == "github.com")?;

    if parts.len() <= github_idx + 2 {
        return None;
    }

    let owner = parts[github_idx + 1];
    let repo = parts[github_idx + 2].trim_end_matches(".git");
    let repo_url = format!("https://github.com/{}/{}", owner, repo);

    let skill_path = if let Some(pos) = url.find("/tree/") {
        let remainder = &url[(pos + "/tree/".len())..];
        let mut segments = remainder.split('/');
        let _branch = segments.next();
        let path = segments.collect::<Vec<_>>().join("/");
        if path.is_empty() { None } else { Some(path) }
    } else if let Some(pos) = url.find("/blob/") {
        let remainder = &url[(pos + "/blob/".len())..];
        let mut segments = remainder.split('/');
        let _branch = segments.next();
        let path = segments.collect::<Vec<_>>().join("/");
        if path.is_empty() { None } else { Some(path) }
    } else {
        None
    };

    Some((repo_url, skill_path))
}

fn resolve_repository_id(
    conn: &rusqlite::Connection,
    repo_url: &str,
    cache: &mut HashMap<String, String>,
) -> Result<String, String> {
    if let Some(id) = cache.get(repo_url) {
        return Ok(id.clone());
    }

    let normalized_url = repo_url.trim_end_matches('/');
    let existing: Result<String, _> = conn.query_row(
        "SELECT id FROM repositories WHERE url = ?1 OR url = ?2",
        params![repo_url, normalized_url],
        |row| row.get(0),
    );

    if let Ok(id) = existing {
        cache.insert(repo_url.to_string(), id.clone());
        return Ok(id);
    }

    let name = repo_url
        .split('/')
        .last()
        .unwrap_or("marketplace");

    let repo_id = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();

    conn.execute(
        "INSERT OR IGNORE INTO repositories
        (id, url, name, description, enabled, scan_subdirs, added_at, last_scanned,
         cache_path, cached_commit_sha, featured, category,
         source_type, priority, scan_status, etag)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)",
        params![
            repo_id,
            normalized_url,
            name,
            "Imported from marketplace.json",
            1,
            1,
            now,
            Option::<i64>::None,
            Option::<String>::None,
            Option::<String>::None,
            1,
            "community",
            "featured",
            10,
            "pending",
            Option::<String>::None,
        ],
    ).map_err(|e| format!("Failed to insert repository {}: {}", normalized_url, e))?;

    cache.insert(repo_url.to_string(), repo_id.clone());
    Ok(repo_id)
}

fn hash_skill_path(path: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(path.as_bytes());
    let digest = hasher.finalize();
    format!("{:x}", digest)[..8].to_string()
}
