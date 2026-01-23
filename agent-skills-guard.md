# Agent Skills Guard 多来源管理与技能生命周期分析

## 项目概述

Agent Skills Guard 是一个基于 Tauri 的桌面应用程序（Rust 后端 + React 前端），用于安全地管理 Claude Code 技能。它提供了完整的多来源技能仓库管理系统，支持从多种来源获取、安装、更新和管理技能，同时内置了业界领先的安全扫描引擎。

## 目录

1. [多来源管理架构](#一多来源管理架构)
2. [仓库管理操作流程](#二仓库管理操作流程)
3. [技能下载与安装流程](#三技能下载与安装流程)
4. [技能生命周期管理](#四技能生命周期管理)
5. [安全扫描机制](#五安全扫描机制)
6. [缓存管理策略](#六缓存管理策略)
7. [数据库架构设计](#七数据库架构设计)
8. [前端交互设计](#八前端交互设计)
9. [API 端点汇总](#九api-端点汇总)
10. [总结](#十总结)

---

## 一、多来源管理架构

Agent Skills Guard 实现了完整的多来源技能仓库管理系统，支持三种类型的仓库来源：

### 1. 默认仓库 (Default Repositories)

系统首次启动时会自动初始化两个官方默认仓库。

#### 自动初始化机制

```rust
// src-tauri/src/services/database.rs:453-521
fn initialize_default_repositories(&self) -> Result<bool> {
    let conn = self.conn.lock().unwrap();

    // 检查是否已有仓库（避免重复初始化）
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM repositories",
        [],
        |row| row.get(0),
    )?;

    if count > 0 {
        return Ok(false);
    }

    // 添加官方默认仓库
    let default_repos = vec![
        (
            "https://github.com/anthropics/skills".to_string(),
            "anthropics".to_string(),
        ),
        (
            "https://github.com/obra/superpowers".to_string(),
            "obra".to_string(),
        ),
    ];

    drop(conn);
    let conn = self.conn.lock().unwrap();

    let mut added = false;
    for (url, name) in default_repos {
        let repo = Repository::new(url, name);
        // 使用 INSERT OR IGNORE 避免重复
        match conn.execute(
            "INSERT OR IGNORE INTO repositories
            (id, url, name, description, enabled, scan_subdirs, added_at, last_scanned, cache_path, cached_at, cached_commit_sha)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
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
                repo.cached_at.as_ref().map(|d| d.to_rfc3339()),
                repo.cached_commit_sha,
            ],
        ) {
            Ok(rows_affected) => {
                if rows_affected > 0 {
                    log::info!("成功添加默认仓库: {}", repo.name);
                    added = true;
                }
            }
            Err(e) => {
                log::warn!("添加默认仓库 {} 失败: {}", repo.name, e);
            }
        }
    }

    Ok(added)
}
```

#### 默认仓库列表

| 名称                 | URL                                    | 描述                                |
| -------------------- | -------------------------------------- | ----------------------------------- |
| **Anthropic Skills** | `https://github.com/anthropics/skills` | Anthropic 官方 Claude Code 技能仓库 |
| **Obra Superpowers** | `https://github.com/obra/superpowers`  | 完整的软件开发生命周期工作流技能包  |

### 2. 用户自定义仓库 (User-Added Repositories)

用户可以手动添加任意 GitHub 仓库作为技能来源。

#### 添加仓库流程

```typescript
// src/components/RepositoriesPage.tsx:110-139
const handleAddRepository = () => {
  if (newRepoUrl && newRepoName) {
    addMutation.mutate(
      { url: newRepoUrl, name: newRepoName },
      {
        onSuccess: (repoId) => {
          // 清空表单
          setNewRepoUrl("");
          setNewRepoName("");
          setShowAddForm(false);
          appToast.success(t("repositories.toast.added"));

          // 自动触发扫描
          setScanningRepoId(repoId);
          scanMutation.mutate(repoId, {
            onSuccess: (skills) => {
              setScanningRepoId(null);
              appToast.success(t("repositories.toast.foundSkills", { count: skills.length }));
            },
            onError: (error: any) => {
              setScanningRepoId(null);
              appToast.error(`${t("repositories.toast.scanError")}${error.message || error}`);
            },
          });
        },
        onError: (error: any) => {
          appToast.error(`${t("repositories.toast.error")}${error.message || error}`);
        },
      }
    );
  }
};
```

#### URL 验证和解析

```rust
// src-tauri/src/models/repository.rs:39-53
pub fn from_github_url(url: &str) -> Result<(String, String)> {
    let url = url.trim_end_matches('/');
    let parts: Vec<&str> = url.split('/').collect();

    if parts.len() < 2 {
        return Err(anyhow!("Invalid GitHub URL"));
    }

    let owner = parts[parts.len() - 2].to_string();
    let repo = parts[parts.len() - 1].to_string();

    Ok((owner, repo))
}
```

**验证规则：**

- 支持标准 GitHub URL 格式：`https://github.com/owner/repo`
- 自动去除 URL 末尾的 `/`
- 提取 owner 和 repo 名称用于后续 GitHub API 调用

#### 前端仓库 Hooks

```typescript
// src/hooks/useRepositories.ts
export function useRepositories() {
  return useQuery({
    queryKey: ["repositories"],
    queryFn: () => api.getRepositories(),
  });
}

export function useAddRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ url, name }: { url: string; name: string }) => api.addRepository(url, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
    },
  });
}

export function useDeleteRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoId: string) => api.deleteRepository(repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });
}

export function useScanRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoId: string) => api.scanRepository(repoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["cache-stats"] });
    },
  });
}
```

### 3. 精选仓库系统 (Featured Repositories)

精选仓库系统提供了一个远程配置的社区精选仓库列表，支持分类展示和多语言描述。

#### 配置文件结构

```yaml
# featured-repositories.yaml
version: "1.0"
last_updated: "2026-01-09"

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
      # ... 更多社区仓库
```

#### Featured Repositories 数据模型

```rust
// src-tauri/src/models/featured.rs
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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
```

#### 缓存机制

```rust
// src-tauri/src/commands/mod.rs:573-636
const FEATURED_REPOSITORIES_REMOTE_URL: &str =
    "https://raw.githubusercontent.com/brucevanfdm/agent-skills-guard/main/featured-repositories.yaml";
const DEFAULT_FEATURED_REPOSITORIES_YAML: &str = include_str!("../../../featured-repositories.yaml");

fn featured_repositories_cache_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;

    std::fs::create_dir_all(&app_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;

    Ok(app_dir.join("featured-repositories.yaml"))
}

#[tauri::command]
pub async fn get_featured_repositories(app: tauri::AppHandle) -> Result<FeaturedRepositoriesConfig, String> {
    // 1. 优先读取 app_data_dir 下的缓存文件（支持在线刷新后持久化）
    let cache_path = featured_repositories_cache_path(&app)?;
    if let Ok(cached_yaml) = std::fs::read_to_string(&cache_path) {
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

    // 2. 回退到编译期内置的默认 YAML（用于首次启动/离线/打包环境）
    serde_yaml::from_str::<FeaturedRepositoriesConfig>(DEFAULT_FEATURED_REPOSITORIES_YAML)
        .map_err(|e| format!("Failed to parse default featured repositories: {}", e))
}

#[tauri::command]
pub async fn refresh_featured_repositories(
    app: tauri::AppHandle,
) -> Result<FeaturedRepositoriesConfig, String> {
    let yaml_content = reqwest::Client::new()
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

    let cache_path = featured_repositories_cache_path(&app)?;
    let cache_dir = cache_path
        .parent()
        .ok_or_else(|| "Failed to get featured repositories cache directory".to_string())?;

    let mut tmp = tempfile::NamedTempFile::new_in(cache_dir)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    tmp.write_all(yaml_content.as_bytes())
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    tmp.flush()
        .map_err(|e| format!("Failed to flush temp file: {}", e))?;

    if cache_path.exists() {
        let _ = std::fs::remove_file(&cache_path);
    }
    tmp.persist(&cache_path)
        .map_err(|e| format!("Failed to persist featured repositories cache: {}", e))?;

    Ok(config)
}
```

---

## 二、仓库管理操作流程

### 1. 仓库添加工作流

```
用户输入URL → URL验证 → 创建仓库记录 → 自动触发扫描 → 更新技能列表
     ↓             ↓             ↓              ↓              ↓
   前端表单    后端验证     数据库插入    技能发现流程   UI刷新 + Toast
```

**详细步骤：**

1. 用户在仓库页面输入 GitHub URL 和名称
2. 前端自动从 URL 提取 owner 名称作为默认名称
3. 调用 `addRepository(url, name)` API
4. 后端验证 URL 格式并创建数据库记录
5. 返回仓库 ID
6. 立即触发 `scanRepository(repoId)` 扫描仓库
7. 扫描完成后更新前端技能列表
8. 显示 Toast 通知发现技能数量

### 2. 仓库扫描工作流

```
获取仓库信息 → 检查缓存 → 下载/使用缓存 → 解压缩 → 扫描目录 → 解析元数据 → 保存技能
     ↓            ↓           ↓            ↓          ↓            ↓            ↓
  数据库查询   本地检查    GitHub API    zip处理    WalkDir遍历  frontmatter  SQLite插入
```

#### GitHub API 扫描实现

```rust
// src-tauri/src/services/github.rs:62-108
pub async fn scan_repository(&self, repo: &Repository) -> Result<Vec<Skill>> {
    let (owner, repo_name) = Repository::from_github_url(&repo.url)?;
    let mut skills = Vec::new();

    // 获取仓库根目录内容
    let contents = self.fetch_directory_contents(&owner, &repo_name, "").await?;

    for item in contents {
        if item.content_type == "dir" {
            // 检查文件夹是否为 skill（包含 SKILL.md）
            if self.is_skill_directory(&owner, &repo_name, &item.path).await? {
                // 获取 skill 的元数据（name 和 description）
                let (name, description) = match self.fetch_skill_metadata(&owner, &repo_name, &item.path).await {
                    Ok(metadata) => metadata,
                    Err(e) => {
                        log::warn!("Failed to fetch metadata for {}: {}, using fallback", item.path, e);
                        (item.name.clone(), None)
                    }
                };

                // 如果路径为空（在根目录），设置为 "."
                let file_path = if item.path.trim().is_empty() {
                    ".".to_string()
                } else {
                    item.path.clone()
                };

                let mut skill = Skill::new(
                    name,
                    repo.url.clone(),
                    file_path,
                );
                skill.description = description;
                skills.push(skill);
            } else if repo.scan_subdirs {
                // 递归扫描子目录
                match self.scan_directory(&owner, &repo_name, &item.path, &repo.url).await {
                    Ok(mut sub_skills) => skills.append(&mut sub_skills),
                    Err(e) => log::warn!("Failed to scan subdirectory {}: {}", item.path, e),
                }
            }
        }
    }

    Ok(skills)
}
```

#### 本地缓存扫描实现

```rust
// src-tauri/src/services/github.rs:524-567
pub fn scan_cached_repository(
    &self,
    cache_path: &Path,
    repo_url: &str,
    scan_subdirs: bool,
) -> Result<Vec<Skill>> {
    use walkdir::WalkDir;

    let mut skills = Vec::new();
    let max_depth = if scan_subdirs { 10 } else { 2 };

    log::info!("开始扫描本地缓存: {:?}, scan_subdirs: {}", cache_path, scan_subdirs);

    // GitHub zipball 的根目录是 {owner}-{repo}-{commit}/
    let root_dir = self.find_repo_root(cache_path)?;

    log::info!("找到仓库根目录: {:?}", root_dir);

    // 遍历本地文件系统
    for entry in WalkDir::new(&root_dir)
        .max_depth(max_depth)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_type().is_dir() {
            // 检查是否包含 SKILL.md
            let skill_md_path = entry.path().join("SKILL.md");
            if skill_md_path.exists() {
                log::info!("发现 skill: {:?}", entry.path());

                match self.parse_skill_from_file(&skill_md_path, entry.path(), &root_dir, repo_url) {
                    Ok(skill) => skills.push(skill),
                    Err(e) => log::warn!("解析 skill 失败 {:?}: {}", entry.path(), e),
                }
            }
        }
    }

    log::info!("本地扫描完成，发现 {} 个 skills", skills.len());
    Ok(skills)
}
```

#### 仓库扫描命令

```rust
// src-tauri/src/commands/mod.rs:83-165
#[tauri::command]
pub async fn scan_repository(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<Vec<Skill>, String> {
    use chrono::Utc;

    // 获取仓库信息
    let repo = state.db.get_repository(&repo_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "仓库不存在".to_string())?;

    let (owner, repo_name) = Repository::from_github_url(&repo.url)
        .map_err(|e| e.to_string())?;

    // 确定缓存基础目录
    let cache_base_dir = dirs::cache_dir()
        .ok_or("无法获取缓存目录".to_string())?
        .join("agent-skills-guard")
        .join("repositories");

    let skills = if let Some(cache_path) = &repo.cache_path {
        // 使用缓存扫描（0 次 API 请求）
        log::info!("使用本地缓存扫描仓库: {}", repo.name);

        let cache_path_buf = std::path::PathBuf::from(cache_path);
        if cache_path_buf.exists() && cache_path_buf.is_dir() {
            state.github.scan_cached_repository(&cache_path_buf, &repo.url, repo.scan_subdirs)
                .map_err(|e| format!("扫描缓存失败: {}", e))?
        } else {
            // 缓存路径不存在，重新下载
            log::warn!("缓存路径不存在，重新下载: {:?}", cache_path_buf);
            let (extract_dir, commit_sha) = state.github
                .download_repository_archive(&owner, &repo_name, &cache_base_dir)
                .await
                .map_err(|e| format!("下载仓库压缩包失败: {}", e))?;

            // 更新数据库缓存信息
            state.db.update_repository_cache(
                &repo_id,
                &extract_dir.to_string_lossy(),
                Utc::now(),
                Some(&commit_sha),
            ).map_err(|e| e.to_string())?;

            state.github.scan_cached_repository(&extract_dir, &repo.url, repo.scan_subdirs)
                .map_err(|e| format!("扫描缓存失败: {}", e))?
        }
    } else {
        // 首次扫描：下载压缩包并缓存（1 次 API 请求）
        log::info!("首次扫描，下载仓库压缩包: {}", repo.name);

        let (extract_dir, commit_sha) = state.github
            .download_repository_archive(&owner, &repo_name, &cache_base_dir)
            .await
            .map_err(|e| format!("下载仓库压缩包失败: {}", e))?;

        // 更新数据库缓存信息
        state.db.update_repository_cache(
            &repo_id,
            &extract_dir.to_string_lossy(),
            Utc::now(),
            Some(&commit_sha),
        ).map_err(|e| e.to_string())?;

        // 扫描本地缓存
        state.github.scan_cached_repository(&extract_dir, &repo.url, repo.scan_subdirs)
            .map_err(|e| format!("扫描缓存失败: {}", e))?
    };

    // 保存到数据库
    for skill in &skills {
        if skill.file_path.trim().is_empty() {
            log::warn!("跳过无效技能记录：名称={}, 路径为空", skill.name);
            continue;
        }

        state.db.save_skill(skill)
            .map_err(|e| e.to_string())?;
    }

    Ok(skills)
}
```

### 3. 精选仓库集成工作流

```
应用启动 → 加载缓存配置 → 刷新远程配置 → 缓存到本地 → 分类展示 → 点击添加 → 自动扫描
     ↓            ↓               ↓              ↓            ↓            ↓          ↓
  useEffect   文件读取      GitHub下载     原子写入    React组件   onAdd回调   仓库扫描
```

#### 精选仓库前端组件

```typescript
// src/components/FeaturedRepositories.tsx
export function FeaturedRepositories({
  onAdd,
  isAdding,
  addingUrl,
  variant = "page",
  layout = "collapsible",
  showHeader = true,
  categoryIds,
  defaultExpandedCategories = ["official", "community"],
}: FeaturedRepositoriesProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(defaultExpandedCategories);

  // 获取精选仓库配置
  const { data: config, isLoading } = useQuery({
    queryKey: ["featured-repositories"],
    queryFn: api.getFeaturedRepositories,
    staleTime: 5 * 60 * 1000, // 5分钟缓存
    retry: false,
  });

  // 刷新精选仓库
  const refreshMutation = useMutation({
    mutationFn: api.refreshFeaturedRepositories,
    onSuccess: (data) => {
      queryClient.setQueryData(["featured-repositories"], data);
      appToast.success(t("repositories.featured.refreshed"));
    },
    onError: (error: any) => {
      appToast.error(t("repositories.featured.refreshFailed", { error: error?.message || String(error) }));
    },
  });

  // 检查仓库是否已添加
  const { data: existingRepos } = useQuery({
    queryKey: ["repositories"],
    queryFn: api.getRepositories,
  });

  const isAdded = (url: string) => {
    return existingRepos?.some((repo) => repo.url === url) || false;
  };

  const getLocalizedText = (text: { en: string; zh: string }) => {
    return i18n.language === "zh" ? text.zh : text.en;
  };

  // 分类过滤
  const categories = (() => {
    if (!categoryIds || categoryIds.length === 0) return config?.categories || [];
    const byId = new Map(config?.categories.map((c) => [c.id, c]) || []);
    return categoryIds.map((id) => byId.get(id)).filter(Boolean) as typeof config.categories;
  })();

  return (
    <div className="space-y-4">
      {categories.map((category) => (
        <div key={category.id} className="apple-card">
          {/* 分类头部 */}
          <div className="flex items-center justify-between p-4 border-b border-border/60">
            <h3 className="font-semibold">{getLocalizedText(category.name)}</h3>
            <span className="text-sm text-muted-foreground">
              {category.repositories.length} 个仓库
            </span>
          </div>

          {/* 仓库列表 */}
          <div className="divide-y divide-border/60">
            {category.repositories.map((repo) => (
              <div key={repo.url} className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium">{repo.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {getLocalizedText(repo.description)}
                  </p>
                  <div className="flex gap-2 mt-2">
                    {repo.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs bg-muted rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => onAdd(repo.url, repo.name)}
                  disabled={isAdding || isAdded(repo.url)}
                  className="apple-button-primary"
                >
                  {isAdded(repo.url) ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t("repositories.added")}
                    </>
                  ) : isAdding && addingUrl === repo.url ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {t("repositories.adding")}
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      {t("repositories.add")}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 4. 自动扫描未扫描仓库

应用首次启动时自动扫描所有未扫描的仓库，确保用户能立即看到技能列表。

#### 自动扫描触发机制

```typescript
// src/App.tsx:63-77
// 首次启动时自动扫描未扫描的仓库
useEffect(() => {
  const autoScanRepositories = async () => {
    try {
      const scannedRepos = await api.autoScanUnscannedRepositories();
      if (scannedRepos.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["skills"] });
        queryClient.invalidateQueries({ queryKey: ["repositories"] });
      }
    } catch (error) {
      console.debug("自动扫描仓库失败:", error);
    }
  };

  // 延迟 1 秒执行，避免与应用初始化冲突
  const timer = setTimeout(autoScanRepositories, 1000);
  return () => clearTimeout(timer);
}, [queryClient]);
```

#### 后端实现

```rust
// src-tauri/src/commands/mod.rs:741-775
#[tauri::command]
pub async fn auto_scan_unscanned_repositories(
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    // 获取所有未扫描的仓库
    let unscanned_repos = state.db.get_unscanned_repositories()
        .map_err(|e| e.to_string())?;

    if unscanned_repos.is_empty() {
        log::info!("没有需要自动扫描的仓库");
        return Ok(vec![]);
    }

    log::info!("发现 {} 个未扫描的仓库，开始自动扫描...", unscanned_repos.len());

    let mut scanned_repos = Vec::new();

    // 逐个扫描仓库
    for repo_id in unscanned_repos {
        log::info!("自动扫描仓库: {}", repo_id);

        match scan_repository(state.clone(), repo_id.clone()).await {
            Ok(skills) => {
                log::info!("仓库 {} 扫描成功，发现 {} 个技能", repo_id, skills.len());
                scanned_repos.push(repo_id);
            }
            Err(e) => {
                log::warn!("仓库 {} 扫描失败: {}", repo_id, e);
                // 继续扫描下一个仓库，不中断整个流程
            }
        }
    }

    log::info!("自动扫描完成，成功扫描 {} 个仓库", scanned_repos.len());
    Ok(scanned_repos)
}
```

#### 未扫描仓库查询

```rust
// src-tauri/src/services/database.rs:524-536
pub fn get_unscanned_repositories(&self) -> Result<Vec<String>> {
    let conn = self.conn.lock().unwrap();
    let mut stmt = conn.prepare(
        "SELECT id FROM repositories WHERE last_scanned IS NULL AND enabled = 1"
    )?;

    let repo_ids = stmt.query_map([], |row| {
        Ok(row.get(0)?)
    })?
    .collect::<std::result::Result<Vec<String>, _>>()?;

    Ok(repo_ids)
}
```

### 5. 仓库删除工作流

```rust
// src-tauri/src/commands/mod.rs:41-79
#[tauri::command]
pub async fn delete_repository(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<(), String> {
    // 1. 获取仓库信息
    let repo = state.db.get_repository(&repo_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "仓库不存在".to_string())?;

    let repository_url = repo.url.clone();
    let cache_path = repo.cache_path.clone();

    // 2. 删除未安装的技能（使用事务）
    let deleted_skills_count = state.db.delete_uninstalled_skills_by_repository_url(&repository_url)
        .map_err(|e| e.to_string())?;

    log::info!("删除仓库 {} 的 {} 个未安装技能", repo.name, deleted_skills_count);

    // 3. 清理缓存目录（失败不中断）
    if let Some(cache_path_str) = cache_path {
        let cache_path_buf = std::path::PathBuf::from(&cache_path_str);
        if cache_path_buf.exists() {
            match std::fs::remove_dir_all(&cache_path_buf) {
                Ok(_) => log::info!("成功删除缓存目录: {:?}", cache_path_buf),
                Err(e) => log::warn!("删除缓存目录失败，但不影响仓库删除: {:?}, 错误: {}", cache_path_buf, e),
            }
        } else {
            log::info!("缓存目录不存在，跳过清理: {:?}", cache_path_buf);
        }
    }

    // 4. 删除仓库记录
    state.db.delete_repository(&repo_id)
        .map_err(|e| e.to_string())?;

    log::info!("成功删除仓库: {}", repo.name);
    Ok(())
}
```

---

## 三、技能下载与安装流程

### 1. GitHub 压缩包下载

```rust
// src-tauri/src/services/github.rs:372-453
pub async fn download_repository_archive(
    &self,
    owner: &str,
    repo: &str,
    cache_base_dir: &Path,
) -> Result<(PathBuf, String)> {
    // 1. 确保缓存目录存在
    std::fs::create_dir_all(cache_base_dir)
        .context("无法创建缓存目录")?;

    // 2. 构建缓存子目录（{owner}-{repo}）
    let repo_cache_dir = cache_base_dir.join(format!("{}-{}", owner, repo));
    std::fs::create_dir_all(&repo_cache_dir)
        .context("无法创建仓库缓存子目录")?;

    // 3. 尝试从 API 获取默认分支
    let default_branch = match self.fetch_default_branch(owner, repo).await {
        Ok(branch) => branch,
        Err(e) => {
            log::warn!("获取默认分支失败，使用 'main': {}", e);
            "main".to_string()
        }
    };

    // 4. 下载 zipball（优先 main/master 分支）
    let branches = ["main", "master"];
    let mut response = None;
    let mut last_error = None;

    for branch in branches.iter() {
        match self.client
            .get(&format!(
                "https://api.github.com/repos/{}/{}/zipball/{}",
                owner, repo, branch
            ))
            .send()
            .await
        {
            Ok(resp) => {
                if resp.status() == 200 {
                    response = Some(resp);
                    log::info!("成功从分支 {} 下载仓库压缩包", branch);
                    break;
                } else if resp.status() == reqwest::StatusCode::NOT_FOUND {
                    log::info!("分支 {} 不存在，尝试下一个分支", branch);
                    last_error = Some(anyhow::anyhow!("分支 {} 不存在", branch));
                    continue;
                } else {
                    last_error = Some(anyhow::anyhow!(
                        "下载失败，HTTP 状态码: {}",
                        resp.status()
                    ));
                    continue;
                }
            }
            Err(e) => {
                log::warn!("请求分支 {} 时发生错误: {}", branch, e);
                last_error = Some(anyhow::anyhow!("请求失败: {}", e));
                continue;
            }
        }
    }

    let response = response.ok_or_else(|| {
        last_error.unwrap_or_else(|| anyhow::anyhow!("所有分支均下载失败"))
    })?;

    // 5. 保存压缩包到本地
    let archive_path = repo_cache_dir.join("archive.zip");
    let bytes = response.bytes().await
        .context("读取压缩包内容失败")?;

    let mut file = File::create(&archive_path)
        .context("无法创建压缩包文件")?;
    file.write_all(&bytes)
        .context("写入压缩包失败")?;

    log::info!("压缩包已保存: {:?}, 大小: {} bytes", archive_path, bytes.len());

    // 6. 解压缩
    let extract_dir = repo_cache_dir.join("extracted");
    self.extract_zip(&archive_path, &extract_dir)
        .context("解压缩失败")?;

    log::info!("解压完成: {:?}", extract_dir);

    // 7. 提取 commit SHA
    let commit_sha = self.extract_commit_sha_from_cache(&extract_dir)
        .context("无法提取 commit SHA")?;

    log::info!("提取到 commit SHA: {}", commit_sha);

    Ok((extract_dir, commit_sha))
}
```

### 2. ZIP 解压实现

```rust
// src-tauri/src/services/github.rs:456-494
fn extract_zip(&self, archive_path: &Path, extract_dir: &Path) -> Result<()> {
    let file = File::open(archive_path)
        .context("无法打开压缩包")?;

    let mut archive = ZipArchive::new(file)
        .context("无法读取 ZIP 文件")?;

    log::info!("正在解压 {} 个文件...", archive.len());

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)
            .context(format!("无法读取 ZIP 条目 {}", i))?;

        // GitHub 的 zipball 会在根目录包含一个 {owner}-{repo}-{commit}/ 的文件夹
        let outpath = match file.enclosed_name() {
            Some(path) => extract_dir.join(path),
            None => continue,
        };

        if file.is_dir() {
            fs::create_dir_all(&outpath)
                .context(format!("无法创建目录: {:?}", outpath))?;
        } else {
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent)
                    .context(format!("无法创建父目录: {:?}", parent))?;
            }

            let mut outfile = File::create(&outpath)
                .context(format!("无法创建文件: {:?}", outpath))?;

            std::io::copy(&mut file, &mut outfile)
                .context(format!("无法写入文件: {:?}", outpath))?;
        }
    }

    Ok(())
}
```

### 3. 两阶段安装流程

系统采用两阶段安装流程，先准备（下载并扫描），后确认（复制到目标路径并标记为已安装）。

#### 第一阶段：准备安装

```rust
// src-tauri/src/services/skill_manager.rs:285-410
pub async fn prepare_skill_installation(&self, skill_id: &str, locale: &str) -> Result<crate::models::security::SecurityReport> {
    log::info!("Preparing installation for skill: {}", skill_id);

    // 从数据库获取 skill
    let mut skill = self.db.get_skills()?
        .into_iter()
        .find(|s| s.id == skill_id)
        .context("未找到该技能")?;

    // 下载并分析 SKILL.md
    let (skill_md_content, report) = self.download_and_analyze(&mut skill).await?;

    // 获取仓库记录
    let repositories = self.db.get_repositories()?;
    let repo = repositories.iter()
        .find(|r| r.url == skill.repository_url)
        .context("未找到对应的仓库")?;

    // 确保缓存存在
    if repo.cache_path.is_none() {
        let (owner, repo_name) = crate::models::Repository::from_github_url(&skill.repository_url)?;
        let cache_base_dir = dirs::cache_dir()
            .context("无法获取缓存目录")?
            .join("agent-skills-guard")
            .join("repositories");

        let (extract_dir, commit_sha) = self.github
            .download_repository_archive(&owner, &repo_name, &cache_base_dir)
            .await
            .context("下载仓库压缩包失败")?;

        self.db.update_repository_cache(
            &repo.id,
            &extract_dir.to_string_lossy(),
            Utc::now(),
            Some(&commit_sha),
        )?;
    }

    // 在仓库缓存中定位技能目录
    let cache_skill_dir = if let Some(cache_path) = &repo.cache_path {
        self.locate_skill_in_cache(std::path::PathBuf::from(cache_path).join("extracted").as_path(), &skill.file_path)?
    } else {
        anyhow::bail!("仓库缓存不存在");
    };

    // 创建临时安装目录
    let temp_dir = tempfile::tempdir()
        .context("无法创建临时目录")?;

    // 将 skill 目录复制到临时目录
    let temp_skill_dir = temp_dir.path().join(
        cache_skill_dir.file_name()
            .context("无法获取技能目录名")?
    );

    std::fs::create_dir_all(&temp_skill_dir)
        .context("无法创建临时技能目录")?;

    // 递归复制
    let mut files_copied = 0;
    self.copy_dir_recursive(&cache_skill_dir, &temp_skill_dir, &mut files_copied)
        .context("从缓存复制文件失败")?;

    // 更新 skill 的 local_path 为临时目录
    skill.local_path = Some(temp_skill_dir.to_string_lossy().to_string());
    skill.security_score = Some(report.score);
    skill.security_level = Some(report.level.as_str().to_string());
    skill.security_issues = Some(
        report.issues.iter()
            .map(|i| format!("{:?}: {}", i.severity, i.description))
            .collect()
    );
    skill.scanned_at = Some(Utc::now());

    self.db.save_skill(&skill)
        .context("无法保存 skill 信息")?;

    log::info!("Skill installation prepared: {}, scanned {} files", skill.name, report.scanned_files.len());
    Ok(report)
}
```

#### 第二阶段：确认安装

```rust
// src-tauri/src/services/skill_manager.rs:463-541
pub fn confirm_skill_installation(&self, skill_id: &str, install_path: Option<String>) -> Result<()> {
    log::info!("Confirming installation for skill: {}", skill_id);

    let mut skill = self.db.get_skills()?
        .into_iter()
        .find(|s| s.id == skill_id)
        .context("未找到该技能")?;

    // 获取缓存中的技能路径（prepare 阶段保存的）
    let cache_path = skill.local_path.as_ref()
        .context("技能尚未准备，请先调用 prepare_skill_installation")?;
    let cache_dir = PathBuf::from(cache_path);

    // 获取仓库的 cached_commit_sha
    let repositories = self.db.get_repositories()?;
    let repo = repositories.iter()
        .find(|r| r.url == skill.repository_url);
    let commit_sha = repo.and_then(|r| r.cached_commit_sha.clone());

    // 确定最终安装路径
    let install_base_dir = if let Some(user_path) = install_path {
        PathBuf::from(user_path)
    } else {
        self.skills_dir.clone()
    };

    // 获取技能目录名
    let skill_dir_name = cache_dir.file_name()
        .context("无效的技能目录名")?;
    let final_install_dir = install_base_dir.join(skill_dir_name);

    // 确保目标基础目录存在
    std::fs::create_dir_all(&install_base_dir)
        .context("无法创建目标目录")?;

    // 如果目标目录已存在，先删除
    if final_install_dir.exists() {
        std::fs::remove_dir_all(&final_install_dir)
            .context("无法删除已存在的目标目录")?;
    }

    // 创建目标目录
    std::fs::create_dir_all(&final_install_dir)
        .context("无法创建最终安装目录")?;

    // 从缓存复制到目标路径
    log::info!("Copying skill from cache {:?} to {:?}", cache_dir, final_install_dir);
    let mut files_copied = 0;
    self.copy_dir_recursive(&cache_dir, &final_install_dir, &mut files_copied)?;

    log::info!("Copied {} files from cache to install directory", files_copied);

    // 更新安装路径
    let install_path_str = final_install_dir.to_string_lossy().to_string();

    // 更新 local_path（向后兼容）
    skill.local_path = Some(install_path_str.clone());

    // 更新 local_paths 数组（支持多路径安装）
    let mut paths = skill.local_paths.clone().unwrap_or_default();
    if !paths.contains(&install_path_str) {
        paths.push(install_path_str);
    }
    skill.local_paths = Some(paths);

    // 标记为已安装
    skill.installed = true;
    skill.installed_at = Some(Utc::now());
    skill.installed_commit_sha = commit_sha;

    self.db.save_skill(&skill)?;

    log::info!("Skill installation confirmed: {}", skill.name);
    Ok(())
}
```

### 4. 取消安装

```rust
// src-tauri/src/services/skill_manager.rs:544-569
pub fn cancel_skill_installation(&self, skill_id: &str) -> Result<()> {
    log::info!("Canceling installation for skill: {}", skill_id);

    let skill = self.db.get_skills()?
        .into_iter()
        .find(|s| s.id == skill_id)
        .context("未找到该技能")?;

    // 注意：不删除缓存中的文件，因为缓存是共享的仓库缓存
    // 只清除数据库中的准备阶段信息

    // 清除数据库中的安全信息和本地路径
    let mut skill = skill;
    skill.local_path = None;
    skill.security_score = None;
    skill.security_level = None;
    skill.security_issues = None;
    skill.scanned_at = None;

    self.db.save_skill(&skill)?;

    log::info!("Skill installation canceled: {}", skill.name);
    Ok(())
}
```

---

## 四、技能生命周期管理

### 1. 技能状态跟踪

```rust
// src-tauri/src/models/skill.rs
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub repository_url: String,
    pub repository_owner: Option<String>,
    pub file_path: String,
    pub version: Option<String>,
    pub author: Option<String>,
    pub installed: bool,
    pub installed_at: Option<DateTime<Utc>>,
    pub local_path: Option<String>,                    // 向后兼容：最新安装路径
    pub local_paths: Option<Vec<String>>,              // 多路径安装支持
    pub checksum: Option<String>,
    pub security_score: Option<i32>,
    pub security_issues: Option<Vec<String>>,
    pub security_level: Option<String>,
    pub scanned_at: Option<DateTime<Utc>>,
    pub installed_commit_sha: Option<String>,          // 用于更新检测
}

impl Skill {
    pub fn new(name: String, repository_url: String, file_path: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name,
            description: None,
            repository_url,
            repository_owner: None,
            file_path,
            version: None,
            author: None,
            installed: false,
            installed_at: None,
            local_path: None,
            local_paths: None,
            checksum: None,
            security_score: None,
            security_issues: None,
            security_level: None,
            scanned_at: None,
            installed_commit_sha: None,
        }
    }
}
```

### 2. 更新检测与版本比较

```rust
// src-tauri/src/services/github.rs
pub async fn check_skill_update(
    &self,
    owner: &str,
    repo: &str,
    file_path: &str,
    current_sha: Option<&str>,
) -> Result<Option<String>> {
    // 获取仓库的最新 commit
    let url = format!(
        "{}/repos/{}/{}/commits?path={}&per_page=1",
        self.api_base, owner, repo, file_path
    );

    let response = self.client
        .get(&url)
        .send()
        .await
        .context("获取 commit 列表失败")?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        // 路径不存在，可能技能已被移除
        return Ok(None);
    }

    if !response.status().is_success() {
        return Err(anyhow::anyhow!("GitHub API 返回错误: {}", response.status()));
    }

    let commits: Vec<GitHubCommit> = response.json().await?;

    if commits.is_empty() {
        return Ok(None);
    }

    let latest_sha = &commits[0].sha;

    // 比较 SHA
    if let Some(current) = current_sha {
        // 使用短 SHA 比较（7 位）
        let current_short = &current[..7.min(current.len())];
        let latest_short = &latest_sha[..7.min(latest_sha.len())];

        if current_short == latest_short {
            return Ok(None); // 无更新
        }
    }

    Ok(Some(latest_sha.clone()))
}
```

#### 更新检查命令

```rust
// src-tauri/src/commands/mod.rs:650-702
#[tauri::command]
pub async fn check_skills_updates(
    state: State<'_, AppState>,
) -> Result<Vec<(String, String)>, String> {
    let manager = state.skill_manager.lock().await;
    let installed_skills = manager.get_installed_skills()
        .map_err(|e| e.to_string())?;

    let mut updates = Vec::new();

    for skill in installed_skills {
        // 跳过本地技能
        if skill.repository_url == "local" {
            continue;
        }

        // 解析仓库 URL
        let (owner, repo) = match Repository::from_github_url(&skill.repository_url) {
            Ok(result) => result,
            Err(e) => {
                log::warn!("无法解析仓库 URL {}: {}", skill.repository_url, e);
                continue;
            }
        };

        // 检查更新
        match state.github
            .check_skill_update(
                &owner,
                &repo,
                &skill.file_path,
                skill.installed_commit_sha.as_deref(),
            )
            .await
        {
            Ok(Some(latest_sha)) => {
                log::info!("技能 {} 有更新可用: {}", skill.name, latest_sha);
                updates.push((skill.id.clone(), latest_sha));
            }
            Ok(None) => {
                log::debug!("技能 {} 无更新", skill.name);
            }
            Err(e) => {
                log::warn!("检查技能 {} 更新时出错: {}", skill.name, e);
            }
        }
    }

    log::info!("检查更新完成，发现 {} 个技能有更新", updates.len());
    Ok(updates)
}
```

### 3. 技能卸载

```rust
// src-tauri/src/services/skill_manager.rs:571-625
pub fn uninstall_skill(&self, skill_id: &str) -> Result<()> {
    // 从数据库获取 skill
    let mut skill = self.db.get_skills()?
        .into_iter()
        .find(|s| s.id == skill_id)
        .context("未找到该技能")?;

    // 删除所有安装路径的文件
    if let Some(local_paths) = &skill.local_paths {
        for local_path in local_paths {
            let path = PathBuf::from(local_path);
            if path.exists() {
                if path.is_dir() {
                    if let Err(e) = std::fs::remove_dir_all(&path) {
                        log::warn!("删除技能目录失败: {:?}, 错误: {}", path, e);
                    }
                } else {
                    if let Err(e) = std::fs::remove_file(&path) {
                        log::warn!("删除技能文件失败: {:?}, 错误: {}", path, e);
                    }
                }
            }
        }
    }

    // 向后兼容：如果 local_paths 为空，尝试删除 local_path
    if skill.local_paths.is_none() || skill.local_paths.as_ref().unwrap().is_empty() {
        if let Some(local_path) = &skill.local_path {
            let path = PathBuf::from(local_path);
            if path.exists() {
                std::fs::remove_dir_all(&path)?;
            }
        }
    }

    // 清空安装路径
    skill.local_path = None;
    skill.local_paths = None;

    // 标记为未安装
    skill.installed = false;
    skill.installed_at = None;
    skill.installed_commit_sha = None;

    // 清空安全信息
    skill.security_score = None;
    skill.security_level = None;
    skill.security_issues = None;
    skill.scanned_at = None;

    self.db.save_skill(&skill)?;

    log::info!("Skill uninstalled successfully: {}", skill.name);
    Ok(())
}

/// 卸载特定路径的技能
pub fn uninstall_skill_path(&self, skill_id: &str, path: &str) -> Result<()> {
    let mut skill = self.db.get_skills()?
        .into_iter()
        .find(|s| s.id == skill_id)
        .context("未找到该技能")?;

    // 删除指定路径
    let path_buf = PathBuf::from(path);
    if path_buf.exists() {
        if path_buf.is_dir() {
            std::fs::remove_dir_all(&path_buf)?;
        } else {
            std::fs::remove_file(&path_buf)?;
        }
    }

    // 从 local_paths 中移除该路径
    if let Some(local_paths) = &mut skill.local_paths {
        local_paths.retain(|p| p != path);
        skill.local_paths = Some(local_paths.clone());
    }

    // 如果没有剩余路径，标记为未安装
    if skill.local_paths.as_ref().map(|v| v.is_empty()).unwrap_or(true) {
        skill.installed = false;
        skill.installed_at = None;
        skill.installed_commit_sha = None;
    }

    self.db.save_skill(&skill)?;
    log::info!("Skill path uninstalled: {} from {}", skill.name, path);
    Ok(())
}
```

### 4. 本地技能发现

```rust
// src-tauri/src/services/skill_manager.rs
pub fn scan_local_skills(&self) -> Result<Vec<Skill>> {
    use walkdir::WalkDir;

    let mut discovered_skills = Vec::new();

    // 扫描默认技能目录
    if !self.skills_dir.exists() {
        log::info!("技能目录不存在，跳过本地扫描: {:?}", self.skills_dir);
        return Ok(discovered_skills);
    }

    log::info!("开始扫描本地技能目录: {:?}", self.skills_dir);

    // 使用 WalkDir 递归扫描
    for entry in WalkDir::new(&self.skills_dir)
        .max_depth(4)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        // 只检查 SKILL.md 文件
        if entry.file_name() != "SKILL.md" {
            continue;
        }

        let skill_md_path = entry.path();

        // 解析 SKILL.md
        match self.parse_local_skill(skill_md_path, &self.skills_dir) {
            Ok(Some(skill)) => {
                log::info!("发现本地技能: {} at {:?}", skill.name, skill_md_path);
                discovered_skills.push(skill);
            }
            Ok(None) => {
                log::debug!("跳过无效的 SKILL.md: {:?}", skill_md_path);
            }
            Err(e) => {
                log::warn!("解析 SKILL.md 失败: {:?}, 错误: {}", skill_md_path, e);
            }
        }
    }

    log::info!("本地扫描完成，发现 {} 个技能", discovered_skills.len());

    // 保存到数据库
    for skill in &discovered_skills {
        self.db.save_skill(skill)?;
    }

    Ok(discovered_skills)
}

fn parse_local_skill(&self, skill_md_path: &Path, skills_dir: &Path) -> Result<Option<Skill>> {
    let content = std::fs::read_to_string(skill_md_path)?;

    // 解析 frontmatter
    let (name, description) = match self.parse_frontmatter(&content) {
        Ok(metadata) => metadata,
        Err(_) => {
            // 如果 frontmatter 解析失败，使用文件名
            let file_stem = skill_md_path
                .parent()
                .and_then(|p| p.file_name())
                .and_then(|n| n.to_str())
                .unwrap_or("Unknown");
            (file_stem.to_string(), None)
        }
    };

    // 计算相对路径
    let relative_path = skill_md_path
        .parent()
        .and_then(|p| p.strip_prefix(skills_dir).ok())
        .and_then(|p| {
            if p.as_os_str().is_empty() {
                Some(".".to_string())
            } else {
                Some(p.to_string_lossy().to_string())
            }
        })
        .unwrap_or_else(|| ".".to_string());

    // 读取整个目录计算校验和
    let checksum = if let Some(skill_dir) = skill_md_path.parent() {
        Some(self.calculate_directory_checksum(skill_dir)?)
    } else {
        None
    };

    let mut skill = Skill::new(
        name,
        "local".to_string(),
        relative_path,
    );
    skill.description = description;
    skill.checksum = checksum;
    skill.local_path = Some(skill_md_path.parent().unwrap().to_string_lossy().to_string());
    skill.local_paths = Some(vec![skill_md_path.parent().unwrap().to_string_lossy().to_string()]);
    skill.installed = true;
    skill.installed_at = Some(Utc::now());

    Ok(Some(skill))
}
```

---

## 五、安全扫描机制

### 1. 安全扫描引擎概述

Agent Skills Guard 内置了业界领先的安全扫描引擎，包含 60+ 条规则和 10 个硬触发规则。

#### 扫描引擎架构

```rust
// src-tauri/src/security/scanner.rs
pub struct SecurityScanner {
    rules: Vec<SecurityRule>,
    hard_triggers: Vec<HardTriggerRule>,
}

impl SecurityScanner {
    pub fn new() -> Self {
        Self {
            rules: load_security_rules(),
            hard_triggers: load_hard_trigger_rules(),
        }
    }

    /// 扫描文件内容
    pub fn scan_file(&self, content: &str, file_name: &str, locale: &str) -> Result<SecurityReport> {
        let mut report = SecurityReport::default();

        // 检查硬触发规则
        for rule in &self.hard_triggers {
            if rule.matches(content) {
                report.blocked = true;
                report.hard_trigger_issues.push(rule.description.clone());
                break;
            }
        }

        // 检查普通规则
        for rule in &self.rules {
            if rule.matches(content) {
                report.issues.push(rule.to_issue());
                report.score -= rule.weight;
            }
        }

        report.level = report.get_level();
        Ok(report)
    }

    /// 扫描目录
    pub fn scan_directory(&self, dir_path: &str, skill_id: &str, locale: &str) -> Result<SecurityReport> {
        // 遍历目录中的所有文件
        for entry in WalkDir::new(dir_path)
            .max_depth(20)
            .max_files(2000)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            if entry.file_type().is_file() {
                // 跳过二进制文件
                if self.is_binary_file(entry.path()) {
                    continue;
                }

                // 读取并扫描文件
                if let Ok(content) = std::fs::read_to_string(entry.path()) {
                    let relative_path = entry.path()
                        .strip_prefix(dir_path)
                        .unwrap_or(entry.path())
                        .to_string_lossy()
                        .to_string();

                    let file_report = self.scan_file(&content, &relative_path, locale)?;

                    // 合并报告
                    report.scanned_files.push(relative_path);
                    report.score -= file_report.score;
                    report.issues.extend(file_report.issues);
                    report.blocked = report.blocked || file_report.blocked;
                    report.hard_trigger_issues.extend(file_report.hard_trigger_issues);
                }
            }
        }

        Ok(report)
    }
}
```

#### 扫描报告结构

```rust
// src-tauri/src/models/security.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityReport {
    pub score: i32,                           // 安全评分 (0-100)
    pub level: String,                        // 等级: Safe, Low, Medium, High, Critical
    pub blocked: bool,                        // 是否被硬触发阻止
    pub issues: Vec<SecurityIssue>,           // 发现的问题列表
    pub hard_trigger_issues: Vec<String>,     // 硬触发问题
    pub scanned_files: Vec<String>,           // 扫描的文件列表
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityIssue {
    pub severity: Severity,
    pub category: String,
    pub description: String,
    pub file_path: Option<String>,
    pub confidence: Confidence,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Severity {
    Critical,
    High,
    Medium,
    Low,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum Confidence {
    High,
    Medium,
    Low,
}
```

### 2. 安全规则分类

| 类别             | 描述                   | 示例                           |
| ---------------- | ---------------------- | ------------------------------ |
| **破坏性操作**   | 删除系统文件、磁盘擦除 | `rm -rf /`, `mkfs`             |
| **远程代码执行** | 管道执行、反序列化攻击 | `curl \| bash`, `pickle.loads` |
| **命令注入**     | 动态命令拼接           | `eval()`, `os.system()`        |
| **网络外传**     | 数据外传到远程服务器   | `curl -d @file`                |
| **权限提升**     | 提权操作               | `sudo`, `chmod 777`            |
| **持久化**       | 后门植入               | `crontab`, SSH 密钥注入        |
| **敏感信息泄露** | 硬编码密钥、Token      | AWS Key, GitHub Token          |
| **敏感文件访问** | 访问系统敏感文件       | `~/.ssh/`, `/etc/passwd`       |

### 3. 评分系统

```rust
impl SecurityReport {
    pub fn get_level(&self) -> String {
        match self.score {
            90..=100 => "Safe".to_string(),
            70..=89 => "Low".to_string(),
            50..=69 => "Medium".to_string(),
            30..=49 => "High".to_string(),
            _ => "Critical".to_string(),
        }
    }
}
```

| 分数范围 | 等级        | 建议                   |
| -------- | ----------- | ---------------------- |
| 90-100   | ✅ 安全     | 可放心使用             |
| 70-89    | ⚠️ 低风险   | 轻微风险，建议查看详情 |
| 50-69    | ⚠️ 中等风险 | 有一定风险，谨慎使用   |
| 30-49    | 🔴 高风险   | 风险较高，不建议安装   |
| 0-29     | 🚨 严重风险 | 严重威胁，禁止安装     |

---

## 六、缓存管理策略

### 1. 仓库缓存架构

```
~/.cache/agent-skills-guard/repositories/
├── {owner}-{repo}/
│   ├── archive.zip              # 原始压缩包 (~30MB)
│   └── extracted/               # 解压后的文件
│       └── {owner}-{repo}-{commit}/
│           ├── SKILL.md         # 技能描述文件
│           ├── src/             # 技能源代码
│           └── README.md        # 项目说明
```

### 2. 缓存生命周期

| 阶段     | 描述               | 操作                                        |
| -------- | ------------------ | ------------------------------------------- |
| **创建** | 首次扫描仓库时     | 下载 GitHub zipball → 解压 → 保存到缓存目录 |
| **使用** | 后续扫描时         | 直接扫描本地缓存文件，无需 API 调用         |
| **更新** | 仓库有新 commit 时 | 检测 commit SHA 变化，自动重新下载          |
| **清理** | 用户触发清理时     | 删除单个仓库或全部缓存目录                  |

### 3. 缓存统计信息

```rust
// src-tauri/src/commands/mod.rs:417-448
fn dir_size(path: &std::path::Path) -> Result<u64, std::io::Error> {
    use walkdir::WalkDir;

    let mut size = 0;

    for entry in WalkDir::new(path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            size += entry.metadata()?.len();
        }
    }

    Ok(size)
}

#[tauri::command]
pub async fn get_cache_stats(
    state: State<'_, AppState>,
) -> Result<CacheStats, String> {
    let repos = state.db.get_repositories()
        .map_err(|e| e.to_string())?;

    let mut total_cached = 0;
    let mut total_size: u64 = 0;

    for repo in &repos {
        if let Some(cache_path) = &repo.cache_path {
            if let Some(parent) = std::path::PathBuf::from(cache_path).parent() {
                if parent.exists() {
                    total_cached += 1;

                    // 计算目录大小
                    if let Ok(size) = dir_size(parent) {
                        total_size += size;
                    }
                }
            }
        }
    }

    Ok(CacheStats {
        total_repositories: repos.len(),
        cached_repositories: total_cached,
        total_size_bytes: total_size,
    })
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheStats {
    pub total_repositories: usize,
    pub cached_repositories: usize,
    pub total_size_bytes: u64,
}
```

### 4. 缓存清理命令

```rust
// src-tauri/src/commands/mod.rs:279-320
#[tauri::command]
pub async fn clear_repository_cache(
    state: State<'_, AppState>,
    repo_id: String,
) -> Result<(), String> {
    let repo = state.db.get_repository(&repo_id)
        .map_err(|e| e.to_string())?
        .ok_or("仓库不存在")?;

    if let Some(cache_path) = &repo.cache_path {
        let cache_path_buf = std::path::PathBuf::from(cache_path);

        // 验证缓存路径是否在预期的缓存目录中
        let expected_cache_base = dirs::cache_dir()
            .ok_or("无法获取缓存目录".to_string())?
            .join("agent-skills-guard")
            .join("repositories");

        // 删除整个仓库缓存目录
        if let Some(parent) = cache_path_buf.parent() {
            if !parent.starts_with(&expected_cache_base) {
                return Err("缓存路径无效".to_string());
            }

            state.db.clear_repository_cache_metadata(&repo_id)
                .map_err(|e| e.to_string())?;

            if parent.exists() {
                if let Err(e) = std::fs::remove_dir_all(parent) {
                    log::warn!("删除缓存目录失败，但数据库已清理: {:?}，错误: {}", parent, e);
                } else {
                    log::info!("已删除缓存目录: {:?}", parent);
                }
            }
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn clear_all_repository_caches(
    state: State<'_, AppState>,
) -> Result<ClearAllCachesResult, String> {
    let repos = state.db.get_repositories()
        .map_err(|e| e.to_string())?;

    let cache_base_dir = dirs::cache_dir()
        .ok_or("无法获取缓存目录".to_string())?
        .join("agent-skills-guard")
        .join("repositories");

    let mut cleared_count = 0;
    let mut failed_count = 0;
    let mut total_size_freed: u64 = 0;

    for repo in &repos {
        if let Some(cache_path) = &repo.cache_path {
            let cache_path_buf = std::path::PathBuf::from(cache_path);

            if let Some(parent) = cache_path_buf.parent() {
                if !parent.starts_with(&cache_base_dir) {
                    log::warn!("跳过无效的缓存路径: {:?}", parent);
                    failed_count += 1;
                    continue;
                }

                if parent.exists() {
                    if let Ok(size) = dir_size(parent) {
                        total_size_freed += size;
                    }
                }

                if let Err(e) = state.db.clear_repository_cache_metadata(&repo.id) {
                    log::warn!("清除仓库 {} 的缓存元数据失败: {}", repo.name, e);
                    failed_count += 1;
                    continue;
                }

                if parent.exists() {
                    if let Err(e) = std::fs::remove_dir_all(parent) {
                        log::warn!("删除缓存目录失败: {:?}，错误: {}", parent, e);
                        failed_count += 1;
                    } else {
                        log::info!("已删除缓存目录: {:?}", parent);
                        cleared_count += 1;
                    }
                } else {
                    cleared_count += 1;
                }
            }
        }
    }

    log::info!("清除所有缓存完成: 成功 {}, 失败 {}, 释放 {} 字节",
        cleared_count, failed_count, total_size_freed);

    Ok(ClearAllCachesResult {
        total_repositories: repos.len(),
        cleared_count,
        failed_count,
        total_size_freed,
    })
}
```

---

## 七、数据库架构设计

### 1. 数据库表结构

```sql
-- 仓库表
CREATE TABLE repositories (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    scan_subdirs INTEGER NOT NULL DEFAULT 1,
    added_at TEXT NOT NULL,
    last_scanned TEXT,
    cache_path TEXT,
    cached_at TEXT,
    cached_commit_sha TEXT
);

-- 技能表
CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    repository_url TEXT NOT NULL,
    repository_owner TEXT,
    file_path TEXT NOT NULL,
    version TEXT,
    author TEXT,
    installed INTEGER NOT NULL DEFAULT 0,
    installed_at TEXT,
    local_path TEXT,
    local_paths TEXT,           -- JSON 数组
    checksum TEXT,
    security_score INTEGER,
    security_issues TEXT,       -- JSON 数组
    security_level TEXT,
    scanned_at TEXT,
    installed_commit_sha TEXT
);

-- 安装记录表
CREATE TABLE installations (
    skill_id TEXT PRIMARY KEY,
    installed_at TEXT NOT NULL,
    version TEXT NOT NULL,
    local_path TEXT NOT NULL,
    checksum TEXT NOT NULL,
    FOREIGN KEY(skill_id) REFERENCES skills(id)
);
```

### 2. 数据库访问层

```rust
// src-tauri/src/services/database.rs
pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let conn = Connection::open(db_path)
            .context("Failed to open database")?;

        let db = Self {
            conn: Mutex::new(conn),
        };

        db.initialize_schema()?;
        Ok(db)
    }

    fn initialize_schema(&self) -> Result<()> {
        let conn = self.conn.lock().unwrap();

        // 创建表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS repositories (...)",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS skills (...)",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS installations (...)",
            [],
        )?;

        // 执行迁移
        self.migrate_add_repository_owner()?;
        self.migrate_add_cache_fields()?;
        self.migrate_add_security_enhancement_fields()?;
        self.migrate_add_local_paths()?;
        self.migrate_add_installed_commit_sha()?;

        // 初始化默认仓库
        let _ = self.initialize_default_repositories()?;

        Ok(())
    }
}
```

---

## 八、前端交互设计

### 1. 仓库页面 (RepositoriesPage)

```typescript
// src/components/RepositoriesPage.tsx
export function RepositoriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: repositories, isLoading } = useRepositories();
  const addMutation = useAddRepository();
  const deleteMutation = useDeleteRepository();
  const scanMutation = useScanRepository();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState("");
  const [newRepoName, setNewRepoName] = useState("");

  // 缓存统计
  const { data: cacheStats } = useQuery({
    queryKey: ["cache-stats"],
    queryFn: api.getCacheStats,
    refetchInterval: 30000,
  });

  // 刷新缓存
  const refreshCacheMutation = useMutation({
    mutationFn: api.refreshRepositoryCache,
    onSuccess: (skills) => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      appToast.success(t("repositories.cache.refreshed", { count: skills.length }));
    },
  });

  // 清理所有缓存
  const clearAllCachesMutation = useMutation({
    mutationFn: api.clearAllRepositoryCaches,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["repositories"] });
      queryClient.invalidateQueries({ queryKey: ["cache-stats"] });
      appToast.success(t("repositories.cache.clearedAll", { ...result }));
    },
  });

  // 从 URL 提取仓库名称
  const extractRepoNameFromUrl = (url: string): string => {
    const match = url.match(/github\.com[:/]([^/]+)/);
    return match?.[1] || "";
  };

  // 添加仓库
  const handleAddRepository = () => {
    if (newRepoUrl && newRepoName) {
      addMutation.mutate({ url: newRepoUrl, name: newRepoName }, {
        onSuccess: (repoId) => {
          setNewRepoUrl("");
          setNewRepoName("");
          setShowAddForm(false);
          appToast.success(t("repositories.toast.added"));

          // 自动扫描
          scanMutation.mutate(repoId, {
            onSuccess: (skills) => {
              appToast.success(t("repositories.toast.foundSkills", { count: skills.length }));
            },
          });
        },
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-headline text-foreground">{t("repositories.title")}</h1>
        <button onClick={() => setShowAddForm(!showAddForm)} className="apple-button-primary">
          {showAddForm ? <X /> : <Plus />} {t("repositories.addRepo")}
        </button>
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <div className="apple-card p-5" ref={addFormRef}>
          <h3 className="font-semibold mb-4">{t("repositories.addTitle")}</h3>
          <div className="grid gap-4">
            <input
              ref={urlInputRef}
              value={newRepoUrl}
              onChange={(e) => {
                setNewRepoUrl(e.target.value);
                if (!newRepoName) {
                  const extracted = extractRepoNameFromUrl(e.target.value);
                  if (extracted) setNewRepoName(extracted);
                }
              }}
              placeholder={t("repositories.urlPlaceholder")}
              className="apple-input"
            />
            <input
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
              placeholder={t("repositories.namePlaceholder")}
              className="apple-input"
            />
            <button onClick={handleAddRepository} className="apple-button-primary">
              {t("repositories.add")}
            </button>
          </div>
        </div>
      )}

      {/* 缓存统计 */}
      {cacheStats && (
        <div className="apple-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-500" />
              <h3 className="font-semibold text-sm">{t("repositories.cache.stats")}</h3>
            </div>
            <button onClick={() => clearAllCachesMutation.mutate()} className="apple-button-destructive">
              {t("repositories.cache.clearAll")}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-2xl font-bold">{cacheStats.totalRepositories}</p>
              <p className="text-sm text-muted-foreground">{t("repositories.cache.total")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{cacheStats.cachedRepositories}</p>
              <p className="text-sm text-muted-foreground">{t("repositories.cache.cached")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatBytes(cacheStats.totalSizeBytes)}</p>
              <p className="text-sm text-muted-foreground">{t("repositories.cache.size")}</p>
            </div>
          </div>
        </div>
      )}

      {/* 仓库列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {repositories?.map((repo) => (
            <div key={repo.id} className="apple-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{repo.name}</h3>
                  <p className="text-sm text-muted-foreground">{repo.url}</p>
                </div>
                <div className="flex items-center gap-2">
                  {repo.lastScanned && (
                    <span className="text-xs text-muted-foreground">
                      {t("repositories.lastScanned")}: {formatDate(repo.lastScanned)}
                    </span>
                  )}
                  <button onClick={() => scanMutation.mutate(repo.id)} className="apple-button-secondary">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteMutation.mutate(repo.id)} className="apple-button-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 九、API 端点汇总

### 仓库管理 API

| 端点                  | 方法   | 描述               |
| --------------------- | ------ | ------------------ |
| `add_repository`      | POST   | 添加新仓库         |
| `get_repositories`    | GET    | 获取所有仓库       |
| `delete_repository`   | DELETE | 删除仓库           |
| `scan_repository`     | POST   | 扫描仓库发现技能   |
| `is_repository_added` | GET    | 检查仓库是否已添加 |

### 精选仓库 API

| 端点                            | 方法 | 描述             |
| ------------------------------- | ---- | ---------------- |
| `get_featured_repositories`     | GET  | 获取精选仓库配置 |
| `refresh_featured_repositories` | POST | 刷新精选仓库配置 |

### 技能管理 API

| 端点                   | 方法   | 描述               |
| ---------------------- | ------ | ------------------ |
| `get_skills`           | GET    | 获取所有技能       |
| `get_installed_skills` | GET    | 获取已安装技能     |
| `install_skill`        | POST   | 安装技能           |
| `uninstall_skill`      | DELETE | 卸载技能           |
| `uninstall_skill_path` | DELETE | 卸载特定路径的技能 |
| `delete_skill`         | DELETE | 删除技能记录       |
| `scan_local_skills`    | POST   | 扫描本地技能       |

### 更新管理 API

| 端点                   | 方法 | 描述         |
| ---------------------- | ---- | ------------ |
| `check_skills_updates` | GET  | 检查技能更新 |
| `prepare_skill_update` | POST | 准备更新     |
| `confirm_skill_update` | POST | 确认更新     |
| `cancel_skill_update`  | POST | 取消更新     |

### 缓存管理 API

| 端点                               | 方法 | 描述               |
| ---------------------------------- | ---- | ------------------ |
| `clear_repository_cache`           | POST | 清理单个仓库缓存   |
| `clear_all_repository_caches`      | POST | 清理所有缓存       |
| `refresh_repository_cache`         | POST | 刷新仓库缓存       |
| `get_cache_stats`                  | GET  | 获取缓存统计       |
| `auto_scan_unscanned_repositories` | POST | 自动扫描未扫描仓库 |

### 工具 API

| 端点                         | 方法 | 描述               |
| ---------------------------- | ---- | ------------------ |
| `open_skill_directory`       | POST | 打开技能目录       |
| `get_default_install_path`   | GET  | 获取默认安装路径   |
| `select_custom_install_path` | POST | 选择自定义安装路径 |

---

## 十、总结

Agent Skills Guard 实现了一个功能完善的多来源技能仓库管理系统，具有以下核心特点：

### 架构设计

1. **三种仓库来源**：
   - 默认仓库：自动初始化官方仓库
   - 用户自定义：支持任意 GitHub 仓库
   - 精选仓库：远程配置的社区精选列表

2. **智能缓存策略**：
   - 首次扫描下载并缓存，后续扫描零 API 调用
   - 通过 commit SHA 检测仓库更新
   - 支持单个仓库或全部缓存清理

3. **安全优先**：
   - 60+ 安全规则覆盖 8 大风险类别
   - 10 个硬触发规则立即阻止危险操作
   - 两阶段安装流程允许用户确认后继续

4. **用户体验**：
   - 一键添加、自动扫描、智能提示
   - 多语言支持（英语/中文）
   - 精美的 macOS 风格 UI

### 技术亮点

- **前后端分离**：React + TypeScript 前端，Rust + Tauri 后端
- **数据库驱动**：SQLite 持久化，支持迁移
- **响应式状态**：TanStack Query 管理异步状态
- **容错设计**：单个仓库失败不影响整体功能
- **自动化流程**：首次启动自动扫描，更新检测

### 性能优化

- **缓存优先**：最小化 GitHub API 调用
- **增量更新**：只检测变化的仓库
- **批量操作**：支持批量扫描、更新、清理

整个系统通过精心设计的架构实现了技能仓库的统一管理，为 Claude Code 用户提供了安全、可管理、多来源的技能获取体验。

---

_文档版本：1.0_
_最后更新：2026-01-22_
_项目地址：https://github.com/brucevanfdm/agent-skills-guard_</content>
<parameter name="filePath">/root/workspace/agent-skills-guard/check-result.md
