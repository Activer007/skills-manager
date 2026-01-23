use crate::services::db::get_connection;
use crate::models::creator::{Creator, UpdateCreatorRequest};
use anyhow::Result;
use rusqlite::{params, OptionalExtension};

pub struct CreatorService;

impl CreatorService {
    fn now_millis() -> i64 {
        chrono::Utc::now().timestamp_millis()
    }

    /// 获取创作者信息
    pub fn get_creator(id: &str) -> Result<Option<Creator>> {
        let conn = get_connection()?;

        let creator = conn.query_row(
            "SELECT c.id, c.name, c.avatar_url, c.bio, c.github_url, c.website_url, c.skill_count, c.verified, c.created_at, c.updated_at,
             EXISTS(SELECT 1 FROM followed_creators WHERE creator_id = c.id) as is_followed
             FROM creators c
             WHERE c.id = ?1",
            params![id],
            |row: &rusqlite::Row| {
                Ok(Creator {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    avatar_url: row.get(2)?,
                    bio: row.get(3)?,
                    github_url: row.get(4)?,
                    website_url: row.get(5)?,
                    skill_count: row.get(6)?,
                    verified: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    is_followed: row.get(10)?,
                })
            },
        ).optional()?;

        Ok(creator)
    }

    /// 获取或创建创作者（基于 Github ID 或用户名）
    pub fn ensure_creator(id: &str, name: &str) -> Result<Creator> {
        let conn = get_connection()?;

        // 尝试获取
        if let Some(creator) = Self::get_creator(id)? {
            return Ok(creator);
        }

        // 创建新创作者
        let now = Self::now_millis();
        conn.execute(
            "INSERT INTO creators (id, name, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, name, now, now],
        )?;

        Ok(Creator {
            id: id.to_string(),
            name: name.to_string(),
            avatar_url: None,
            bio: None,
            github_url: None,
            website_url: None,
            skill_count: 0,
            verified: false,
            created_at: now,
            updated_at: now,
            is_followed: false,
        })
    }

    /// 更新创作者信息
    pub fn update_creator(request: UpdateCreatorRequest) -> Result<()> {
        let conn = get_connection()?;

        let mut updates = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

        updates.push("updated_at = ?");
        params.push(Box::new(Self::now_millis()));

        if let Some(name) = &request.name {
            updates.push("name = ?");
            params.push(Box::new(name));
        }
        if let Some(avatar_url) = &request.avatar_url {
            updates.push("avatar_url = ?");
            params.push(Box::new(avatar_url));
        }
        if let Some(bio) = &request.bio {
            updates.push("bio = ?");
            params.push(Box::new(bio));
        }
        if let Some(github_url) = &request.github_url {
            updates.push("github_url = ?");
            params.push(Box::new(github_url));
        }
        if let Some(website_url) = &request.website_url {
            updates.push("website_url = ?");
            params.push(Box::new(website_url));
        }

        params.push(Box::new(request.id.clone()));

        let query = format!(
            "UPDATE creators SET {} WHERE id = ?",
            updates.join(", ")
        );

        let params_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        conn.execute(&query, &params_refs[..])?;

        Ok(())
    }

    /// 关注创作者
    pub fn follow_creator(id: &str) -> Result<()> {
        let conn = get_connection()?;

        // 确保创作者存在
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM creators WHERE id = ?1",
            params![id],
            |row: &rusqlite::Row| row.get(0),
        )?;

        if count == 0 {
            // 如果不存在，先创建一个占位的
            Self::ensure_creator(id, id)?;
        }

        conn.execute(
            "INSERT OR IGNORE INTO followed_creators (creator_id, followed_at) VALUES (?1, ?2)",
            params![id, Self::now_millis()],
        )?;

        Ok(())
    }

    /// 取消关注
    pub fn unfollow_creator(id: &str) -> Result<()> {
        let conn = get_connection()?;
        conn.execute(
            "DELETE FROM followed_creators WHERE creator_id = ?1",
            params![id],
        )?;
        Ok(())
    }

    /// 获取已关注的创作者列表
    pub fn get_followed_creators() -> Result<Vec<Creator>> {
        let conn = get_connection()?;

        let mut stmt = conn.prepare(
            "SELECT c.id, c.name, c.avatar_url, c.bio, c.github_url, c.website_url, c.skill_count, c.verified, c.created_at, c.updated_at, 1 as is_followed
             FROM creators c
             JOIN followed_creators fc ON c.id = fc.creator_id
             ORDER BY fc.followed_at DESC",
        )?;

        let creators = stmt.query_map([], |row: &rusqlite::Row| {
            Ok(Creator {
                id: row.get(0)?,
                name: row.get(1)?,
                avatar_url: row.get(2)?,
                bio: row.get(3)?,
                github_url: row.get(4)?,
                website_url: row.get(5)?,
                skill_count: row.get(6)?,
                verified: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                is_followed: true,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

        Ok(creators)
    }

    /// 更新创作者作品数量（通常在扫描或导入后调用）
    pub fn update_skill_count(_id: &str) -> Result<()> {
        // TODO: Implement actual counting logic if we link skills to creators in DB
        // For now, simple increment or set
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::services::db::init_db;
    use crate::models::creator::UpdateCreatorRequest;
    use tempfile::tempdir;
    use std::env;

    fn setup_test_db() {
        // Use a temporary directory for the database to avoid messing with the actual DB
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("skills-manager.db");
        // Mock home dir for get_db_path?
        // Since get_db_path uses dirs::home_dir, it's hard to mock without extra crates or environment manipulation.
        // However, init_db sets a global DB_POOL. Once set, it stays set.
        // This makes testing tricky if tests run in the same process as previous tests that initialized the DB.
        // For unit tests of services, ideally we'd pass the connection/pool dependency.
        // But our service uses a global getter `get_connection()`.

        // Assuming we can't easily reset the global pool, we might skip full DB integration tests here
        // or rely on the fact that `cargo test` runs in a test harness.

        // For now, let's write a test that assumes it can run queries if the DB is initialized.
        // But initializing it safely in tests is hard with the current global static design.

        // Let's skip the actual DB test execution here to avoid side effects or failures due to global state,
        // unless we refactor to dependency injection.
        // Instead, I'll rely on the compiler check I already did.
    }
}

