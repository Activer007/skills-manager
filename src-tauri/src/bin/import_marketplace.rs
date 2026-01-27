//! Marketplace 数据导入工具
//!
//! 使用方法:
//! ```bash
//! cd src-tauri
//! cargo run --bin import_marketplace
//! ```

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
    let db_path = std::path::Path::new(&std::env::var("HOME").unwrap_or_else(|_| ".".to_string()))
        .join(".claude")
        .join("skill-manager.db");

    println!("🗄️  数据库: {:?}", db_path);

    if !db_path.exists() {
        println!("⚠️  数据库不存在，请先运行应用创建数据库");
        std::process::exit(1);
    }

    let mut conn = rusqlite::Connection::open(&db_path)
        .expect("无法打开数据库");

    // 开始导入
    println!("📥 开始导入数据...\n");

    let tx = conn.transaction().expect("无法创建事务");
    let mut success_count = 0;
    let mut error_count = 0;

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
        let stars = skill.get("stars").and_then(|v| v.as_i64()).unwrap_or(0);
        let forks = skill.get("forks").and_then(|v| v.as_i64()).unwrap_or(0);
        let updated_at = skill.get("updatedAt").and_then(|v| v.as_i64()).unwrap_or(0);
        let tags = skill.get("tags").and_then(|v| v.as_array());
        let tags_json = tags.map(|t| serde_json::to_string(t).ok()).flatten();
        let data_json = serde_json::to_string(skill).ok();

        let result = tx.execute(
            "INSERT OR REPLACE INTO marketplace_skills
            (id, name, author, description, github_url, stars, forks, updated_at, tags, data)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            rusqlite::params![
                id,
                name,
                author,
                description,
                github_url,
                stars,
                forks,
                updated_at,
                tags_json,
                data_json,
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
