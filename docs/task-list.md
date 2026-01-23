# Skills Manager 任务清单与路线图

> **文档版本**: 1.0  
> **创建日期**: 2026-01-22  
> **基于文档**: prd-v2.md, task.md, task-ui.md, agent-skills-guard.md  
> **当前版本**: v2.5.0

---

## 执行摘要

本任务清单基于对项目文档的全面分析，结合 Agent Skills Guard 参考实现的最佳实践，制定了完善多来源仓库管理和优化其他功能的具体计划。

### 核心发现

| 模块 | 当前完成度 | 差距分析 |
|------|-----------|----------|
| 基础安全管理 | ✅ 90% | 60+ 安全规则、三种扫描模式、白名单机制完善 |
| 基础分享功能 | ✅ 60% | 文本分享、图片分享、QR 码已实现 |
| 质量评分系统 | ✅ 100% | 四维度评分、批量分析完整实现 |
| 数据库层 | ✅ 70% | 扫描历史、缓存、白名单已实现 |
| **多来源仓库管理** | ⚠️ 30% | **严重缺失**：无专用仓库表、无精选仓库概念 |
| **Share-First 生态** | ⚠️ 40% | **需要完善**：无统一分享入口、无社区市场 |

### 关键差距

#### 多来源仓库管理差距

**问题**：
- ❌ 无专用仓库元数据存储（数据库无 `repositories` 表）
- ❌ 无精选（Featured）仓库概念
- ❌ 无默认仓库初始化机制
- ❌ 无仓库级健康监控和同步状态
- ❌ 无每仓库配置（同步频率、自动更新等）
- ❌ GitHub 操作直接写在 `lib.rs`，未模块化

**参考实现**（Agent Skills Guard）：
- ✅ 默认仓库自动初始化 (`anthropics/skills`, `obra/superpowers`)
- ✅ `repositories` 数据库表存储元数据
- ✅ Featured Repositories 远程配置 + 本地缓存
- ✅ 完整的仓库扫描工作流（GitHub API + 本地缓存）
- ✅ 仓库删除级联清理（技能 + 缓存）

#### Share-First 生态差距

| 功能 | PRD 要求 | 当前状态 | 差距 |
|------|---------|----------|------|
| 统一分享入口 | Share Sheet | 仅有独立对话框 | ❌ 无统一入口 |
| 分享链接 | Unlisted/Public Link | 无 | ❌ 未实现 |
| 发布向导 | Publish Wizard | 无 | ❌ 未实现 |
| 社区市场 | Marketplace 搜索/筛选 | 仅有静态列表 | ⚠️ 部分实现 |
| 派生体系 | Fork/Remix + lineage | 无 | ❌ 未实现 |
| 合集 | Collections | 无 | ❌ 未实现 |
| 创作者页 | Creator Profile | 无 | ❌ 未实现 |
| SkillPack | 离线分享格式 | ✅ 已实现 | 🎉 已有 |
| 兼容性徽章 | Multi-platform badge | 无 | ❌ 未实现 |
| 嵌入卡片 | Embed Card | 无 | ❌ 未实现 |

---

## 第一阶段：多来源仓库管理基础设施

**目标**：完善仓库管理核心架构，参考 Agent Skills Guard 实现  
**优先级**：P0  
**预估工作量**：3-4 周

### T1-1：数据库架构扩展

**创建仓库相关的数据库表**：

```sql
-- repositories 表：存储仓库元数据
CREATE TABLE repositories (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    enabled INTEGER DEFAULT 1,
    scan_subdirs INTEGER DEFAULT 0,
    added_at TEXT NOT NULL,
    last_scanned TEXT,
    cache_path TEXT,
    cached_commit_sha TEXT,
    featured INTEGER DEFAULT 0,
    category TEXT DEFAULT 'custom'
);

-- repository_scan_queue 表：扫描任务队列
CREATE TABLE repository_scan_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    error_message TEXT,
    skills_found INTEGER DEFAULT 0,
    FOREIGN KEY (repository_id) REFERENCES repositories(id)
);

-- 索引优化
CREATE INDEX idx_repositories_url ON repositories(url);
CREATE INDEX idx_repositories_category ON repositories(category);
CREATE INDEX idx_repositories_enabled ON repositories(enabled);
CREATE INDEX idx_scan_queue_status ON repository_scan_queue(status);
```

**任务清单**：
- [ ] 创建数据库迁移脚本 v4
- [ ] 实现 `repositories` 表创建
- [ ] 实现 `repository_scan_queue` 表创建
- [ ] 添加必要的数据库索引
- [ ] 编写迁移回滚脚本

**参考最佳实践**（来自 Tauri + Rust 搜索结果）：
```rust
// 数据库优化：启用 WAL 模式
conn.execute_batch(r#"
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -64000;
    PRAGMA foreign_keys = ON;
"#)?;
```

### T1-2：仓库模型与服务层

**创建 `src-tauri/src/models/repository.rs`**：

```rust
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Repository {
    pub id: String,
    pub url: String,
    pub name: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub scan_subdirs: bool,
    pub added_at: DateTime<Utc>,
    pub last_scanned: Option<DateTime<Utc>>,
    pub cache_path: Option<String>,
    pub cached_commit_sha: Option<String>,
    pub featured: bool,
    pub category: RepositoryCategory,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum RepositoryCategory {
    Official,      // 官方推荐
    Community,     // 社区精选
    Custom,        // 用户自定义
}

impl Repository {
    pub fn new(url: String, name: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            url,
            name,
            description: None,
            enabled: true,
            scan_subdirs: false,
            added_at: Utc::now(),
            last_scanned: None,
            cache_path: None,
            cached_commit_sha: None,
            featured: false,
            category: RepositoryCategory::Custom,
        }
    }

    /// 从 GitHub URL 解析 owner 和 repo 名称
    pub fn from_github_url(url: &str) -> Result<(String, String), anyhow::Error> {
        let url = url.trim_end_matches('/');
        let parts: Vec<&str> = url.split('/').collect();

        if parts.len() < 2 {
            return Err(anyhow::anyhow!("Invalid GitHub URL"));
        }

        let owner = parts[parts.len() - 2].to_string();
        let repo = parts[parts.len() - 1].to_string();

        Ok((owner, repo))
    }

    /// 验证 GitHub URL 格式
    pub fn validate_url(url: &str) -> Result<(), anyhow::Error> {
        if !url.starts_with("https://github.com/") {
            return Err(anyhow::anyhow!("URL must start with https://github.com/"));
        }

        let (_, repo) = Self::from_github_url(url)?;
        if repo.is_empty() {
            return Err(anyhow::anyhow!("Repository name cannot be empty"));
        }

        Ok(())
    }
}
```

**创建 `src-tauri/src/services/repository.rs`**：

```rust
use std::path::PathBuf;
use rusqlite::Connection;
use anyhow::{Context, Result};
use crate::models::repository::{Repository, RepositoryCategory};

pub struct RepositoryService {
    conn: Connection,
}

impl RepositoryService {
    pub fn new(conn: Connection) -> Self {
        Self { conn }
    }

    /// 添加新仓库
    pub fn add_repository(&self, repo: &Repository) -> Result<String> {
        self.conn.execute(
            "INSERT OR IGNORE INTO repositories
            (id, url, name, description, enabled, scan_subdirs, added_at, last_scanned, cache_path, cached_commit_sha, featured, category)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            params![
                repo.id,
                repo.url,
                repo.name,
                repo.description,
                repo.enabled as i32,
                repo.scan_subdirs as i32,
                repo.added_at.to_rfc3339(),
                repo.last_scanned.as_ref().map(|d| d.to_rfc3339()),
                repo.cache_path,
                repo.cached_commit_sha,
                repo.featured as i32,
                repo.category.to_string(),
            ],
        )?;

        Ok(repo.id.clone())
    }

    /// 获取单个仓库
    pub fn get_repository(&self, id: &str) -> Result<Option<Repository>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, url, name, description, enabled, scan_subdirs, added_at,
             last_scanned, cache_path, cached_commit_sha, featured, category
             FROM repositories WHERE id = ?1"
        )?;

        let repo = stmt.query_row(params![id], |row| {
            Ok(Repository {
                id: row.get(0)?,
                url: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                enabled: row.get::<_, i32>(4)? == 1,
                scan_subdirs: row.get::<_, i32>(5)? == 1,
                added_at: row.get::<_, String>(6)?.parse()?,
                last_scanned: row.get::<_, Option<String>>(7)?.map(|s| s.parse().ok())?,
                cache_path: row.get(8)?,
                cached_commit_sha: row.get(9)?,
                featured: row.get::<_, i32>(10)? == 1,
                category: row.get::<_, String>(11)?.parse()?,
            })
        })?;

        Ok(Some(repo))
    }

    /// 列出所有仓库
    pub fn list_repositories(&self) -> Result<Vec<Repository>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, url, name, description, enabled, scan_subdirs, added_at,
             last_scanned, cache_path, cached_commit_sha, featured, category
             FROM repositories ORDER BY added_at DESC"
        )?;

        let repos = stmt.query_map([], |row| {
            Ok(Repository {
                id: row.get(0)?,
                url: row.get(1)?,
                name: row.get(2)?,
                description: row.get(3)?,
                enabled: row.get::<_, i32>(4)? == 1,
                scan_subdirs: row.get::<_, i32>(5)? == 1,
                added_at: row.get::<_, String>(6)?.parse()?,
                last_scanned: row.get::<_, Option<String>>(7)?.map(|s| s.parse().ok())?,
                cache_path: row.get(8)?,
                cached_commit_sha: row.get(9)?,
                featured: row.get::<_, i32>(10)? == 1,
                category: row.get::<_, String>(11)?.parse()?,
            })
        })?.collect::<Result<Vec<_>, _>>()?;

        Ok(repos)
    }

    /// 删除仓库（级联清理）
    pub fn delete_repository(&self, id: &str) -> Result<u64> {
        // TODO: 级联删除关联的技能和缓存
        self.conn.execute(
            "DELETE FROM repositories WHERE id = ?1",
            params![id],
        )
    }

    /// 更新仓库信息
    pub fn update_repository(&self, repo: &Repository) -> Result<()> {
        self.conn.execute(
            "UPDATE repositories SET
             name = ?1, description = ?2, enabled = ?3, scan_subdirs = ?4,
             last_scanned = ?5, cache_path = ?6, cached_commit_sha = ?7
             WHERE id = ?8",
            params![
                repo.name,
                repo.description,
                repo.enabled as i32,
                repo.scan_subdirs as i32,
                repo.last_scanned.as_ref().map(|d| d.to_rfc3339()),
                repo.cache_path,
                repo.cached_commit_sha,
                repo.id,
            ],
        )?;

        Ok(())
    }

    /// 获取所有未扫描的仓库
    pub fn get_unscanned_repositories(&self) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT id FROM repositories WHERE last_scanned IS NULL AND enabled = 1"
        )?;

        let ids = stmt.query_map([], |row| row.get(0))?
            .collect::<Result<Vec<String>, _>>()?;

        Ok(ids)
    }
}
```

**任务清单**：
- [ ] 创建 `src-tauri/src/models/repository.rs`
- [ ] 实现 `Repository` 结构体
- [ ] 实现 `from_github_url()` 解析函数
- [ ] 实现 `validate_url()` 验证函数
- [ ] 创建 `src-tauri/src/services/repository.rs`
- [ ] 实现 `RepositoryService`
- [ ] 实现 `add_repository()` 添加仓库
- [ ] 实现 `delete_repository()` 删除仓库（含级联清理）
- [ ] 实现 `get_repository()` 查询仓库
- [ ] 实现 `list_repositories()` 列出所有仓库
- [ ] 实现 `update_repository()` 更新仓库配置

### T1-3：精选仓库系统（Featured Repositories）

**创建精选仓库配置文件** `featured-repositories.yaml`：

```yaml
version: "1.0"
last_updated: "2026-01-22"

categories:
  # Official repositories - 官方推荐
  - id: "official"
    name:
      en: "Official"
      zh: "官方推荐"
    description:
      en: "Official and verified skill repositories"
      zh: "官方认证的技能仓库"
    repositories:
      - url: "https://github.com/anthropics/skills"
        name: "anthropics"
        description:
          en: "Official Anthropic skills repository for Claude Code"
          zh: "Anthropic 官方 Claude Code 技能仓库"
        tags: ["official", "verified", "claude-code"]
        featured: true

      - url: "https://github.com/obra/superpowers"
        name: "obra"
        description:
          en: "Complete software development workflow for coding agents"
          zh: "专为 Claude Code 等 AI 编程助手设计的全自动开发工作流"
        tags: ["official", "verified", "superpowers"]
        featured: true

  # Community repositories - 社区精选
  - id: "community"
    name:
      en: "Community"
      zh: "社区精选"
    description:
      en: "High-quality community-contributed skill repositories"
      zh: "社区贡献的高质量技能仓库"
    repositories:
      - url: "https://github.com/ComposioHQ/awesome-claude-skills"
        name: "ComposioHQ"
        description:
          en: "Awesome list of Claude skills and resources"
          zh: "精选 Claude 技能和资源列表"
        tags: ["community", "awesome", "resources"]
        featured: true

      - url: "https://github.com/simonw/llm"
        name: "simonw"
        description:
          en: "CLI tools and Python library for interacting with LLMs"
          zh: "与 LLM 交互的 CLI 工具和 Python 库"
        tags: ["community", "llm", "cli"]
        featured: false
```

**实现精选仓库加载逻辑**：

```rust
// src-tauri/src/services/featured_repository.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

const FEATURED_REPOSITORIES_REMOTE_URL: &str =
    "https://raw.githubusercontent.com/brucevanfdm/agent-skills-guard/main/featured-repositories.yaml";
const DEFAULT_FEATURED_REPOSITORIES_YAML: &str = include_str!("../../../featured-repositories.yaml");

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeaturedRepositoriesConfig {
    pub version: String,
    pub last_updated: String,
    pub categories: Vec<FeaturedRepositoryCategory>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeaturedRepositoryCategory {
    pub id: String,
    pub name: HashMap<String, String>,      // 多语言支持
    pub description: HashMap<String, String>,
    pub repositories: Vec<FeaturedRepository>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeaturedRepository {
    pub url: String,
    pub name: String,
    pub description: HashMap<String, String>,
    pub tags: Vec<String>,
    pub featured: bool,
}

impl FeaturedRepositoryService {
    /// 获取精选仓库缓存路径
    fn cache_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
        let app_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        std::fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;

        Ok(app_dir.join("featured-repositories.yaml"))
    }

    /// 获取精选仓库配置（优先缓存，回退到内置）
    pub async fn get_config(app: &tauri::AppHandle) -> Result<FeaturedRepositoriesConfig, String> {
        let cache_path = Self::cache_path(app)?;

        // 1. 优先读取缓存
        if let Ok(cached_yaml) = fs::read_to_string(&cache_path) {
            match serde_yaml::from_str::<FeaturedRepositoriesConfig>(&cached_yaml) {
                Ok(config) => return Ok(config),
                Err(e) => {
                    log::warn!(
                        "精选仓库缓存文件解析失败，将回退到内置默认配置: {:?}, 错误: {}",
                        cache_path,
                        e
                    );
                }
            }
        }

        // 2. 回退到编译期内置的默认 YAML
        serde_yaml::from_str::<FeaturedRepositoriesConfig>(DEFAULT_FEATURED_REPOSITORIES_YAML)
            .map_err(|e| format!("Failed to parse default featured repositories: {}", e))
    }

    /// 刷新精选仓库配置（从远程下载）
    pub async fn refresh(app: &tauri::AppHandle) -> Result<FeaturedRepositoriesConfig, String> {
        let client = reqwest::Client::new();
        
        let yaml_content = client
            .get(FEATURED_REPOSITORIES_REMOTE_URL)
            .header(reqwest::header::USER_AGENT, "agent-skills-guard")
            .send()
            .await
            .map_err(|e| format!("Failed to download featured repositories: {}", e))?
            .error_for_status()
            .map_err(|e| format!("Failed to download featured repositories: {}", e))?
            .text()
            .await
            .map_err(|e| format!("Failed to read featured repositories content: {}", e))?;

        // 先校验解析成功，再落盘
        let config: FeaturedRepositoriesConfig = serde_yaml::from_str(&yaml_content)
            .map_err(|e| format!("Failed to parse downloaded featured repositories: {}", e))?;

        let cache_path = Self::cache_path(app)?;
        
        // 原子写入（使用临时文件）
        let mut tmp = tempfile::NamedTempFile::new_in(
            cache_path.parent().unwrap()
        ).map_err(|e| format!("Failed to create temp file: {}", e))?;
        
        tmp.write_all(yaml_content.as_bytes())
            .map_err(|e| format!("Failed to write temp file: {}", e))?;
        tmp.flush()
            .map_err(|e| format!("Failed to flush temp file: {}", e))?;

        if cache_path.exists() {
            let _ = fs::remove_file(&cache_path);
        }
        tmp.persist(&cache_path)
            .map_err(|e| format!("Failed to persist featured repositories cache: {}", e))?;

        Ok(config)
    }
}
```

**任务清单**：
- [ ] 创建 `featured-repositories.yaml` 配置文件
- [ ] 添加官方仓库配置（anthropics/skills, obra/superpowers）
- [ ] 添加社区精选配置（ComposioHQ 等）
- [ ] 实现多语言描述支持
- [ ] 创建 `src-tauri/src/services/featured_repository.rs`
- [ ] 实现 `get_config()` 加载配置
- [ ] 实现 `refresh()` 远程刷新
- [ ] 实现本地缓存机制

### T1-4：默认仓库初始化

**实现默认仓库自动初始化**：

```rust
// 在应用启动时调用

fn initialize_default_repositories(repo_service: &RepositoryService) -> Result<bool> {
    // 检查是否已有仓库（避免重复初始化）
    let existing = repo_service.list_repositories()?;
    if !existing.is_empty() {
        return Ok(false);
    }

    // 添加官方默认仓库
    let default_repos = vec![
        Repository {
            id: Uuid::new_v4().to_string(),
            url: "https://github.com/anthropics/skills".to_string(),
            name: "anthropics".to_string(),
            description: Some("Anthropic 官方 Claude Code 技能仓库".to_string()),
            enabled: true,
            scan_subdirs: false,
            added_at: Utc::now(),
            last_scanned: None,
            cache_path: None,
            cached_commit_sha: None,
            featured: true,
            category: RepositoryCategory::Official,
        },
        Repository {
            id: Uuid::new_v4().to_string(),
            url: "https://github.com/obra/superpowers".to_string(),
            name: "obra".to_string(),
            description: Some("专为 Claude Code 等 AI 编程助手设计的全自动开发工作流".to_string()),
            enabled: true,
            scan_subdirs: true,
            added_at: Utc::now(),
            last_scanned: None,
            cache_path: None,
            cached_commit_sha: None,
            featured: true,
            category: RepositoryCategory::Official,
        },
    ];

    for repo in default_repos {
        repo_service.add_repository(&repo)?;
        log::info!("成功添加默认仓库: {}", repo.name);
    }

    Ok(true)
}
```

**任务清单**：
- [ ] 在应用启动时初始化默认仓库
- [ ] 添加 anthropics/skills（官方）
- [ ] 添加 obra/superpowers（官方）
- [ ] 避免重复初始化（检查已有仓库）
- [ ] 记录初始化日志

### T1-5：仓库扫描命令

**实现仓库扫描命令**：

```rust
// src-tauri/src/commands/repository.rs

use crate::models::repository::Repository;
use crate::services::repository::RepositoryService;
use crate::services::github::GitHubService;

#[tauri::command]
pub async fn add_repository(
    state: State<'_, AppState>,
    url: String,
    name: Option<String>,
) -> Result<String, String> {
    // 验证 URL 格式
    Repository::validate_url(&url)
        .map_err(|e| e.to_string())?;

    // 从 URL 提取默认名称
    let repo_name = name.unwrap_or_else(|| {
        let (_, repo) = Repository::from_github_url(&url).unwrap();
        repo
    });

    // 创建仓库记录
    let repo = Repository::new(url, repo_name);
    
    // 保存到数据库
    let repo_service = state.repository_service.lock().await;
    let repo_id = repo_service.add_repository(&repo)
        .map_err(|e| e.to_string())?;

    // 触发首次扫描
    drop(repo_service);
    scan_repository(state.clone(), repo_id.clone()).await?;

    Ok(repo_id)
}

#[tauri::command]
pub async fn scan_repository(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Vec<Skill>, String> {
    let repo_service = state.repository_service.lock().await;
    let repo = repo_service.get_repository(&repo_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "仓库不存在".to_string())?;

    let (owner, repo_name) = Repository::from_github_url(&repo.url)
        .map_err(|e| e.to_string())?;

    // 确定缓存基础目录
    let cache_base_dir = dirs::cache_dir()
        .ok_or("无法获取缓存目录".to_string())?
        .join("agent-skills-guard")
        .join("repositories");

    // 下载并扫描仓库
    let github_service = state.github_service.lock().await;
    
    let skills = if let Some(cache_path) = &repo.cache_path {
        // 使用缓存扫描（0 次 API 请求）
        let cache_path_buf = std::path::PathBuf::from(cache_path);
        if cache_path_buf.exists() && cache_path_buf.is_dir() {
            github_service.scan_cached_repository(&cache_path_buf, &repo.url, repo.scan_subdirs)
                .map_err(|e| format!("扫描缓存失败: {}", e))?
        } else {
            // 缓存路径不存在，重新下载
            let (extract_dir, commit_sha) = github_service
                .download_repository_archive(&owner, &repo_name, &cache_base_dir)
                .await
                .map_err(|e| format!("下载仓库压缩包失败: {}", e))?;

            // 更新数据库缓存信息
            repo_service.update_repository_cache(&repo_id, &extract_dir, Utc::now(), Some(&commit_sha))?;

            github_service.scan_cached_repository(&extract_dir, &repo.url, repo.scan_subdirs)
                .map_err(|e| format!("扫描缓存失败: {}", e))?
        }
    } else {
        // 首次扫描：下载压缩包并缓存
        let (extract_dir, commit_sha) = github_service
            .download_repository_archive(&owner, &repo_name, &cache_base_dir)
            .await
            .map_err(|e| format!("下载仓库压缩包失败: {}", e))?;

        // 更新数据库缓存信息
        repo_service.update_repository_cache(&repo_id, &extract_dir, Utc::now(), Some(&commit_sha))?;

        github_service.scan_cached_repository(&extract_dir, &repo.url, repo.scan_subdirs)
            .map_err(|e| format!("扫描缓存失败: {}", e))?
    };

    // 保存技能到数据库
    let db = state.db.lock().await;
    for skill in &skills {
        db.save_skill(skill).map_err(|e| e.to_string())?;
    }

    Ok(skills)
}

#[tauri::command]
pub async fn delete_repository(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<(), String> {
    let repo_service = state.repository_service.lock().await;
    let repo = repo_service.get_repository(&repo_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "仓库不存在".to_string())?;

    // 删除未安装的技能
    let db = state.db.lock().await;
    let deleted_count = db.delete_skills_by_repository(&repo.url)
        .map_err(|e| e.to_string())?;
    
    log::info!("删除仓库 {} 的 {} 个技能", repo.name, deleted_count);

    // 清理缓存目录
    if let Some(cache_path) = &repo.cache_path {
        let cache_path_buf = std::path::PathBuf::from(cache_path);
        if cache_path_buf.exists() {
            std::fs::remove_dir_all(&cache_path_buf)
                .map_err(|e| format!("删除缓存目录失败: {}", e))?;
        }
    }

    // 删除仓库记录
    repo_service.delete_repository(&repo_id)
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn auto_scan_unscanned_repositories(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    let repo_service = state.repository_service.lock().await;
    let unscanned_ids = repo_service.get_unscanned_repositories()
        .map_err(|e| e.to_string())?;

    if unscanned_ids.is_empty() {
        return Ok(vec![]);
    }

    log::info!("发现 {} 个未扫描的仓库，开始自动扫描...", unscanned_ids.len());

    let mut scanned_repos = Vec::new();

    for repo_id in unscanned_ids {
        match scan_repository(state.clone(), repo_id.clone()).await {
            Ok(skills) => {
                log::info!("仓库 {} 扫描成功，发现 {} 个技能", repo_id, skills.len());
                scanned_repos.push(repo_id);
            }
            Err(e) => {
                log::warn!("仓库 {} 扫描失败: {}", repo_id, e);
            }
        }
    }

    Ok(scanned_repos)
}
```

**任务清单**：
- [ ] 实现 `add_repository` 命令
- [ ] 实现 `delete_repository` 命令
- [ ] 实现 `scan_repository` 命令
  - GitHub API 扫描（首次）
  - 本地缓存扫描（后续）
  - 智能跳过来已扫描的技能
- [ ] 实现 `auto_scan_unscanned_repositories` 命令
- [ ] 注册新命令到 Tauri

**参考最佳实践**（进度报告）：
```rust
// 使用 Channel 进行流式进度更新
use tauri::ipc::Channel;

#[tauri::command]
async fn scan_repository(
    repo_id: String,
    on_progress: Channel<ScanProgress>,
) -> Result<(), String> {
    for i in 0..=100 {
        on_progress.send(ScanProgress {
            current: i,
            total: 100,
            status: "Scanning...",
        }).unwrap();
        
        tokio::time::sleep(std::time::Duration::from_millis(100)).await;
    }
    
    on_progress.send(ScanProgress {
        current: 100,
        total: 100,
        status: "Completed",
    }).unwrap();
    
    Ok(())
}
```

---

## 第二阶段：前端仓库管理 UI

**目标**：提供完整的仓库管理界面  
**优先级**：P0  
**预估工作量**：2 周

### T2-1：仓库管理 Hooks

**创建 `src/hooks/useRepositories.ts`**：

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export interface Repository {
  id: string;
  url: string;
  name: string;
  description?: string;
  enabled: boolean;
  scan_subdirs: boolean;
  added_at: string;
  last_scanned?: string;
  cache_path?: string;
  cached_commit_sha?: string;
  featured: boolean;
  category: 'Official' | 'Community' | 'Custom';
}

export interface FeaturedRepository {
  url: string;
  name: string;
  description: { en: string; zh: string };
  tags: string[];
  featured: boolean;
}

export interface FeaturedCategory {
  id: string;
  name: { en: string; zh: string };
  description: { en: string; zh: string };
  repositories: FeaturedRepository[];
}

export function useRepositories() {
  return useQuery({
    queryKey: ['repositories'],
    queryFn: () => invoke<Repository[]>('get_repositories'),
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  });
}

export function useAddRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ url, name }: { url: string; name?: string }) =>
      invoke<string>('add_repository', { url, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useDeleteRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoId: string) => invoke<void>('delete_repository', { repoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useScanRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoId: string) => invoke<void>('scan_repository', { repoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
}

export function useFeaturedRepositories() {
  return useQuery({
    queryKey: ['featured-repositories'],
    queryFn: () => invoke<{ categories: FeaturedCategory[] }>('get_featured_repositories'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useRefreshFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke<{ categories: FeaturedCategory[] }>('refresh_featured_repositories'),
    onSuccess: (data) => {
      queryClient.setQueryData(['featured-repositories'], data);
    },
  });
}
```

**任务清单**：
- [ ] 创建 `src/hooks/useRepositories.ts`
- [ ] 实现 `useRepositories()` 列出仓库
- [ ] 实现 `useAddRepository()` 添加仓库
- [ ] 实现 `useDeleteRepository()` 删除仓库
- [ ] 实现 `useScanRepository()` 扫描仓库
- [ ] 实现 `useFeaturedRepositories()` 获取精选仓库
- [ ] 实现 `useRefreshFeatured()` 刷新精选仓库

### T2-2：仓库管理页面

**创建 `src/pages/Repositories.tsx`**：

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRepositories, useAddRepository, useDeleteRepository, useScanRepository } from '../hooks/useRepositories';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { appToast } from '../components/common/Toast';
import { Plus, Trash2, RefreshCw, ExternalLink, Check, Loader2 } from 'lucide-react';

export function RepositoriesPage() {
  const { t, i18n } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);

  const { data: repositories, isLoading } = useRepositories();
  const addMutation = useAddRepository();
  const deleteMutation = useDeleteRepository();
  const scanMutation = useScanRepository();

  // 从 URL 自动提取 owner 作为默认名称
  const handleUrlChange = (url: string) => {
    setNewRepoUrl(url);
    if (url.includes('github.com/')) {
      const parts = url.split('/');
      const owner = parts[parts.length - 2];
      setNewRepoName(owner);
    }
  };

  const handleAddRepository = () => {
    if (!newRepoUrl) return;

    addMutation.mutate(
      { url: newRepoUrl, name: newRepoName },
      {
        onSuccess: (repoId) => {
          setShowAddForm(false);
          setNewRepoUrl('');
          setNewRepoName('');
          appToast.success(t('repositories.toast.added'));
          
          // 自动触发扫描
          setScanningRepoId(repoId);
          scanMutation.mutate(repoId, {
            onSuccess: () => {
              setScanningRepoId(null);
              appToast.success(t('repositories.toast.foundSkills'));
            },
            onError: (error) => {
              setScanningRepoId(null);
              appToast.error(`${t('repositories.toast.scanError')}${error}`);
            },
          });
        },
        onError: (error) => {
          appToast.error(`${t('repositories.toast.error')}${error}`);
        },
      }
    );
  };

  const handleDeleteRepository = (repoId: string, repoName: string) => {
    if (confirm(t('repositories.deleteConfirm', { name: repoName }))) {
      deleteMutation.mutate(repoId, {
        onSuccess: () => {
          appToast.success(t('repositories.toast.deleted'));
        },
        onError: (error) => {
          appToast.error(`${t('repositories.toast.deleteError')}${error}`);
        },
      });
    }
  };

  const getLocalizedText = (text: { en: string; zh: string }) => {
    return i18n.language === 'zh' ? text.zh : text.en;
  };

  if (isLoading) {
    return <div className="p-6">{t('common.loading')}</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('repositories.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('repositories.subtitle', { count: repositories?.length || 0 })}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('repositories.add')}
        </Button>
      </div>

      {/* 仓库列表 */}
      <div className="grid gap-4">
        {repositories?.map((repo) => (
          <div
            key={repo.id}
            className="apple-card p-4 flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{repo.name}</h3>
                {repo.featured && (
                  <Badge variant="default">{t('repositories.featured')}</Badge>
                )}
                <Badge variant="outline">{repo.category}</Badge>
              </div>
              <a
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground flex items-center gap-1 mt-1 hover:text-primary"
              >
                {repo.url}
                <ExternalLink className="w-3 h-3" />
              </a>
              {repo.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {repo.description}
                </p>
              )}
              <div className="text-xs text-muted-foreground mt-2">
                {t('repositories.addedAt')}: {new Date(repo.added_at).toLocaleDateString()}
                {repo.last_scanned && (
                  <> · {t('repositories.lastScanned')}: {new Date(repo.last_scanned).toLocaleDateString()}</>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* 扫描按钮 */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScanningRepoId(repo.id);
                  scanMutation.mutate(repo.id, {
                    onSuccess: () => setScanningRepoId(null),
                    onError: (error) => {
                      setScanningRepoId(null);
                      appToast.error(`${t('repositories.toast.scanError')}${error}`);
                    },
                  });
                }}
                disabled={scanningRepoId === repo.id || scanMutation.isPending()}
              >
                {scanningRepoId === repo.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>

              {/* 删除按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteRepository(repo.id, repo.name)}
                disabled={deleteMutation.isPending()}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}

        {repositories?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>{t('repositories.empty')}</p>
            <Button
              variant="link"
              onClick={() => setShowAddForm(true)}
              className="mt-2"
            >
              {t('repositories.addFirst')}
            </Button>
          </div>
        )}
      </div>

      {/* 添加仓库模态框 */}
      <Modal
        open={showAddForm}
        onOpenChange={setShowAddForm}
        title={t('repositories.addDialog.title')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('repositories.addDialog.url')}
            </label>
            <Input
              placeholder="https://github.com/owner/repo"
              value={newRepoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('repositories.addDialog.name')}
            </label>
            <Input
              placeholder={t('repositories.addDialog.namePlaceholder')}
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddRepository}
              disabled={!newRepoUrl || addMutation.isPending()}
            >
              {addMutation.isPending() ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {t('repositories.add')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
```

**任务清单**：
- [ ] 创建 `src/pages/Repositories.tsx`
- [ ] 实现仓库列表展示
- [ ] 实现添加仓库表单
- [ ] 实现 URL 自动提取 owner 名称
- [ ] 实现仓库扫描功能
- [ ] 实现删除仓库功能
- [ ] 实现进度状态显示
- [ ] 添加国际化支持

### T2-3：精选仓库组件

**创建 `src/components/FeaturedRepositories.tsx`**：

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useFeaturedRepositories,
  useRefreshFeatured,
  useAddRepository,
  useRepositories,
} from '../hooks/useRepositories';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { appToast } from '../components/common/Toast';
import { Plus, Check, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface FeaturedRepositoriesProps {
  categoryIds?: string[];
  defaultExpandedCategories?: string[];
}

export function FeaturedRepositories({
  categoryIds,
  defaultExpandedCategories = ['official', 'community'],
}: FeaturedRepositoriesProps) {
  const { t, i18n } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(defaultExpandedCategories);

  const { data: config, isLoading } = useFeaturedRepositories();
  const refreshMutation = useRefreshFeatured();
  const { data: existingRepos } = useRepositories();
  const addMutation = useAddRepository();

  const isAdded = (url: string) => {
    return existingRepos?.some((repo) => repo.url === url) || false;
  };

  const getLocalizedText = (text: { en: string; zh: string }) => {
    return i18n.language === 'zh' ? text.zh : text.en;
  };

  // 分类过滤
  const categories = (() => {
    if (!categoryIds || categoryIds.length === 0) return config?.categories || [];
    const byId = new Map(config?.categories.map((c) => [c.id, c]) || []);
    return categoryIds.map((id) => byId.get(id)).filter(Boolean);
  })();

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (isLoading) {
    return <div className="p-4">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-4">
      {/* 刷新按钮 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('repositories.featured.title')}</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending()}
        >
          {refreshMutation.isPending() ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* 分类列表 */}
      {categories.map((category) => (
        <div key={category.id} className="apple-card">
          {/* 分类头部 */}
          <button
            className="w-full flex items-center justify-between p-4 border-b border-border/60"
            onClick={() => toggleCategory(category.id)}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{getLocalizedText(category.name)}</h3>
              <Badge variant="secondary">{category.repositories.length}</Badge>
            </div>
            {expandedCategories.includes(category.id) ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {/* 仓库列表 */}
          {expandedCategories.includes(category.id) && (
            <div className="divide-y divide-border/60">
              {category.repositories.map((repo) => (
                <div key={repo.url} className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{repo.name}</h4>
                      {repo.featured && (
                        <Badge variant="default">{t('repositories.featured')}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getLocalizedText(repo.description)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {repo.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-muted rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      addMutation.mutate(
                        { url: repo.url, name: repo.name },
                        {
                          onSuccess: () => {
                            appToast.success(t('repositories.toast.added'));
                          },
                          onError: (error) => {
                            appToast.error(`${t('repositories.toast.error')}${error}`);
                          },
                        }
                      );
                    }}
                    disabled={isAdded(repo.url) || addMutation.isPending()}
                  >
                    {isAdded(repo.url) ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {t('repositories.added')}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('repositories.add')}
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

**任务清单**：
- [ ] 创建 `src/components/FeaturedRepositories.tsx`
- [ ] 实现分类折叠面板
- [ ] 实现多语言描述切换
- [ ] 实现标签展示
- [ ] 实现"添加到我的仓库"按钮
- [ ] 实现已添加状态检测
- [ ] 实现刷新功能

### T2-4：仓库管理命令注册

**在 `lib.rs` 中注册新命令**：

```rust
// src-tauri/src/lib.rs

#[tauri::command]
pub async fn get_repositories(
    state: State<'_, AppState>,
) -> Result<Vec<Repository>, String> {
    let repo_service = state.repository_service.lock().await;
    repo_service.list_repositories().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_featured_repositories(
    app: tauri::AppHandle,
) -> Result<FeaturedRepositoriesConfig, String> {
    FeaturedRepositoryService::get_config(&app).await
}

#[tauri::command]
pub async fn refresh_featured_repositories(
    app: tauri::AppHandle,
) -> Result<FeaturedRepositoriesConfig, String> {
    FeaturedRepositoryService::refresh(&app).await
}

// 在 invoke_handler 中注册
invoke_handler(tauri::generate_handler![
    // ... 现有命令
    get_repositories,
    add_repository,
    delete_repository,
    scan_repository,
    get_featured_repositories,
    refresh_featured_repositories,
    auto_scan_unscanned_repositories,
])
```

**任务清单**：
- [ ] 在 `lib.rs` 中注册仓库管理命令
- [ ] 更新 `invoke_handler` 列表
- [ ] 添加前端 API 客户端函数
- [ ] 测试命令调用链路

---

## 第三阶段：Share-First 生态完善

**目标**：实现 PRD v2 要求的分享生态  
**优先级**：P1  
**预估工作量**：4-5 周

### T3-1：统一分享入口（Share Sheet）

**创建 `src/components/ShareSheet.tsx`**：

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { ShareTextDialog } from './ShareTextDialog';
import { ShareImageDialog } from './ShareImageDialog';
import {
  Share2,
  Link,
  QrCode,
  Package,
  Globe,
  Users,
  Copy,
  Check,
} from 'lucide-react';

interface ShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skill: Skill;
}

export function ShareSheet({ open, onOpenChange, skill }: ShareSheetProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'link' | 'text' | 'image' | 'export'>('link');
  const [copied, setCopied] = useState(false);

  const shareUrl = `https://skills.example.com/share/${skill.id}`;

  const copy () => {
    await navigator.clipboardLink = async.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('share.title')}
      className="max-w-lg"
    >
      <div className="space-y-4">
        {/* 预览卡片 */}
        <div className="apple-card p-4 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold">{skill.name}</h4>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {skill.description}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Badge variant={skill.security_level === 'safe' ? 'success' : 'warning'}>
              {skill.security_score} {t('security.score')}
            </Badge>
            {skill.quality_score && (
              <Badge variant="default">{skill.quality_score} {t('quality.score')}</Badge>
            )}
          </div>
        </div>

        {/* 分享选项 */}
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`p-3 rounded-lg border transition-colors ${
              activeTab === 'link'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted'
            }`}
            onClick={() => setActiveTab('link')}
          >
            <Link className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">{t('share.options.copyLink')}</span>
          </button>

          <button
            className={`p-3 rounded-lg border transition-colors ${
              activeTab === 'text'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted'
            }`}
            onClick={() => setActiveTab('text')}
          >
            <Copy className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">{t('share.options.text')}</span>
          </button>

          <button
            className={`p-3 rounded-lg border transition-colors ${
              activeTab === 'image'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted'
            }`}
            onClick={() => setActiveTab('image')}
          >
            <QrCode className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">{t('share.options.image')}</span>
          </button>

          <button
            className={`p-3 rounded-lg border transition-colors ${
              activeTab === 'export'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted'
            }`}
            onClick={() => setActiveTab('export')}
          >
            <Package className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">{t('share.options.export')}</span>
          </button>
        </div>

        {/* 内容区域 */}
        <div className="mt-4">
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-lg bg-muted"
                />
                <Button onClick={copyLink}>
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  <Globe className="w-4 h-4 mr-2" />
                  {t('share.visibility.unlisted')}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Users className="w-4 h-4 mr-2" />
                  {t('share.visibility.team')}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'text' && (
            <ShareTextDialog skill={skill} onClose={() => {}} />
          )}

          {activeTab === 'image' && (
            <ShareImageDialog skill={skill} onClose={() => {}} />
          )}

          {activeTab === 'export' && (
            <div className="text-center py-4">
              <Package className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t('share.export.description')}
              </p>
              <Button className="mt-4">
                {t('share.export.button')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
```

**任务清单**：
- [ ] 创建 `src/components/ShareSheet.tsx`
- [ ] 支持多种对象类型（Skill/Profile/Collection）
- [ ] 渐进式展开选项
- [ ] 实现预览卡片实时显示
- [ ] 实现链接复制功能
- [ ] 实现可见性切换

### T3-2：分享链接系统

**设计分享链接数据结构**：

```typescript
interface ShareLink {
  id: string;           // 唯一标识符
  type: 'skill' | 'profile' | 'collection';
  objectId: string;     // 对象 ID
  createdAt: string;    // 创建时间
  expiresAt?: string;   // 过期时间（可选）
  visibility: 'unlisted' | 'public' | 'org';
  creatorId?: string;   // 创作者 ID
}

interface SharePageData {
  object: Skill | Profile | Collection;
  trustReport: SecurityReport;
  compatibility: CompatibilityInfo;
  diagnostics: DiagnosticResult[];
  installUrl: string;
}
```

**任务清单**：
- [ ] 设计分享链接数据结构
- [ ] 实现链接生成逻辑
- [ ] 实现链接解析/验证
- [ ] 创建分享页面组件
- [ ] 实现安全等级展示
- [ ] 实现兼容性徽章
- [ ] 实现一键安装按钮
- [ ] 实现依赖诊断摘要

### T3-3：发布向导（Publish Wizard）

**创建 `src/components/PublishWizard.tsx`**：

```typescript
interface PublishWizardProps {
  skill: Skill;
  onComplete: (result: PublishResult) => void;
  onCancel: () => void;
}

export function PublishWizard({ skill, onComplete, onCancel }: PublishWizardProps) {
  const [step, setStep] = useState<'preflight' | 'metadata' | 'version' | 'submit'>('preflight');
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);

  // 步骤 1：发布前检查
  const runPreflight = async () => {
    const result = await invoke<PreflightResult>('run_publish_preflight', {
      skillPath: skill.local_path,
    });
    setPreflightResult(result);
    if (result.passed) {
      setStep('metadata');
    }
  };

  // 步骤 2：元数据编辑
  const handleMetadataSubmit = (metadata: PublishMetadata) => {
    setStep('version');
  };

  // 步骤 3：版本策略选择
  const handleVersionSubmit = (versionStrategy: VersionStrategy) => {
    setStep('submit');
  };

  // 步骤 4：提交发布
  const handleSubmit = async () => {
    const result = await invoke<PublishResult>('publish_skill', {
      skillId: skill.id,
      // ... 收集的所有数据
    });
    onComplete(result);
  };

  return (
    <Modal open onOpenChange={() => {}} title={t('publish.title')} className="max-w-2xl">
      {/* 进度指示器 */}
      <div className="flex items-center justify-center gap-4 mb-6">
        {['preflight', 'metadata', 'version', 'submit'].map((s, i) => (
          <div
            key={s}
            className={`flex items-center gap-2 ${
              step === s ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === s ? 'bg-primary text-white' : 'bg-muted'
            }`}>
              {i + 1}
            </div>
            <span className="text-sm">{t(`publish.steps.${s}`)}</span>
            {i < 3 && <div className="w-8 h-px bg-muted" />}
          </div>
        ))}
      </div>

      {/* 各步骤内容 */}
      {step === 'preflight' && (
        <PreflightCheck
          skill={skill}
          onRun={runPreflight}
          result={preflightResult}
        />
      )}

      {step === 'metadata' && (
        <PublishMetadataForm
          skill={skill}
          onSubmit={handleMetadataSubmit}
        />
      )}

      {step === 'version' && (
        <VersionStrategyForm
          skill={skill}
          onSubmit={handleVersionSubmit}
        />
      )}

      {step === 'submit' && (
        <PublishSubmit
          skill={skill}
          onSubmit={handleSubmit}
          onCancel={onCancel}
        />
      )}
    </Modal>
  );
}
```

**任务清单**：
- [ ] 创建 `src/components/PublishWizard.tsx`
- [ ] 实现发布前检查（Preflight）
  - SKILL.md 结构检查
  - Secrets 扫描
  - 依赖声明检查
  - License 检查
- [ ] 实现元数据编辑
- [ ] 实现版本策略选择
- [ ] 实现提交与确认
- [ ] 实现进度反馈

### T3-4：社区市场增强

**任务清单**：
- [ ] 扩展市场搜索功能
- [ ] 添加高级筛选
  - 已验证/安全
  - 风险提示
  - 兼容当前 Agent
  - 标签过滤
- [ ] 实现排序选项
  - 热门安装量
  - 高评分
  - 最近更新
- [ ] 添加创作者信息展示
- [ ] 实现评价与反馈入口

### T3-5：兼容性徽章系统

**任务清单**：
- [ ] 定义兼容性数据模型
  - 目标 Agent 列表
  - 每个目标的状态
  - 兼容说明
- [ ] 实现兼容性检测逻辑
- [ ] 创建 `CompatibilityBadge` 组件
- [ ] 在技能卡片和详情页展示

---

## 第四阶段：高级分享功能

**目标**：完善分享生态的高级功能  
**优先级**：P2  
**预估工作量**：3-4 周

### T4-1：嵌入卡片（Embed Card）

**任务清单**：
- [ ] 设计嵌入卡片格式
  - Markdown 输出
  - HTML 输出
- [ ] 创建嵌入卡片生成器
- [ ] 实现复制到剪贴板功能

### T4-2：派生体系（Fork/Remix）

**任务清单**：
- [ ] 设计派生关系数据结构
  - 父对象 ID
  - 派生原因
  - 署名信息
- [ ] 实现一键派生功能
- [ ] 实现谱系展示
- [ ] 实现贡献回馈机制

### T4-3：合集系统（Collections）

**任务清单**：
- [ ] 创建合集数据模型
- [ ] 实现合集创建/编辑
- [ ] 实现合集分享
- [ ] 实现合集发现页面

### T4-4：创作者系统

**任务清单**：
- [ ] 创建创作者数据模型
- [ ] 实现创作者主页
- [ ] 实现作品统计
- [ ] 实现关注功能

---

## 第五阶段：性能与体验优化

**目标**：提升用户体验和系统性能  
**优先级**：P2  
**预估工作量**：2 周

### T5-1：后台任务管理

**参考最佳实践**（来自 Tauri 搜索结果）：

```rust
// 使用 spawn_blocking 进行 CPU 密集型任务
use tokio::task;

let handle = task::spawn_blocking(|| {
    compress_files(path)
});

let result = handle.await?;
```

```rust
// 使用 Semaphore 控制并发
use tokio::sync::Semaphore;

static SCAN_SEMAPHORE: Semaphore = Semaphore::const_new(5);

async fn scan_skill(skill_path: &str) -> Result<()> {
    let _permit = SCAN_SEMAPHORE.acquire().await;
    // 每次最多 5 个并发扫描
    // ...
    Ok(())
}
```

**任务清单**：
- [ ] 实现扫描进度跟踪（使用 Channel）
- [ ] 实现下载进度跟踪
- [ ] 创建任务中心 UI
- [ ] 添加任务取消功能
- [ ] 实现并发控制

### T5-2：缓存优化

**参考最佳实践**（来自 Moka 搜索结果）：

```rust
use moka::sync::Cache;

struct SkillCache {
    cache: Cache<String, Skill>,
}

impl SkillCache {
    pub fn new() -> Self {
        Self {
            cache: Cache::builder()
                .time_to_live(Duration::from_secs(300)) // 5分钟 TTL
                .max_capacity(1000)
                .build(),
        }
    }
}
```

**任务清单**：
- [ ] 实现 LRU 缓存策略
- [ ] 添加缓存大小限制
- [ ] 实现缓存手动清理
- [ ] 优化缓存查找性能
- [ ] 实现 TTL 支持

### T5-3：GitHub API 优化

**参考最佳实践**（来自 backoff 搜索结果）：

```rust
use backoff::ExponentialBackoff;

async fn fetch_with_retry(url: &str) -> Result<reqwest::Response> {
    let operation = || async {
        reqwest::get(url).await
    };

    ExponentialBackoff::default()
        .retry(operation)
        .await
        .ok()
        .context("Failed after retries")
}
```

**任务清单**：
- [ ] 实现 API 速率限制处理
- [ ] 添加请求重试机制（指数退避）
- [ ] 实现并发请求控制
- [ ] 添加请求超时处理

### T5-4：数据库优化

**任务清单**：
- [ ] 添加必要索引
- [ ] 实现批量操作
- [ ] 添加连接池监控
- [ ] 实现数据库压缩
- [ ] 启用 WAL 模式

---

## 验收标准

### 多来源仓库管理验收

- [ ] 用户可以添加任意 GitHub 仓库
- [ ] 系统自动初始化两个默认仓库
- [ ] 仓库支持启用/禁用
- [ ] 删除仓库自动清理关联的技能和缓存
- [ ] 精选仓库支持分类展示和多语言
- [ ] 仓库扫描有进度反馈
- [ ] 扫描结果正确保存到数据库

### Share-First 验收

- [ ] 技能卡片有统一分享入口
- [ ] 生成分享链接可正常访问
- [ ] 分享页面显示安全等级和兼容性
- [ ] 发布前自动执行安全检查
- [ ] 市场支持搜索、筛选、排序
- [ ] 创作者信息正确展示

### 性能验收

- [ ] 仓库扫描不阻塞 UI
- [ ] 大型仓库扫描有进度条
- [ ] 缓存查询 < 10ms
- [ ] 数据库操作无锁等待

---

## 任务依赖关系

```
T1-1 (DB Schema) 
  ↓
T1-2 (Model+Service) → T1-3 (Featured) → T1-4 (Default Init) → T1-5 (Scan Commands)
  ↓
T2-1 (Hooks) → T2-2 (Repositories Page) → T2-3 (Featured UI) → T2-4 (Register Commands)
  ↓
T3-1 (Share Sheet) → T3-2 (Share Links) → T3-3 (Publish Wizard)
                                         ↓
                                       T3-4 (Marketplace) → T3-5 (Compatibility)
  ↓
T4-1 (Embed) → T4-2 (Fork) → T4-3 (Collections) → T4-4 (Creator)
  ↓
T5-1 (Background Tasks) → T5-2 (Cache) → T5-3 (API) → T5-4 (DB)
```

---

## 资源索引

### 核心文档
- **PRD**: `docs/prd-v2.md`
- **任务规划**: `docs/task.md`
- **UI/UX**: `docs/task-ui.md`
- **参考实现**: `agent-skills-guard.md`

### 技术参考
- **Tauri 官方文档**: https://v2.tauri.app/
- **SQLite 优化**: https://www.sqlite.org/wal.html
- **Tokio 最佳实践**: https://tokio.rs/tokio/topics/shutdown
- **Moka 缓存**: https://docs.rs/moka/latest/moka/
- **Backoff 重试**: https://docs.rs/backoff/latest/backoff/

---

**文档状态**: ✅ 任务清单已完成  
**下一步**: 请审阅此任务清单，确认优先级和范围后开始实施

