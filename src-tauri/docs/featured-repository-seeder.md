# Featured Repository Seeder

## 概述

`featured_repository_seeder` 模块负责在应用首次启动时自动从配置文件加载精选仓库并注入到数据库中。

## 功能特性

- ✅ **幂等性保证**：可以多次运行而不会创建重复条目
- ✅ **配置驱动**：从 `featured-repositories.yaml` 加载配置
- ✅ **国际化支持**：自动选择中文描述（回退到英文）
- ✅ **类别映射**：支持官方、社区、自定义三种类别
- ✅ **容错处理**：单个仓库失败不影响其他仓库注入
- ✅ **详细日志**：记录所有关键步骤，便于调试

## 使用方法

### 自动启动（生产环境）

在 `src-tauri/src/lib.rs` 的启动流程中已经集成：

```rust
.setup(|app| {
    // 初始化数据库
    crate::services::db::init_db()?;

    // 注入精选仓库
    match crate::services::seed_featured_repositories() {
        Ok(seeded) => {
            if seeded {
                log::info!("Featured repositories seeded successfully");
            }
        }
        Err(e) => {
            log::warn!("Failed to seed featured repositories: {}", e);
            // 不阻塞应用启动
        }
    }

    // ...
})
```

### 手动调用（开发环境）

```rust
use crate::services::featured_repository_seeder;

fn main() {
    match featured_repository_seeder::seed_featured_repositories() {
        Ok(seeded) => {
            if seeded {
                println!("Featured repositories seeded successfully");
            } else {
                println!("Repositories already exist, skipping");
            }
        }
        Err(e) => {
            eprintln!("Failed to seed: {}", e);
        }
    }
}
```

## 工作流程

1. **检查数据库状态**
   - 查询 `repositories` 表的记录数
   - 如果已有记录，跳过注入（幂等性）

2. **加载配置文件**
   - 优先从缓存加载：`~/.claude/skills-manager-cache/featured-repositories.yaml`
   - 回退到嵌入配置：`src-tauri/featured-repositories.yaml`

3. **转换数据**
   - 从 `FeaturedRepository` 转换为 `Repository`
   - 设置元数据：`source_type='featured'`, `priority=10`, `scan_status='pending'`
   - 映射类别：`official` → `RepositoryCategory::Official`

4. **批量注入**
   - 使用 `INSERT OR IGNORE` 避免冲突
   - 记录成功/失败日志
   - 单个失败不影响整体

## 数据库字段

注入的仓库包含以下关键字段：

| 字段 | 值 | 说明 |
|------|-----|------|
| `source_type` | `"featured"` | 标识为精选仓库 |
| `priority` | `10` | 高优先级（用户仓库为 100） |
| `enabled` | `true` | 默认启用 |
| `featured` | `true` | 向后兼容标志 |
| `scan_status` | `"pending"` | 等待扫描 |
| `category` | `Official/Community` | 从配置映射 |

## 配置文件格式

`featured-repositories.yaml`：

```yaml
version: "1.0"
last_updated: "2026-01-23"

categories:
  - id: "official"
    name:
      en: "Official"
      zh: "官方推荐"
    repositories:
      - url: "https://github.com/anthropics/skills"
        name: "anthropics"
        description:
          en: "Official Anthropic skills"
          zh: "Anthropic 官方技能仓库"
        tags: ["official", "verified"]
        featured: true
        scan_subdirs: true
```

## 验证注入结果

### SQL 查询

```bash
sqlite3 ~/.claude/skills-manager.db
```

```sql
-- 查看精选仓库
SELECT id, name, source_type, priority, enabled, featured, category
FROM repositories
WHERE source_type = 'featured';

-- 验证元数据
SELECT COUNT(*) as featured_count
FROM repositories
WHERE source_type = 'featured';

-- 查看详细信息
SELECT url, name, description, scan_subdirs, added_at
FROM repositories
WHERE source_type = 'featured';
```

### 预期结果

```sql
id          | name       | source_type | priority | enabled | featured | category
------------|------------|-------------|----------|---------|----------|----------
<uuid>      | anthropics | featured    | 10       | 1       | 1        | official
<uuid>      | superpowers| featured    | 10       | 1       | 1        | community
```

## 日志输出

### 首次启动

```
[DEBUG] Checking for featured repositories to seed...
[INFO] No repositories found, seeding featured repositories...
[INFO] Found 4 featured repositories to inject
[DEBUG] Seeded featured repository: anthropics
[DEBUG] Seeded featured repository: claude-code-skills
[DEBUG] Seeded featured repository: superpowers
[DEBUG] Seeded featured repository: awesome-claude-skills
[INFO] Successfully injected 4 featured repositories: anthropics, claude-code-skills, superpowers, awesome-claude-skills
[DEBUG] Featured repository seeding completed
```

### 重复启动（幂等）

```
[DEBUG] Checking for featured repositories to seed...
[DEBUG] Repositories already exist (count: 4), skipping seeding
```

## 测试

### 单元测试

```bash
cd src-tauri
cargo test featured_repository_seeder::tests
```

测试用例：
- ✅ `test_featured_repo_to_repository` - 字段转换正确性
- ✅ `test_featured_repo_to_repository_fallback_description` - 描述回退逻辑
- ✅ `test_featured_repo_to_repository_default_fields` - 默认字段验证

### 手动测试

1. **首次启动测试**
   ```bash
   # 删除数据库
   rm ~/.claude/skills-manager.db

   # 启动应用
   npm run tauri:dev

   # 检查日志：看到注入成功消息
   # 检查数据库：查询 repositories 表
   ```

2. **重复启动测试**
   ```bash
   # 再次启动应用
   npm run tauri:dev

   # 验证：日志显示"已存在，跳过"
   # 验证：数据库无重复数据
   ```

## SQL 注入脚本

提供手动初始化脚本 `src-tauri/scripts/seed-featured-repos.sql`：

```bash
sqlite3 ~/.claude/skills-manager.db < seed-featured-repos.sql
```

**注意**：生产环境应使用 Rust seeder 而非 SQL 脚本。

## 故障排查

### 问题：没有注入任何仓库

**检查项**：
1. 数据库是否已存在记录？→ 删除数据库重试
2. 配置文件是否有效？→ 运行 `FeaturedRepositoryService::get_config()`
3. 日志中是否有错误信息？

### 问题：部分仓库注入失败

**检查项**：
1. URL 是否有效且可访问？
2. 日志中的警告信息
3. 数据库唯一约束冲突？

### 问题：类别映射错误

**检查项**：
1. YAML 配置中的 `category.id` 是否正确？
2. 映射逻辑是否完整？（official/community/custom）

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Startup                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Database Initialization (init_db)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         Featured Repository Seeder (seed_featured_)         │
│  1. Check if repositories exist                             │
│  2. Load featured-repositories.yaml                         │
│  3. Convert to Repository models                            │
│  4. Batch insert into database                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Repository Table                        │
│  • source_type = 'featured'                                 │
│  • priority = 10                                            │
│  • enabled = true                                           │
│  • scan_status = 'pending'                                  │
└─────────────────────────────────────────────────────────────┘
```

## 相关文件

| 文件 | 说明 |
|------|------|
| `src-tauri/src/services/featured_repository_seeder.rs` | Seeder 实现 |
| `src-tauri/src/services/featured_repository_service.rs` | 配置加载服务 |
| `src-tauri/src/services/repository_service.rs` | 数据库操作服务 |
| `src-tauri/src/models/repository.rs` | Repository 模型定义 |
| `src-tauri/featured-repositories.yaml` | 精选仓库配置 |
| `src-tauri/scripts/seed-featured-repos.sql` | SQL 注入脚本（可选） |

## 向后兼容

保留旧的 `repository_initializer.rs` 模块以确保向后兼容：

```rust
// 旧代码（已注释）
// match crate::services::initialize_default_repositories() {
//     Ok(initialized) => { /* ... */ }
//     Err(e) => { /* ... */ }
// }

// 新代码（使用 YAML 配置）
match crate::services::seed_featured_repositories() {
    Ok(seeded) => { /* ... */ }
    Err(e) => { /* ... */ }
}
```

## 下一步

完成阶段 2 后，继续实施**阶段 3：服务层改造**：
- RepositoryService 增强（添加 `scan_and_sync_to_marketplace()`）
- MarketplaceService 重构（实现主来源查询）

---

**创建时间**: 2026-01-28
**版本**: v2.6.0
**作者**: Claude Code Assistant
