use crate::services::db::get_connection;
use crate::models::fork::{ForkRequest, ForkStats, ForkType, LineageNode, ParentSkillInfo, ForkInfo};
use anyhow::{Context, Result};
use rusqlite::{params, OptionalExtension};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

const MAX_LINEAGE_DEPTH: i32 = 5;

pub struct ForkService;

impl ForkService {
    /// 派生 Skill（Fork 或 Remix）
    pub fn fork_skill(request: ForkRequest) -> Result<String> {
        // 1. 检查谱系深度
        let parent_depth = Self::get_skill_depth(&request.parent_skill_id)?;
        if parent_depth >= MAX_LINEAGE_DEPTH {
            anyhow::bail!(
                "Cannot fork: maximum lineage depth ({}) reached",
                MAX_LINEAGE_DEPTH
            );
        }

        // 2. 确定目标路径
        let target_path = Self::resolve_target_path(&request.target_location, &request.new_skill_name)?;

        // 3. 复制 Skill 文件
        Self::copy_skill_files(&request.parent_skill_path, &target_path)?;

        // 4. 更新 SKILL.md frontmatter
        Self::update_skill_metadata(&target_path, &request)?;

        // 5. 生成子 Skill ID
        let child_skill_id = Self::generate_skill_id(&target_path);

        // 6. 记录派生关系到数据库
        Self::record_fork_relation(
            &child_skill_id,
            &request.new_skill_name,
            &target_path.to_string_lossy(),
            &request.parent_skill_id,
            &request.parent_skill_name,
            Some(&request.parent_skill_path),
            &request.fork_type,
            request.fork_reason.as_deref(),
        )?;

        // 7. 更新谱系深度
        let root_skill_id = Self::get_root_skill_id(&request.parent_skill_id)?
            .unwrap_or_else(|| request.parent_skill_id.clone());
        Self::update_lineage_depth(&child_skill_id, parent_depth + 1, &root_skill_id)?;

        Ok(target_path.to_string_lossy().to_string())
    }

    /// 获取 Skill 的谱系信息
    pub fn get_skill_lineage(skill_id: &str, max_depth: Option<i32>) -> Result<LineageNode> {
        let depth_limit = max_depth.unwrap_or(MAX_LINEAGE_DEPTH);
        Self::build_lineage_tree(skill_id, 0, depth_limit)
    }

    /// 获取 Skill 的派生信息
    pub fn get_fork_info(skill_id: &str) -> Result<ForkInfo> {
        let conn = get_connection()?;

        // 查询是否为派生 Skill
        let parent_info: Option<(String, String, Option<String>, Option<String>, String, Option<String>)> = conn
            .query_row(
                "SELECT parent_skill_id, parent_skill_name, parent_skill_path, author, fork_type, fork_reason
                 FROM skill_forks WHERE child_skill_id = ?1",
                params![skill_id],
                |row| {
                    Ok((
                        row.get(0)?,
                        row.get(1)?,
                        row.get(2)?,
                        row.get(3)?,
                        row.get(4)?,
                        row.get(5)?,
                    ))
                },
            )
            .optional()?;

        let (is_fork, parent, fork_type, fork_reason) = if let Some((pid, pname, ppath, author, ftype, reason)) = parent_info {
            (
                true,
                Some(ParentSkillInfo {
                    skill_id: pid,
                    skill_name: pname,
                    skill_path: ppath,
                    author,
                }),
                Some(ForkType::from_str(&ftype).map_err(|e| anyhow::anyhow!(e))?),
                reason,
            )
        } else {
            (false, None, None, None)
        };

        // 查询被派生次数
        let fork_count: i32 = conn
            .query_row(
                "SELECT COUNT(*) FROM skill_forks WHERE parent_skill_id = ?1",
                params![skill_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        // 查询谱系深度
        let depth: i32 = conn
            .query_row(
                "SELECT depth FROM skill_lineage_depth WHERE skill_id = ?1",
                params![skill_id],
                |row| row.get(0),
            )
            .unwrap_or(0);

        Ok(ForkInfo {
            is_fork,
            parent,
            fork_type,
            fork_reason,
            fork_count,
            depth,
        })
    }

    /// 获取派生统计
    pub fn get_fork_stats(skill_id: &str) -> Result<Option<ForkStats>> {
        let conn = get_connection()?;

        conn.query_row(
            "SELECT parent_skill_id, parent_skill_name, fork_count, fork_count_only, remix_count, last_forked_at
             FROM skill_fork_stats WHERE parent_skill_id = ?1",
            params![skill_id],
            |row| {
                Ok(ForkStats {
                    parent_skill_id: row.get(0)?,
                    parent_skill_name: row.get(1)?,
                    fork_count: row.get(2)?,
                    fork_count_only: row.get(3)?,
                    remix_count: row.get(4)?,
                    last_forked_at: row.get(5)?,
                })
            },
        )
        .optional()
        .context("Failed to get fork stats")
    }

    // ===== 私有辅助方法 =====

    fn get_skill_depth(skill_id: &str) -> Result<i32> {
        let conn = get_connection()?;
        let depth: i32 = conn
            .query_row(
                "SELECT depth FROM skill_lineage_depth WHERE skill_id = ?1",
                params![skill_id],
                |row| row.get(0),
            )
            .optional()?
            .unwrap_or(0);
        Ok(depth)
    }

    fn get_root_skill_id(skill_id: &str) -> Result<Option<String>> {
        let conn = get_connection()?;
        conn.query_row(
            "SELECT root_skill_id FROM skill_lineage_depth WHERE skill_id = ?1",
            params![skill_id],
            |row| row.get(0),
        )
        .optional()
        .context("Failed to get root skill ID")
    }

    fn resolve_target_path(location: &str, skill_name: &str) -> Result<PathBuf> {
        let base_path = if location == "system" {
            dirs::home_dir()
                .context("Failed to get home directory")?
                .join(".claude")
                .join("skills")
        } else {
            PathBuf::from(location).join(".claude").join("skills")
        };

        let target_path = base_path.join(skill_name);

        // 检查目标路径是否已存在
        if target_path.exists() {
            anyhow::bail!("Skill '{}' already exists at target location", skill_name);
        }

        Ok(target_path)
    }

    fn copy_skill_files(source: &str, target: &Path) -> Result<()> {
        fs::create_dir_all(target).context("Failed to create target directory")?;

        // 复制所有文件
        let entries = fs::read_dir(source).context("Failed to read source directory")?;

        for entry in entries {
            let entry = entry?;
            let path = entry.path();
            let file_name = path.file_name().context("Invalid file name")?;
            let target_file = target.join(file_name);

            if path.is_dir() {
                Self::copy_dir_recursive(&path, &target_file)?;
            } else {
                fs::copy(&path, &target_file).context("Failed to copy file")?;
            }
        }

        Ok(())
    }

    fn copy_dir_recursive(source: &Path, target: &Path) -> Result<()> {
        fs::create_dir_all(target)?;

        for entry in fs::read_dir(source)? {
            let entry = entry?;
            let path = entry.path();
            let file_name = path.file_name().context("Invalid file name")?;
            let target_file = target.join(file_name);

            if path.is_dir() {
                Self::copy_dir_recursive(&path, &target_file)?;
            } else {
                fs::copy(&path, &target_file)?;
            }
        }

        Ok(())
    }

    fn update_skill_metadata(target_path: &Path, request: &ForkRequest) -> Result<()> {
        let skill_md_path = target_path.join("SKILL.md");
        if !skill_md_path.exists() {
            anyhow::bail!("SKILL.md not found in forked skill");
        }

        let content = fs::read_to_string(&skill_md_path)?;

        // 解析 frontmatter
        let (frontmatter, body) = Self::parse_frontmatter(&content)?;

        // 更新 frontmatter
        let mut new_frontmatter = frontmatter;
        new_frontmatter.insert("name".to_string(), request.new_skill_name.clone());
        new_frontmatter.insert("forked_from".to_string(), request.parent_skill_name.clone());
        new_frontmatter.insert("fork_type".to_string(), request.fork_type.as_str().to_string());

        if let Some(reason) = &request.fork_reason {
            new_frontmatter.insert("fork_reason".to_string(), reason.clone());
        }

        // 重新组装文件
        let new_content = Self::build_skill_md(&new_frontmatter, &body);
        fs::write(&skill_md_path, new_content)?;

        Ok(())
    }

    fn parse_frontmatter(content: &str) -> Result<(HashMap<String, String>, String)> {
        let mut frontmatter = HashMap::new();
        let mut body = String::new();
        let mut in_frontmatter = false;
        let mut frontmatter_ended = false;

        for line in content.lines() {
            if line.trim() == "---" {
                if !in_frontmatter {
                    in_frontmatter = true;
                } else {
                    in_frontmatter = false;
                    frontmatter_ended = true;
                }
                continue;
            }

            if in_frontmatter {
                if let Some((key, value)) = line.split_once(':') {
                    frontmatter.insert(
                        key.trim().to_string(),
                        value.trim().to_string(),
                    );
                }
            } else if frontmatter_ended {
                body.push_str(line);
                body.push('\n');
            }
        }

        Ok((frontmatter, body))
    }

    fn build_skill_md(frontmatter: &HashMap<String, String>, body: &str) -> String {
        let mut content = String::from("---\n");
        for (key, value) in frontmatter {
            content.push_str(&format!("{}: {}\n", key, value));
        }
        content.push_str("---\n");
        content.push_str(body);
        content
    }

    fn generate_skill_id(path: &Path) -> String {
        use sha2::{Digest, Sha256};

        let mut hasher = Sha256::new();
        hasher.update(path.to_string_lossy().as_bytes());
        let result = hasher.finalize();
        format!("{:x}", result)[..16].to_string()
    }

    fn record_fork_relation(
        child_skill_id: &str,
        child_skill_name: &str,
        child_skill_path: &str,
        parent_skill_id: &str,
        parent_skill_name: &str,
        parent_skill_path: Option<&str>,
        fork_type: &ForkType,
        fork_reason: Option<&str>,
    ) -> Result<()> {
        let conn = get_connection()?;

        conn.execute(
            "INSERT INTO skill_forks (child_skill_id, child_skill_name, child_skill_path, parent_skill_id, parent_skill_name, parent_skill_path, fork_type, fork_reason, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
            params![
                child_skill_id,
                child_skill_name,
                child_skill_path,
                parent_skill_id,
                parent_skill_name,
                parent_skill_path,
                fork_type.as_str(),
                fork_reason,
                chrono::Utc::now().timestamp_millis(),
            ],
        )?;

        Ok(())
    }

    fn update_lineage_depth(skill_id: &str, depth: i32, root_skill_id: &str) -> Result<()> {
        let conn = get_connection()?;

        conn.execute(
            "INSERT OR REPLACE INTO skill_lineage_depth (skill_id, depth, root_skill_id, updated_at)
             VALUES (?1, ?2, ?3, ?4)",
            params![
                skill_id,
                depth,
                root_skill_id,
                chrono::Utc::now().timestamp_millis(),
            ],
        )?;

        Ok(())
    }

    fn build_lineage_tree(skill_id: &str, current_depth: i32, max_depth: i32) -> Result<LineageNode> {
        if current_depth >= max_depth {
            return Ok(Self::create_simple_node(skill_id)?);
        }

        let conn = get_connection()?;

        // 获取当前节点信息
        let node_info = Self::get_node_info(skill_id)?;

        // 查询所有子节点
        let mut stmt = conn.prepare(
            "SELECT child_skill_id, child_skill_name, child_skill_path, fork_type, created_at
             FROM skill_forks WHERE parent_skill_id = ?1 ORDER BY created_at DESC",
        )?;

        let children_iter = stmt.query_map(params![skill_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, Option<String>>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, i64>(4)?,
            ))
        })?;

        let mut children = Vec::new();
        for child_result in children_iter {
            let (child_id, _, _, _, _) = child_result?;
            if let Ok(child_node) = Self::build_lineage_tree(&child_id, current_depth + 1, max_depth) {
                children.push(child_node);
            }
        }

        Ok(LineageNode {
            skill_id: node_info.0,
            skill_name: node_info.1,
            skill_path: node_info.2,
            author: node_info.3,
            fork_type: node_info.4,
            created_at: node_info.5,
            depth: current_depth,
            children,
        })
    }

    fn create_simple_node(skill_id: &str) -> Result<LineageNode> {
        let node_info = Self::get_node_info(skill_id)?;
        Ok(LineageNode {
            skill_id: node_info.0,
            skill_name: node_info.1,
            skill_path: node_info.2,
            author: node_info.3,
            fork_type: node_info.4,
            created_at: node_info.5,
            depth: 0,
            children: vec![],
        })
    }

    fn get_node_info(skill_id: &str) -> Result<(String, String, Option<String>, Option<String>, Option<ForkType>, Option<i64>)> {
        let conn = get_connection()?;

        // 尝试从 skill_forks 表获取信息
        if let Some(info) = conn
            .query_row(
                "SELECT child_skill_id, child_skill_name, child_skill_path, author, fork_type, created_at
                 FROM skill_forks WHERE child_skill_id = ?1",
                params![skill_id],
                |row| {
                    Ok((
                        row.get::<_, String>(0)?,
                        row.get::<_, String>(1)?,
                        row.get::<_, Option<String>>(2)?,
                        row.get::<_, Option<String>>(3)?,
                        Some(ForkType::from_str(&row.get::<_, String>(4)?).unwrap_or(ForkType::Fork)),
                        Some(row.get::<_, i64>(5)?),
                    ))
                },
            )
            .optional()?
        {
            return Ok(info);
        }

        // 如果不是派生 Skill，返回基本信息
        Ok((
            skill_id.to_string(),
            "Unknown".to_string(),
            None,
            None,
            None,
            None,
        ))
    }
}
