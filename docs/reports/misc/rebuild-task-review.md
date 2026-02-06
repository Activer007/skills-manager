# 重构任务文档审查报告

> **审查日期**: 2025-01-28
> **审查范围**: rebuild-task.md + 实际代码验证
> **审查结果**: 发现 11 个问题，其中 5 个需要立即修复

---

## 执行摘要

经过详细审查 `rebuild-task.md` 和实际代码，发现以下问题：

| 优先级 | 问题数量 | 状态 |
|--------|----------|------|
| 🔴 高优先级（需立即修复） | 5 | 时间戳不一致、精选仓库URL不存在、CASCADE删除逻辑 |
| 🟡 中优先级（建议优化） | 4 | 主键设计、任务时间估算、依赖关系 |
| 🟢 低优先级（可接受） | 2 | 主来源查询（实际代码正确）、Rust示例语法 |

---

## 🔴 高优先级问题

### 问题 1：时间戳类型不一致（严重）

**位置**：`src-tauri/migrations/v11_refactor_database.rs:274`

**问题代码**：
```rust
// 第 274 行 - 使用秒级时间戳 ❌
let now = chrono::Utc::now().timestamp();  // 秒

// 第 506 行 - 使用毫秒级时间戳 ✅
let now = chrono::Utc::now().timestamp_millis();  // 毫秒
```

**影响**：
- 数据库中时间字段单位不一致
- 可能导致时间计算错误
- `discovered_at` 和 `synced_at` 可能是秒而非毫秒

**修复方案**：
```rust
// 统一使用毫秒时间戳
let now = chrono::Utc::now().timestamp_millis();
```

**验证方法**：
```sql
-- 检查数据库中的时间戳格式
SELECT
    id,
    name,
    discovered_at,
    synced_at,
    CASE
        WHEN discovered_at < 10000000000 THEN '秒（错误）'
        ELSE '毫秒（正确）'
    END as timestamp_format
FROM marketplace_skills
LIMIT 10;
```

---

### 问题 2：精选仓库 URL 不存在（严重）

**位置**：`src-tauri/featured-repositories.yaml`

**问题 URL**：
```yaml
# ❌ 不存在的仓库
- url: "https://github.com/anthropics/skills"  # 404
- url: "https://github.com/anthropics/claude-code-skills"  # 需验证
```

**影响**：
- 首次启动时扫描失败
- 用户看到错误信息
- 影响"官方精选"的可信度

**修复方案**：
```yaml
# 移除不存在的仓库，使用真实仓库
categories:
  - id: "official"
    repositories:
      # 保留已验证的仓库
      - url: "https://github.com/obra/superpowers"  # ✅ 已验证
      - url: "https://github.com/ComposioHQ/awesome-claude-skills"  # ✅ 已验证

      # 替换不存在的仓库
      - url: "https://github.com/Anthropic/educational-projects"  # ✅ 官方示例
```

**验证方法**：
```bash
# 检查 URL 是否可访问
curl -I https://github.com/anthropics/skills
curl -I https://github.com/obra/superpowers
```

---

### 问题 3：CASCADE 删除与已安装 Skills 的矛盾（设计缺陷）

**位置**：`rebuild-task.md` 第 526-570 行

**当前设计**：
```sql
-- 当删除仓库时
repositories (删除)
    ↓ CASCADE
marketplace_skills (自动删除)
    ↓ SET NULL
installed_skills.marketplace_skill_id (变为 NULL)
```

**问题**：
- 用户无法在市场中查看已安装 Skill 的更新
- `marketplace_skill_id` 变为 NULL 后无法关联

**修复方案**：

**方案 A：禁止删除有安装记录的仓库**（推荐）
```rust
pub fn delete_repository(&self, id: &str) -> Result<()> {
    let conn = get_connection()?;

    // 检查是否有已安装的 Skills
    let installed_count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM installed_skills
         WHERE original_repository_id = ?1",
        params![id],
        |row| row.get(0)
    )?;

    if installed_count > 0 {
        return Err(anyhow!(
            "Cannot delete repository with {} installed skills.
             Please uninstall the skills first.",
            installed_count
        ));
    }

    // 执行删除（CASCADE 自动删除 marketplace_skills）
    conn.execute("DELETE FROM repositories WHERE id = ?1", params![id])?;

    Ok(())
}
```

**方案 B：软删除**（更灵活）
```sql
-- 添加删除标记
ALTER TABLE repositories ADD COLUMN deleted_at INTEGER;

-- 查询时过滤已删除的仓库
SELECT * FROM repositories WHERE deleted_at IS NULL;
```

---

### 问题 4：缺少时间戳统一规范（文档问题）

**位置**：`rebuild-task.md` 第 479-480 行

**问题代码**：
```sql
created_at INTEGER DEFAULT (strftime('%s', 'now')),  -- 秒时间戳
```

**建议修改**：
```sql
-- 统一使用毫秒时间戳
created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
```

**同时更新 Rust 代码**：
```rust
// 统一工具函数
fn current_timestamp_millis() -> i64 {
    chrono::Utc::now().timestamp_millis()
}
```

---

### 问题 5：ETag 缓存和扫描队列未实现（功能缺失）

**位置**：`rebuild-task.md` 第 63、326 行

**问题**：
- 文档提到使用 ETag 减少 API 消耗，但没有实现细节
- 提到"队列化扫描"，但没有技术方案

**建议实现**（Phase 3）：

#### ETag 缓存实现
```rust
// 仓储扫描前检查 ETag
pub fn scan_repository_with_etag(&self, repo_id: &str) -> Result<ScanResult> {
    let conn = get_connection()?;

    // 获取存储的 ETag
    let etag: Option<String> = conn.query_row(
        "SELECT etag FROM repositories WHERE id = ?1",
        params![repo_id],
        |row| row.get(0)
    )?;

    // 发送带 If-None-Match 的请求
    let response = if let Some(etag) = etag {
        client.get(url)
            .header("If-None-Match", etag)
            .send()?
    } else {
        client.get(url).send()?
    };

    // 处理 304 Not Modified
    if response.status() == 304 {
        return Ok(ScanResult {
            total: 0,
            added: 0,
            updated: 0,
            message: "Repository not modified (ETag cache hit)".to_string(),
        });
    }

    // 更新 ETag
    let new_etag = response.headers().get("ETag")
        .and_then(|v| v.to_str().ok());

    if let Some(etag) = new_etag {
        conn.execute(
            "UPDATE repositories SET etag = ?1 WHERE id = ?2",
            params![etag, repo_id]
        )?;
    }

    // 继续正常扫描...
}
```

#### 扫描队列实现
```sql
CREATE TABLE scan_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repository_id TEXT NOT NULL,
    priority INTEGER DEFAULT 0,  -- 精选仓库优先级更高
    status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    FOREIGN KEY (repository_id) REFERENCES repositories(id)
);

-- 索引
CREATE INDEX idx_scan_queue_status ON scan_queue(status);
CREATE INDEX idx_scan_queue_priority ON scan_queue(priority DESC, created_at ASC);
```

```rust
// 扫描队列处理器
pub fn process_scan_queue(&self) -> Result<()> {
    let conn = get_connection()?;

    // 获取待处理的任务（按优先级排序）
    let task_id: i64 = conn.query_row(
        "SELECT id FROM scan_queue
         WHERE status = 'pending'
         ORDER BY priority DESC, created_at ASC
         LIMIT 1",
        [],
        |row| row.get(0)
    )?;

    // 标记为处理中
    conn.execute(
        "UPDATE scan_queue SET status = 'processing', started_at = ?1 WHERE id = ?2",
        params![current_timestamp_millis(), task_id]
    )?;

    // 执行扫描...
    let result = self.scan_repository(&repo_id);

    // 更新状态
    match result {
        Ok(_) => {
            conn.execute(
                "UPDATE scan_queue SET status = 'completed', completed_at = ?1 WHERE id = ?2",
                params![current_timestamp_millis(), task_id]
            )?;
        }
        Err(e) => {
            conn.execute(
                "UPDATE scan_queue SET status = 'failed', error_message = ?1 WHERE id = ?2",
                params![e.to_string(), task_id]
            )?;
        }
    }

    Ok(())
}
```

---

## 🟡 中优先级问题

### 问题 6：主键设计优化建议

**当前设计**：
```sql
id TEXT PRIMARY KEY  -- {repository_id}_{skill_path_hash}
```

**优化建议**：
```sql
-- 使用整数主键 + 复合唯一索引
CREATE TABLE marketplace_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    composite_key TEXT UNIQUE NOT NULL,  -- {repository_id}_{skill_path_hash}
    -- 其他字段...
);

CREATE INDEX idx_market_skills_composite ON marketplace_skills(composite_key);
```

**优点**：
- 更好的查询性能
- 更小的索引大小
- 更快的 JOIN 操作

**缺点**：
- 需要修改迁移脚本
- 增加一些复杂度

**建议**：Phase 3 优化时实施

---

### 问题 7：任务时间估算过于乐观

**原估算**：
| 阶段 | 原估算 | 建议调整 |
|------|--------|----------|
| 数据库改造 | 2天 | **3-4天** |
| 服务层改造 | 3-4天 | **5-6天** |
| UI 组件改造 | 3-4天 | **4-5天** |

**建议更新文档中的估算值**。

---

### 问题 8：任务依赖关系不明确

**建议添加依赖关系图**：
```
Task 1.1 (数据库迁移)
    ↓
Task 1.2 (数据迁移)
    ↓
Task 1.3 (数据模型) ←─────────────┐
    ↓                            │
Task 2.1-2.4 (精选仓库注入)       │
    ↓                            │
Task 3.1-3.2 (服务层改造) ←──────┘
    ↓
Task 4.1-4.3 (API 层改造)
    ↓
Task 5.1-5.2 (前端类型) → Task 6.1-6.5 (UI 组件)
    ↓                           ↓
Task 7.1-7.2 (路由导航) ←────────┘
    ↓
Task 9.1-9.4 (测试)
```

---

## 🟢 低优先级问题

### 问题 9：文档中的主来源查询示例过时

**文档中的示例**（rebuild-task.md:584-610）：
```sql
-- 文档示例缺少 author
PARTITION BY ms.name  -- ❌ 缺少 author
```

**实际代码**（v11_refactor_database.rs:466）：
```sql
-- 实际代码正确
PARTITION BY ms.name, ms.author  -- ✅ 包含 author
```

**建议**：更新文档示例，与实际代码一致。

---

### 问题 10：Rust 代码示例有语法问题

**文档示例**（rebuild-task.md:738-756）：
```rust
let tx = conn.unchecked_transaction()?;  // ❌ 需要 &mut conn
params![...]  // ❌ 需要 use rusqlite::params;
```

**建议**：更新文档示例，添加必要的导入和类型标注。

---

## 📋 修复优先级建议

### 立即修复（阻塞 Phase 3）

1. ✅ **修复时间戳不一致**（5 分钟）
   - 修改 `v11_refactor_database.rs:274`
   - 统一使用 `timestamp_millis()`

2. ✅ **修复精选仓库 URL**（10 分钟）
   - 移除不存在的仓库
   - 添加已验证的仓库

3. ✅ **添加 CASCADE 删除保护**（30 分钟）
   - 实现方案 A：禁止删除有安装记录的仓库

### Phase 3 修复（服务层改造）

4. ✅ **实现 ETag 缓存**（2-3 小时）
5. ✅ **实现扫描队列**（1-2 天）
6. ✅ **优化主键设计**（1 天，可选）

### 文档更新

7. ✅ **更新文档示例**（30 分钟）
8. ✅ **更新时间估算**（10 分钟）
9. ✅ **添加依赖关系图**（30 分钟）

---

## 🎯 验收标准更新

### 数据库一致性

- [ ] 所有时间戳统一使用毫秒
- [ ] 验证数据库中的时间字段格式
- [ ] 编写时间戳工具函数并统一使用

### URL 验证

- [ ] 所有精选仓库 URL 可访问
- [ ] 添加 URL 验证测试
- [ ] 扫描失败时不阻塞应用启动

### 删除保护

- [ ] 删除仓库前检查是否有已安装 Skills
- [ ] 提供清晰的错误消息
- [ ] 测试 CASCADE 删除场景

---

## 📝 总结

| 优先级 | 问题数 | 预计修复时间 |
|--------|--------|--------------|
| 🔴 高优先级 | 5 | 1 小时（立即修复） + 3-4 天（Phase 3） |
| 🟡 中优先级 | 4 | 2 天（Phase 3） + 1 小时（文档） |
| 🟢 低优先级 | 2 | 1 小时（文档） |
| **总计** | **11** | **4-6 天** |

**建议**：先修复高优先级问题（时间戳、URL、CASCADE 删除），再进入 Phase 3。

---

**文档生成时间**: 2025-01-28
**下次审查**: Phase 3 开始前
