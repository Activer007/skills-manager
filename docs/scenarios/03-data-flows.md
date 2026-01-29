# 数据流和状态管理文档

> **版本**: v1.0 | **最后更新**: 2025-01-29 | **维护者**: Skill Master Team

## 📚 文档概述

本文档描述了 Skill Master 的 **3 个核心数据流程**，包括前端状态管理（TanStack Query）、后端数据流转（Tauri Commands）、事件驱动机制（Tauri Events）等。

### 数据流分类

| 数据流 | 描述 | 复杂度 | 相关场景 |
|--------|------|-------|---------|
| **仓库→市场数据流** | GitHub 仓库扫描到市场数据库同步 | 复杂 | SC-09, SC-10, SC-11 |
| **安全扫描流程** | 安全扫描引擎执行和结果存储 | 中等 | SC-01, SC-18 |
| **任务管理流程** | 后台任务创建、执行、进度监听 | 中等 | SC-01, SC-19 |

---

## 📊 数据流 1: 仓库→市场数据流

> **流程图**: [`repository-to-market-data-flow.mermaid`](../diagrams/data-flows/repository-to-market-data-flow.mermaid) 📝 待创建

### 基本信息

| 字段 | 值 |
|------|-----|
| **数据流ID** | DF-01 |
| **复杂度** | 复杂 |
| **相关场景** | SC-09, SC-10, SC-11 |
| **适用版本** | v2.2.0+ |

### 数据流描述

**场景背景**: 用户添加自定义 GitHub 仓库，系统扫描仓库中的 Skills 并同步到市场数据库，供其他用户浏览和安装。

**业务价值**:
- 扩展市场 Skill 库
- 支持用户自定义来源
- 实现市场统一入口

### 数据流转步骤

#### 步骤 1: 用户添加仓库

**前端处理**:
- **入口**: 来源页面 (`/repositories`) → **"+ 添加仓库"** 按钮
- **文件**: `src/pages/Repositories.tsx`
- **操作**: 显示对话框，用户输入 GitHub URL

**用户输入**:
```
https://github.com/mycompany/team-skills
```

---

#### 步骤 2: URL 验证和解析

**前端处理**:
- **文件**: `src/pages/Repositories.tsx`
- **逻辑**: 验证是否为有效的 GitHub URL
- **正则**: `/^https:\/\/github\.com\/[^\/]+\/[^\/]+$/`

**提取信息**:
- `owner`: mycompany
- `repo`: team-skills

**错误处理**:
- 非 GitHub URL → 显示错误："请输入有效的 GitHub 仓库 URL"

---

#### 步骤 3: 调用后端扫描命令

**前端调用**:
```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('scan_repository', {
  owner: 'mycompany',
  repo: 'team-skills'
});
```

**后端命令**:
- **文件**: `src-tauri/src/commands/repository.rs`
- **函数**: `scan_repository(owner: String, repo: String) -> Result<Vec<SkillMetadata>, String>`

---

#### 步骤 4: 后端扫描仓库

**后端处理流程**:

##### 4.1 调用 GitHub API

**Rust 代码**:
```rust
use octocrab::Octocrab;

let github = Octocrab::builder()
    .token(Some(github_token))
    .build()?;

let repo = github.repos(&owner, &repo).get().await?;
```

**获取信息**:
- 仓库元数据（name, description, default_branch）
- 文件树（`.claude/skills/` 目录）
- SKILL.md 文件内容

##### 4.2 搜索 Skill 目录

**后端逻辑**:
- 搜索 `.claude/skills/` 目录
- 递归搜索所有子目录（深度：6 层）
- 查找包含 `SKILL.md` 的目录

**Rust 代码**:
```rust
let skill_dirs = find_skill_dirs(&repo_tree)?; // Vec<SkillDir>
```

##### 4.3 提取 Skill 元数据

**后端逻辑**:
- 读取 `SKILL.md` 文件
- 解析 frontmatter（YAML 格式）
- 提取字段：name, description, version, author

**SKILL.md 示例**:
```markdown
---
name: frontend-design
description: Frontend design expert
author: John Doe
version: 1.0.0
---

# Frontend Design Expert

You are a frontend design expert...
```

**Rust 代码**:
```rust
use serde_yaml;
use serde::Deserialize;

#[derive(Deserialize)]
struct SkillFrontmatter {
    name: String,
    description: String,
    #[serde(default)]
    author: Option<String>,
    #[serde(default = "default_version")]
    version: String,
}

fn default_version() -> String {
    "1.0.0".to_string()
}

let frontmatter: SkillFrontmatter = serde_yaml::from_str(&content)?;
```

##### 4.4 生成 Skill 元数据

**返回结构**:
```rust
pub struct SkillMetadata {
    pub name: String,
    pub description: String,
    pub version: String,
    pub author: Option<String>,
    pub source_url: String, // GitHub 仓库 URL
    pub repository_name: String, // owner/repo
    pub source_type: String, // "user" 或 "featured"
}
```

---

#### 步骤 5: 同步到市场数据库

**后端数据库操作**:

##### 5.1 插入/更新 Repository 记录

**SQL**:
```sql
INSERT INTO repositories (
    name, -- "mycompany/team-skills"
    url, -- "https://github.com/mycompany/team-skills"
    source_type, -- "user"
    enabled, -- true
    skill_count, -- 3
    last_scanned_at -- CURRENT_TIMESTAMP
) VALUES (?, ?, ?, ?, ?, ?)
ON CONFLICT(name) DO UPDATE SET
    last_scanned_at = excluded.last_scanned_at,
    skill_count = excluded.skill_count;
```

##### 5.2 插入/更新 Marketplace Skills

**SQL**:
```sql
INSERT INTO marketplace_skills (
    name,
    description,
    version,
    author,
    source_url,
    repository_name,
    source_type, -- "user"
    security_score, -- NULL（未扫描）
    quality_score, -- NULL（未评分）
    installed, -- false
    created_at,
    updated_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT(name, repository_name) DO UPDATE SET
    version = excluded.version,
    description = excluded.description,
    updated_at = excluded.updated_at;
```

##### 5.3 更新 FTS5 全文搜索索引

**SQL**（自动触发）:
```sql
-- FTS5 虚拟表自动更新
INSERT INTO marketplace_skills_fts(rowid, name, description)
SELECT id, name, description FROM marketplace_skills
WHERE rowid = last_insert_rowid();
```

---

#### 步骤 6: 返回扫描结果

**后端返回**:
```json
{
  "success": true,
  "skills_found": 3,
  "skills": [
    {
      "name": "frontend-design",
      "description": "Frontend design expert",
      "version": "1.0.0",
      "author": "John Doe"
    },
    // ...
  ]
}
```

---

#### 步骤 7: 前端更新 UI

**前端处理**:
- **文件**: `src/pages/Repositories.tsx`
- **操作**: 刷新来源列表
- **TanStack Query**:
  ```typescript
  import { useQuery } from '@tanstack/react-query';

  const { data, refetch } = useQuery({
    queryKey: ['repositories'],
    queryFn: () => invoke('get_repositories')
  });

  // 扫描完成后
  refetch();
  ```

**UI 更新**:
```
┌─────────────────────────────────────────┐
│ ✅ 扫描完成！                             │
│                                          │
│ 发现 3 个 Skills，已同步到市场            │
│ [立即查看]  [稍后再看]                   │
└─────────────────────────────────────────┘
```

---

### 数据模型

#### Repository 表

```sql
CREATE TABLE repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE, -- "owner/repo"
    url TEXT NOT NULL, -- GitHub URL
    source_type TEXT NOT NULL, -- "featured" 或 "user"
    enabled BOOLEAN NOT NULL DEFAULT 1,
    skill_count INTEGER NOT NULL DEFAULT 0,
    last_scanned_at TEXT, -- ISO 8601 timestamp
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### Marketplace Skill 表

```sql
CREATE TABLE marketplace_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    author TEXT,
    source_url TEXT, -- GitHub 仓库 URL
    repository_name TEXT NOT NULL, -- "owner/repo"
    source_type TEXT NOT NULL, -- "featured" 或 "user"
    security_score INTEGER, -- 0-100
    quality_score INTEGER, -- 0-100
    security_level TEXT, -- "safe", "risk", "blocked"
    installed BOOLEAN NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),

    FOREIGN KEY (repository_name) REFERENCES repositories(name)
        ON DELETE CASCADE
);
```

#### FTS5 全文搜索索引

```sql
CREATE VIRTUAL TABLE marketplace_skills_fts USING fts5(
    name,
    description,
    content=marketplace_skills,
    content_rowid=id
);

-- 触发器：自动同步 FTS5 索引
CREATE TRIGGER marketplace_skills_fts_insert AFTER INSERT ON marketplace_skills BEGIN
    INSERT INTO marketplace_skills_fts(rowid, name, description)
    VALUES (NEW.id, NEW.name, NEW.description);
END;
```

---

### TanStack Query 缓存策略

**前端缓存管理**:

```typescript
// src/pages/Marketplace.tsx
import { useQuery } from '@tanstack/react-query';

// 查询市场 Skills（缓存 5 分钟）
const { data: skills } = useQuery({
    queryKey: ['marketplace_skills', { source_type: 'all' }],
    queryFn: () => invoke('list_marketplace_skills', { sourceType: 'all' }),
    staleTime: 5 * 60 * 1000, // 5 分钟
    cacheTime: 10 * 60 * 1000 // 10 分钟
});

// 查询特定来源的 Skills（缓存 5 分钟）
const { data: userSkills } = useQuery({
    queryKey: ['marketplace_skills', { source_type: 'user', repository_name: 'mycompany/team-skills' }],
    queryFn: () => invoke('list_marketplace_skills_by_source', {
        sourceType: 'user',
        repositoryName: 'mycompany/team-skills'
    }),
    staleTime: 5 * 60 * 1000
});
```

**缓存失效策略**:
- 扫描仓库后 → `queryClient.invalidateQueries(['marketplace_skills'])`
- 安装 Skill 后 → `queryClient.invalidateQueries(['installed_skills'])`
- 启用/禁用 Skill 后 → `queryClient.invalidateQueries(['installed_skills'])`

---

### Tauri Events 事件驱动

**事件发送**（后端 → 前端）:

```rust
// src-tauri/src/commands/repository.rs
use tauri::Emitter;

#[tauri::command]
async fn scan_repository(
    app: tauri::AppHandle,
    owner: String,
    repo: String
) -> Result<Vec<SkillMetadata>, String> {
    // 扫描逻辑...

    // 发送进度事件
    app.emit("repository-scan-progress", json!({
        "stage": "scanning",
        "progress": 50,
        "message": "正在扫描仓库..."
    }))?;

    // 发送完成事件
    app.emit("repository-scan-complete", json!({
        "repository": format!("{}/{}", owner, repo),
        "skills_found": 3
    }))?;

    Ok(skills)
}
```

**事件监听**（前端）:

```typescript
// src/hooks/useRepositoryScanner.ts
import { listen } from '@tauri-apps/api/event';

export function useRepositoryScanner() {
    useEffect(() => {
        const unlistenProgress = listen('repository-scan-progress', (event) => {
            console.log('扫描进度:', event.payload);
            // 更新 UI 进度条
        });

        const unlistenComplete = listen('repository-scan-complete', (event) => {
            console.log('扫描完成:', event.payload);
            // 刷新市场列表
            queryClient.invalidateQueries(['marketplace_skills']);
        });

        return () => {
            unlistenProgress.then(fn => fn());
            unlistenComplete.then(fn => fn());
        };
    }, []);
}
```

---

### 错误处理

| 错误类型 | 触发条件 | 错误提示 | 恢复方法 |
|---------|---------|---------|---------|
| **GitHub API 限流** | 超过速率限制 | "GitHub API 限流，请稍后重试或配置 Token" | 配置 GitHub Token |
| **仓库不存在** | 404 错误 | "仓库不存在或无权限访问" | 检查仓库链接和权限 |
| **仓库无 Skills** | 未发现 SKILL.md | "仓库中未发现 Skills" | 确认仓库结构正确 |
| **数据库写入失败** | SQL 错误 | "同步失败，请重试" | 稍后重试 |

---

### 当前实现状态

- **状态**: ✅ 已完成
- **完成度**: 95%
- **已知问题**:
  - 数据断层：仓库扫描后未进入市场数据库（⚠️ 需验证）
- **相关文件**:
  - 前端: `src/pages/Repositories.tsx`, `src/pages/Marketplace.tsx`
  - 后端: `src-tauri/src/commands/repository.rs`

---

## 🛡️ 数据流 2: 安全扫描流程

> **流程图**: [`security-scan-flow.mermaid`](../diagrams/data-flows/security-scan-flow.mermaid) 📝 待创建

### 基本信息

| 字段 | 值 |
|------|-----|
| **数据流ID** | DF-02 |
| **复杂度** | 中等 |
| **相关场景** | SC-01, SC-18 |
| **适用版本** | v2.3.0+ |

### 数据流描述

**场景背景**: 用户安装 Skill 时，系统自动执行安全扫描，检测潜在风险（命令注入、敏感信息泄露等）。

**业务价值**:
- 保障系统安全
- 防止恶意代码
- 提升用户信任

### 数据流转步骤

#### 步骤 1: 触发安全扫描

**触发时机**:
- 安装 Skill 时（自动）
- 手动触发（安全页面）
- 定期扫描（每日）

**前端调用**:
```typescript
const report = await invoke('scan_skill_security', {
    skillPath: '/path/to/skill',
    mode: 'standard' // strict / standard / relaxed
});
```

---

#### 步骤 2: 后端扫描引擎

**后端处理流程**:

##### 2.1 计算 SHA-256 校验和

**Rust 代码**:
```rust
use sha2::{Sha256, Digest};
use std::fs;

fn calculate_checksum(skill_path: &str) -> Result<String, Box<dyn std::error::Error>> {
    let mut file = fs::File::open(skill_path)?;
    let mut hasher = Sha256::new();
    std::io::copy(&mut file, &mut hasher)?;
    let hash = hasher.finalize();
    Ok(format!("{:x}", hash))
}
```

##### 2.2 检查缓存

**SQL**:
```sql
SELECT security_report, cached_at
FROM security_scan_cache
WHERE skill_checksum = ? AND scan_mode = ?
```

**缓存策略**:
- 如果缓存存在且未过期 → 直接返回缓存结果
- 缓存有效期：7 天
- 配置变更（扫描模式/白名单）→ 失效缓存

##### 2.3 读取 Skill 文件

**Rust 代码**:
```rust
let skill_content = fs::read_to_string(skill_path)?;
```

##### 2.4 执行安全规则检测

**Rust 代码**:
```rust
use crate::security::rules::{CommandInjectionRule, SensitiveInfoRule, // ...};

let rules: Vec<Box<dyn SecurityRule>> = vec![
    Box::new(CommandInjectionRule::new()),
    Box::new(SensitiveInfoRule::new()),
    // ... 其他规则
];

let mut findings = Vec::new();

for rule in rules {
    if rule.is_enabled(&scan_mode) { // 检查规则是否启用
        let rule_findings = rule.scan(&skill_content)?;
        findings.extend(rule_findings);
    }
}
```

**安全规则示例**:

**命令注入风险**:
```rust
pub struct CommandInjectionRule;

impl SecurityRule for CommandInjectionRule {
    fn scan(&self, content: &str) -> Result<Vec<Finding>, Error> {
        let patterns = vec![
            r"eval\(", // 危险函数
            r"exec\(",
            r"system\(",
            r"`[^`]*`", // 反引号命令替换
        ];

        let mut findings = Vec::new();

        for (line_num, line) in content.lines().enumerate() {
            for pattern in &patterns {
                if regex::Regex::new(pattern)?.is_match(line) {
                    findings.push(Finding {
                        rule_id: "command-injection",
                        severity: Severity::Medium,
                        line: line_num + 1,
                        message: "检测到命令注入风险".to_string(),
                        code: line.to_string(),
                    });
                }
            }
        }

        Ok(findings)
    }
}
```

**敏感信息泄露**:
```rust
pub struct SensitiveInfoRule;

impl SecurityRule for SensitiveInfoRule {
    fn scan(&self, content: &str) -> Result<Vec<Finding>, Error> {
        let patterns = vec![
            r"(?i)api[_-]?key\s*[:=]\s*['\"][^'\"]+['\"]", // API Key
            r"(?i)password\s*[:=]\s*['\"][^'\"]+['\"]", // Password
            r"(?i)token\s*[:=]\s*['\"][^'\"]+['\"]", // Token
        ];

        // ... 同上逻辑
    }
}
```

##### 2.5 检查白名单

**SQL**:
```sql
SELECT rule_id
FROM whitelist_rules
WHERE rule_id = ?;
```

**逻辑**:
- 如果规则在白名单中 → 跳过此规则的发现
- 否则 → 记录到安全报告

##### 2.6 计算安全评分

**算法**:
```
security_score = 100 - (total_penalty)

total_penalty = Σ(finding.severity_penalty)

severity_penalty:
- High: 20 分
- Medium: 10 分
- Low: 5 分
```

**Rust 代码**:
```rust
let total_penalty: i32 = findings.iter()
    .map(|f| match f.severity {
        Severity::High => 20,
        Severity::Medium => 10,
        Severity::Low => 5,
    })
    .sum();

let security_score = (100 - total_penalty).max(0);
```

##### 2.7 确定安全等级

**逻辑**:
```
if security_score >= 90 → "safe" (安全)
else if security_score >= 70 → "risk" (风险)
else → "blocked" (阻断)
```

---

#### 步骤 3: 生成安全报告

**报告结构**:
```rust
pub struct SecurityReport {
    pub skill_name: String,
    pub skill_checksum: String,
    pub scan_mode: String,
    pub security_score: i32,
    pub security_level: String,
    pub findings: Vec<Finding>,
    pub scanned_at: String,
}

pub struct Finding {
    pub rule_id: String,
    pub severity: Severity,
    pub line: usize,
    pub message: String,
    pub code: String,
}
```

---

#### 步骤 4: 存储安全报告

**SQL**:
```sql
INSERT INTO security_reports (
    skill_name,
    skill_checksum,
    scan_mode,
    security_score,
    security_level,
    findings_json, -- JSON 序列化
    scanned_at
) VALUES (?, ?, ?, ?, ?, ?, ?);
```

**缓存**:
```sql
INSERT INTO security_scan_cache (
    skill_checksum,
    scan_mode,
    security_report, -- JSON 序列化
    cached_at
) VALUES (?, ?, ?, ?);
```

---

#### 步骤 5: 返回扫描结果

**后端返回**:
```json
{
  "skill_name": "frontend-design",
  "security_score": 90,
  "security_level": "safe",
  "findings": [
    {
      "rule_id": "command-injection",
      "severity": "medium",
      "line": 45,
      "message": "检测到命令注入风险",
      "code": "eval(userInput)"
    }
  ],
  "scanned_at": "2025-01-29T10:30:00Z"
}
```

---

#### 步骤 6: 前端显示报告

**前端处理**:
- **文件**: `src/pages/Security.tsx`
- **操作**: 渲染安全报告 UI

**UI 元素**:
```
┌─────────────────────────────────────────┐
│ 安全报告 - Frontend Design    [×]      │
├─────────────────────────────────────────┤
│ 安全等级: 🟢 安全 (90分)                  │
│                                          │
│ 发现的问题 (1 个):                       │
│                                          │
│ 1. 命令注入风险                           │
│    严重程度: 中等                         │
│    位置: SKILL.md:45                     │
│    代码: eval(userInput)                 │
│    建议: 使用沙箱执行或输入验证            │
│                                          │
│ [加入白名单]  [重新扫描]  [关闭]         │
└─────────────────────────────────────────┘
```

---

### 数据模型

#### Security Reports 表

```sql
CREATE TABLE security_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_name TEXT NOT NULL,
    skill_checksum TEXT NOT NULL,
    scan_mode TEXT NOT NULL, -- strict / standard / relaxed
    security_score INTEGER NOT NULL, -- 0-100
    security_level TEXT NOT NULL, -- safe / risk / blocked
    findings_json TEXT NOT NULL, -- JSON
    scanned_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### Security Scan Cache 表

```sql
CREATE TABLE security_scan_cache (
    skill_checksum TEXT NOT NULL,
    scan_mode TEXT NOT NULL,
    security_report TEXT NOT NULL, -- JSON
    cached_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (skill_checksum, scan_mode)
);
```

#### Whitelist Rules 表

```sql
CREATE TABLE whitelist_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### 当前实现状态

- **状态**: ✅ 已完成
- **完成度**: 100%
- **相关文件**:
  - 后端: `src-tauri/src/commands/security.rs`, `src-tauri/src/security/`

---

## 📋 数据流 3: 任务管理流程

> **流程图**: [`task-management-flow.mermaid`](../diagrams/data-flows/task-management-flow.mermaid) 📝 待创建

### 基本信息

| 字段 | 值 |
|------|-----|
| **数据流ID** | DF-03 |
| **复杂度** | 中等 |
| **相关场景** | SC-01, SC-19 |
| **适用版本** | v2.6.1+ |

### 数据流描述

**场景背景**: 用户执行长时间操作（安装 Skill、安全扫描等），系统创建后台任务，用户可以实时查看进度和结果。

**业务价值**:
- 提升用户体验
- 避免界面阻塞
- 支持任务并发

### 数据流转步骤

#### 步骤 1: 创建后台任务

**前端调用**:
```typescript
const taskId = await invoke('import_github_skill_with_progress', {
    url: 'https://github.com/user/repo'
});
// 返回: "task-uuid-123"
```

---

#### 步骤 2: 后端创建任务记录

**SQL**:
```sql
INSERT INTO tasks (
    id,
    type, -- "install_skill"
    status, -- "pending"
    input_json, -- JSON
    progress, -- 0
    created_at
) VALUES (?, ?, ?, ?, ?, ?);
```

---

#### 步骤 3: 后端执行任务（异步）

**Rust 代码**:
```rust
use tauri::async_command;

#[tauri::command]
async fn import_github_skill_with_progress(
    app: tauri::AppHandle,
    url: String
) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();

    // 创建任务记录
    db::create_task(&task_id, "install_skill", &url)?;

    // 异步执行任务
    tauri::async_runtime::spawn(async move {
        execute_install_task(&app, &task_id, &url).await
    });

    Ok(task_id)
}

async fn execute_install_task(
    app: &tauri::AppHandle,
    task_id: &str,
    url: &str
) -> Result<(), String> {
    // 更新任务状态为 running
    db::update_task_status(task_id, "running")?;
    emit_task_event(&app, task_id, "running", 0, "开始安装...").await?;

    // 步骤 1: 下载文件
    emit_task_event(&app, task_id, "running", 20, "正在下载...").await?;
    download_skill(url).await?;

    // 步骤 2: 解析 SKILL.md
    emit_task_event(&app, task_id, "running", 40, "正在解析...").await?;
    let metadata = parse_skill_metadata(url).await?;

    // 步骤 3: 安全扫描
    emit_task_event(&app, task_id, "running", 60, "正在扫描...").await?;
    let report = scan_skill_security(&metadata.path).await?;

    // 步骤 4: 安装
    emit_task_event(&app, task_id, "running", 80, "正在安装...").await?;
    install_skill(&metadata).await?;

    // 完成
    db::update_task_status(task_id, "completed")?;
    emit_task_event(&app, task_id, "completed", 100, "安装成功").await?;

    Ok(())
}
```

---

#### 步骤 4: 发送进度事件

**Tauri Events**:
```rust
use tauri::Emitter;

async fn emit_task_event(
    app: &tauri::AppHandle,
    task_id: &str,
    status: &str,
    progress: i32,
    message: &str
) -> Result<(), Box<dyn std::error::Error>> {
    app.emit("task-progress", json!({
        "task_id": task_id,
        "status": status,
        "progress": progress,
        "message": message
    }))?;
    Ok(())
}
```

---

#### 步骤 5: 前端监听任务进度

**前端 Hook**:
```typescript
// src/hooks/useTaskListener.ts
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useQueryClient } from '@tanstack/react-query';

interface TaskProgressEvent {
    task_id: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    message: string;
}

export function useTaskListener() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const unlisten = listen<TaskProgressEvent>('task-progress', (event) => {
            const { task_id, status, progress, message } = event.payload;

            console.log('任务进度:', task_id, status, progress, message);

            // 更新任务列表缓存
            queryClient.invalidateQueries(['tasks']);

            // 如果任务完成，刷新相关数据
            if (status === 'completed') {
                queryClient.invalidateQueries(['installed_skills']);
            }
        });

        return () => {
            unlisten.then(fn => fn());
        };
    }, [queryClient]);
}
```

---

#### 步骤 6: 显示任务进度

**前端处理**:
- **文件**: `src/pages/TaskCenter.tsx`
- **操作**: 渲染任务列表

**UI 元素**:
```
┌─────────────────────────────────────────┐
│ [全部]  [进行中]  [已完成]  [失败]      │
├─────────────────────────────────────────┤
│ 📥 安装 Frontend Design                  │
│ ⏳ 进行中 (60%)                          │
│ ████████░░                              │
│ - 正在安全扫描...                        │
└─────────────────────────────────────────┘
```

**实时更新**:
- `useTaskListener` 监听 `task-progress` 事件
- 更新任务状态
- 刷新 UI

---

#### 步骤 7: 任务完成或失败

**完成处理**:
```rust
db::update_task_status(task_id, "completed")?;
emit_task_event(&app, task_id, "completed", 100, "安装成功").await?;
```

**失败处理**:
```rust
db::update_task_status(task_id, "failed")?;
db::update_task_error(task_id, &error.to_string())?;
emit_task_event(&app, task_id, "failed", progress, &error.to_string()).await?;
```

---

### 数据模型

#### Tasks 表

```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY, -- UUID
    type TEXT NOT NULL, -- "install_skill", "scan_security", "uninstall_skill"
    status TEXT NOT NULL, -- "pending", "running", "completed", "failed", "cancelled"
    input_json TEXT, -- JSON
    output_json TEXT, -- JSON
    error_message TEXT,
    progress INTEGER NOT NULL DEFAULT 0, -- 0-100
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT
);
```

---

### 任务类型

| 任务类型 | 描述 | 相关命令 |
|---------|------|---------|
| **install_skill** | 从 GitHub/本地/包导入 Skill | `import_github_skill_with_progress` |
| **scan_security** | 安全扫描 | `scan_skill_security` |
| **uninstall_skill** | 卸载 Skill | `uninstall_skill` |
| **analyze_quality** | 质量评分 | `analyze_skill_quality` |
| **scan_repository** | 扫描仓库 | `scan_repository` |

---

### 当前实现状态

- **状态**: ✅ 已完成
- **完成度**: 100%
- **相关文件**:
  - 前端: `src/pages/TaskCenter.tsx`, `src/hooks/useTaskListener.ts`
  - 后端: `src-tauri/src/commands/task.rs`

---

## 📊 总结

### 数据流对比

| 数据流 | 复杂度 | 涉及表 | 事件驱动 | 缓存策略 | 状态 |
|--------|-------|--------|---------|---------|------|
| **仓库→市场数据流** | 复杂 | repositories, marketplace_skills | ✅ | TanStack Query (5min) | ✅ 完成 |
| **安全扫描流程** | 中等 | security_reports, security_scan_cache, whitelist_rules | ❌ | 自定义缓存 (7天) | ✅ 完成 |
| **任务管理流程** | 中等 | tasks | ✅ | 无 | ✅ 完成 |

### 技术栈

| 层级 | 技术 |
|------|------|
| **前端状态管理** | TanStack Query (React Query) |
| **事件驱动** | Tauri Events |
| **后端异步** | Tokio (Rust async runtime) |
| **数据库** | SQLite (rusqlite) |
| **全文搜索** | FTS5 (SQLite extension) |

---

## 🔗 相关文档

- **[01-user-journeys.md](./01-user-journeys.md)** - 5 个用户旅程场景
- **[02-feature-flows.md](./02-feature-flows.md)** - 19 个功能流程场景
- **[04-error-handling.md](./04-error-handling.md)** - 错误处理和边界情况
- **[CLAUDE.md](../../CLAUDE.md)** - 项目架构和 API 文档

---

**文档版本**: v1.0
**最后更新**: 2025-01-29
**维护者**: Skill Master Team
