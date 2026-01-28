# 仓库与市场系统重构规划

> **文档版本**: v2.1
> **创建日期**: 2025-01-28
> **最后更新**: 2025-01-28
> **方案选择**: 方案 C - 关联表模式（市场表为核心） + 快照冗余

---

## 变更记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2025-01-28 | 初始版本 | Claude |
| v2.0 | 2025-01-28 | 明确数据库方案为关联表模式；更新主来源实现；添加精选仓库注入方案 | Claude |
| v2.1 | 2025-01-28 | 优化数据一致性（快照字段）；改进去重逻辑（引入 Namespace）；增强 API 限流处理；优化 ID 格式 | Claude |

---

## 目录

- [一、核心设计决策](#一核心设计决策)
- [二、背景分析](#二背景分析)
- [三、当前问题](#三当前问题)
- [四、改造方案](#四改造方案)
- [五、业务架构设计](#五业务架构设计)
- [六、用户旅程设计](#六用户旅程设计)
- [七、技术实现要点](#七技术实现要点)
- [八、任务清单](#八任务清单)
- [九、验收标准](#九验收标准)

---

## 一、核心设计决策

### 1.1 数据库架构：方案 C（关联表模式）

**核心理念：市场表是统一的 Skills 库，仓库只是数据源**

经过方案 A（仓库为核心）、方案 B（JSON 字段）、方案 C（关联表）的详细对比，选择 **方案 C**。

**选择理由：**

| 维度 | 方案 C 优势 | 说明 |
|------|-------------|------|
| **写入简单性** | ✅ 优秀 | 每个仓库的 Skills 独立存储，直接插入 |
| **删除简单性** | ✅ 优秀 | CASCADE 自动处理关联 |
| **数据一致性** | ✅ 优秀 | 每个 Skill 独立，无冲突 |
| **来源筛选性能** | ✅ 优秀 | 索引支持好 |
| **扩展性** | ✅ 优秀 | 容易添加版本管理等功能 |

### 1.2 关键设计规则

| 决策点 | 实现方案 | 理由 |
|--------|----------|------|
| **Skill 唯一标识** | `{repository_id}_{skill_path_hash}` | 使用下划线避免 URL 解析问题 |
| **同名 Skills 处理** | 引入命名空间 (Name + Author)<br>同一命名空间下只显示主来源 | 避免不同作者的同名 Skill 被误隐藏 |
| **主来源规则** | 精选仓库优先（priority=10）<br>用户仓库次之（priority=100） | 确保官方内容优先展示 |
| **删除仓库** | 未安装的 Skills 删除<br>已安装的 Skills 保留（快照模式） | 保护用户数据，installed_skills 存储冗余信息 |
| **精选仓库初始化** | 开发者预先注入数据库 | 应用启动时检查并注入 |
| **去重功能** | 未来版本 | 当前版本展示主来源即可 |
| **API 优化** | Token 引导 + ETag 缓存 | 减少 GitHub API 消耗，避免限流 |

### 1.3 MVP 功能范围

**MVP 版本包含：**
- ✅ 精选仓库自动同步到市场
- ✅ 用户添加仓库功能
- ✅ 基础的来源标记（官方/用户）
- ✅ Toast 提示（不强制跳转）

**未来版本：**
- ⏸️ 去重视图（合并同名 Skills）
- ⏸️ 版本管理
- ⏸️ 高级统计和分析

---

## 二、背景分析

### 2.1 当前系统架构

当前系统中，**仓库管理**和**市场**是两个独立运行的功能模块：

| 模块 | 当前定位 | 数据表 | 主要功能 |
|------|----------|--------|----------|
| **市场** (`/marketplace`) | Skills 展示与安装入口 | `marketplace_skills` | 浏览、搜索、安装 Skills |
| **仓库管理** (`/repositories`) | 独立的仓库管理工具 | `repositories` | 添加、扫描、管理 GitHub 仓库 |

**关键问题：两个系统之间没有数据流通**

### 2.2 用户心智模型

```
┌─────────────────────────────────────────────────────────────────────┐
│                        用户视角                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "市场" = 我可以浏览和安装 Skills 的地方                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  用户期望：                                                   │
│  │  - 看到丰富的 Skills 列表                                      │
│  │  - 能按分类、标签搜索                                           │
│  │  - 看到 Stars、下载量等热度指标                                  │
│  │  - 一键安装                                                     │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  "仓库" = ？？？(用户困惑)                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  当前状态：                                                   │
│  │  - 可以添加 GitHub 仓库                                        │
│  │  - 可以扫描仓库                                                │
│  │  - 然后...？                                                  │
│  │                                                               │
│  │  用户疑问：                                                   │
│  │  ❓ 扫描仓库的 Skills 去哪了？                                  │
│  │  ❓ 为什么不能在市场看到它们？                                  │
│  │  ❓ 我添加仓库是为了什么？                                      │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**核心困惑：用户不理解"仓库"和"市场"的区别和关系。**

---

## 三、当前问题

### 3.1 业务逻辑问题

```
问题 1: 数据断层
────────────────────────────────────────────────────────────────────
用户添加仓库 → 扫描发现 Skills → Skills 仅存在于本地缓存
                                         ↓
                                    ❌ 不在市场数据库显示
                                         ↓
                                    用户无法通过市场安装
```

```
问题 2: 功能闭环缺失
────────────────────────────────────────────────────────────────────
仓库管理功能链：
  添加仓库 → 扫描仓库 → 发现 Skills → ？？？(没有后续)
                                   ↓
                            用户价值未实现
```

```
问题 3: 入口混淆
────────────────────────────────────────────────────────────────────
侧边栏两个一级入口：
  - 市场 (浏览和安装)
  - 仓库管理 (添加和扫描)

用户困惑：
  - 我应该去哪里找 Skills？
  - 这两个地方是什么关系？
```

### 3.2 技术架构问题

```sql
-- 当前数据库状态
repositories 表              marketplace_skills 表
├─ id                        ├─ id
├─ url                       ├─ name
├─ name                      ├─ github_url
├─ last_scanned              ├─ stars
└─ cache_path                └─ ...

两个表完全独立，没有关联关系！
```

---

## 四、改造方案

### 4.1 方案对比

| 维度 | 方案 A: 仓库为核心 | 方案 B: JSON 字段 | 方案 C: 关联表 ✓ |
|------|------------------|-------------------|------------------|
| **查询简单性** | 简单 | 复杂（JSON） | 中等（JOIN） |
| **写入简单性** | 简单 | 复杂（判断重复） | 简单（直接插入） |
| **删除简单性** | 简单 | 复杂（修改JSON） | 简单（CASCADE） |
| **数据一致性** | 中等 | 差（冲突） | 优秀（独立） |
| **来源筛选性能** | 中等 | 差（JSON查询） | 优秀（索引） |
| **扩展性** | 差 | 中等 | 优秀 |
| **总分** | 53/80 | 65/80 | **70/80** |

### 4.2 核心理念

**市场是唯一的 Skills 展示入口，仓库是数据源管理工具**

```
┌─────────────────────────────────────────────────────────────────────┐
│                        单一数据源模式                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  "市场" = 所有 Skills 的展示窗口                                      │
│                                                                     │
│  数据来源：                                                          │
│  ┌──────────────────┐    ┌──────────────────┐                      │
│  │  精选仓库         │    │  用户添加的仓库   │                      │
│  │  (官方维护)       │    │  (自定义来源)     │                      │
│  │  priority=10     │    │  priority=100    │                      │
│  └────────┬─────────┘    └────────┬─────────┘                      │
│           │                       │                                │
│           └───────────┬───────────┘                                │
│                       ▼                                            │
│              ┌───────────────┐                                      │
│              │ marketplace_  │                                      │
│              │ skills 表     │                                      │
│              │ (统一存储)     │                                      │
│              └───────┬───────┘                                      │
│                      │                                              │
│                      ▼                                              │
│              ┌───────────────┐                                      │
│              │     市场      │                                      │
│              │  (展示 & 安装) │                                      │
│              │  只显示主来源   │                                      │
│              └───────────────┘                                      │
│                                                                     │
│  "来源管理" (原仓库管理) = 数据源的配置管理工具                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 主来源机制

**设计理念：同一个 Skill 可能在多个仓库中存在，但市场只显示优先级最高的版本**

```
示例：Weather Tool 在多个仓库中
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  精选仓库 A (priority=10)                                            │
│  └─ Weather Tool (stars: 1000, forks: 200)                          │
│                                                                     │
│  用户仓库 B (priority=100)                                           │
│  └─ Weather Tool (stars: 500, forks: 50)                            │
│                                                                     │
│  用户仓库 C (priority=100)                                           │
│  └─ Weather Tool (stars: 300, forks: 30)                            │
│                                                                     │
│  市场显示：                                                          │
│  └─ Weather Tool (来自精选仓库 A) ⭐ 官方精选                         │
│      只显示这一个，不显示 B 和 C                                      │
│                                                                     │
│  用户筛选"只显示自定义来源"时：                                       │
│  └─ 显示来自仓库 B 的版本（优先级高于 C）                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**实现方式：**

```sql
-- 通过 ROW_NUMBER() 选择主来源
WITH ranked_skills AS (
    SELECT
        ms.id,
        ms.name,
        ms.author,
        ms.stars,
        r.source_type,
        r.priority,
        ROW_NUMBER() OVER (
            PARTITION BY ms.name, ms.author
            ORDER BY r.priority ASC, ms.discovered_at ASC
        ) as rn
    FROM marketplace_skills ms
    JOIN repositories r ON ms.repository_id = r.id
    WHERE r.enabled = 1
)
SELECT * FROM ranked_skills WHERE rn = 1;
```

---

## 五、业务架构设计

### 5.1 功能定位区分

```
┌─────────────────────────────────────────────────────────────────────┐
│                      功能定位区分                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  市场                                 来源管理（原仓库管理）            │
│  ────────────────────────────────         ────────────────────────  │
│  面向：所有用户                          面向：高级用户                │
│  频率：高频使用                          频率：低频配置                │
│                                                                     │
│  功能：                                功能：                        │
│  ✓ 浏览 Skills（只显示主来源）           ✓ 查看数据源列表              │
│  ✓ 搜索/筛选                            ✓ 添加/删除数据源              │
│  ✓ 查看 Skill 详情                      ✓ 查看扫描状态                │
│  ✓ 安装/卸载                            ✓ 触发重新扫描                │
│  ✓ 查看评分/安全报告                     ✓ 查看扫描历史                │
│                                        ✓ 配置扫描选项                │
│                                                                     │
│  入口：                                入口：                        │
│  - 首页标签                             - 侧边栏二级入口              │
│  - 侧边栏显眼位置                        - 市场的"管理来源"按钮         │
│                                                                     │
│  数据来源：                             管理：                        │
│  来自所有数据源（只显示主来源）            管理哪些数据源同步到市场       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 核心设计决策表

| 决策点 | 选择 | 理由 |
|--------|------|------|
| **市场展示范围** | 展示所有来源的 Skills（但只显示主来源） | 避免重复，同时保留灵活性 |
| **来源标记** | 清晰标注每个 Skill 的来源（徽章或仓库简称） | 透明度，帮助用户判断可信度 |
| **来源筛选** | 支持按来源筛选（官方/用户/全部） | 高级用户可以只看官方内容 |
| **仓库入口** | 从市场的"添加来源"进入 | 降低发现成本，明确关联 |
| **扫描触发** | 添加来源后自动扫描 + 支持手动刷新 | 减少操作步骤，提供控制权 |
| **命名** | "仓库管理" → "来源管理" | 更直观，降低理解成本 |
| **用户反馈** | Toast 提示，不强制跳转 | 减少打扰，用户自主选择 |
| **扫描策略** | 队列化，同时只扫描一个仓库 | 避免资源占用 |

---

## 六、用户旅程设计

### 6.1 场景 1：新用户首次使用

```
┌─────────────────────────────────────────────────────────────────────┐
│  场景：新用户首次使用 Skill Master                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  用户目标：发现并安装有用的 Skills                                    │
│                                                                     │
│  操作流程：                                                          │
│  ─────────────────────────────────────────────                       │
│  1. 打开应用 → 进入"市场"页面                                        │
│     ✓ 应用自动注入精选仓库（首次启动）                                │
│     ✓ 看到官方精选的 Skills（来自精选仓库，已预加载）                   │
│     ✓ 可以浏览分类、搜索                                             │
│                                                                     │
│  2. 浏览并查看 Skill 详情                                            │
│     ✓ 看到 Stars、Forks、安全评分                                    │
│     ✓ 看到来源徽章（标记为"官方精选"）                                │
│     ✓ 注意到即使同名 Skill，也只显示一个（主来源）                      │
│                                                                     │
│  3. 点击"安装"                                                       │
│     ✓ 系统执行安全扫描                                              │
│     ✓ 安装成功后 Toast 提示                                          │
│                                                                     │
│  4. 去侧边栏 → "我的 Skills"                                         │
│     ✓ 查看已安装的 Skills                                           │
│     ✓ 可以启用/禁用/卸载                                            │
│                                                                     │
│  预期结果：用户顺利完成首次安装，不需要了解"来源管理"                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 场景 2：用户想添加自己的仓库

```
┌─────────────────────────────────────────────────────────────────────┐
│  场景：用户想添加自己的 GitHub 仓库                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  用户目标：将自己的 Skills 仓库添加到应用中                             │
│                                                                     │
│  操作流程：                                                          │
│  ─────────────────────────────────────────────                       │
│  1. 在市场页面右上角，点击"添加自定义来源"按钮                         │
│     ✓ 打开添加来源对话框                                             │
│                                                                     │
│  2. 输入 GitHub 仓库 URL                                            │
│     例：https://github.com/user/my-skills                            │
│     ✓ 系统自动验证 URL 格式                                         │
│     ✓ 系统自动提取仓库名称                                          │
│                                                                     │
│  3. 点击"添加并扫描"                                                 │
│     ✓ 系统开始扫描（显示进度）                                       │
│     ✓ 扫描完成后 Toast："发现 12 个 Skills，已同步到市场"              │
│     ✓ 用户可以选择"立即查看"或继续浏览                                │
│                                                                     │
│  4. 用户选择"立即查看"                                               │
│     ✓ 市场自动筛选显示新来源的 Skills                                 │
│     ✓ 每个 Skill 标记"用户来源"徽章                                  │
│     ✓ 如果 Skill 与精选仓库重名，显示用户来源的版本（因为用户选择了筛选）│
│                                                                     │
│  5. 用户可以正常浏览和安装这些 Skills                                 │
│                                                                     │
│  预期结果：用户明确感知到"添加来源 → Skills 出现在市场"的因果关系        │
│          不会被强制跳转打断思路                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.3 场景 3：高级用户管理来源

```
┌─────────────────────────────────────────────────────────────────────┐
│  场景：高级用户想管理所有数据源                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  用户目标：查看和管理所有添加的数据源                                 │
│                                                                     │
│  操作流程：                                                          │
│  ─────────────────────────────────────────────                       │
│  1. 从侧边栏进入"来源管理"（原"仓库管理"）                            │
│     ✓ 看到所有数据源列表                                             │
│       - 精选仓库（只读，系统维护）                                    │
│       - 用户添加的仓库（可管理）                                      │
│                                                                     │
│  2. 查看每个数据源的状态                                             │
│     - 仓库名称和 URL                                                │
│     - 来源类型（官方精选/自定义）                                     │
│     - 最后扫描时间                                                  │
│     - 发现的 Skills 数量                                            │
│     - 扫描状态（成功/失败/进行中）                                   │
│     - 优先级（精选=10，用户=100）                                    │
│                                                                     │
│  3. 管理操作                                                        │
│     ✓ 点击"扫描"按钮 → 手动触发重新扫描                               │
│     ✓ 点击开关 → 启用/禁用来源                                       │
│     ✓ 点击删除 → 移除来源（相关未安装的 Skills 从市场移除）              │
│     ✓ 查看扫描历史日志                                               │
│                                                                     │
│  预期结果：高级用户拥有完整的控制权和可见性                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 七、技术实现要点

### 7.1 数据库设计

#### 7.1.1 核心表结构

```sql
-- ============================================
-- 表 1: 仓库表（数据源）
-- ============================================
CREATE TABLE repositories (
    -- 主键
    id TEXT PRIMARY KEY,

    -- 基本信息
    url TEXT UNIQUE NOT NULL,              -- GitHub 仓库 URL
    name TEXT NOT NULL,                    -- 仓库名称
    description TEXT,                      -- 仓库描述

    -- 来源类型和优先级
    source_type TEXT NOT NULL DEFAULT 'user',  -- 'featured' | 'user'
    priority INTEGER DEFAULT 100,          -- 优先级：精选=10, 用户=100

    -- 配置
    enabled INTEGER DEFAULT 1,             -- 是否启用
    scan_subdirs INTEGER DEFAULT 0,        -- 是否扫描子目录

    -- 扫描状态
    added_at INTEGER NOT NULL,             -- 添加时间
    last_scanned INTEGER,                  -- 最后扫描时间
    scan_status TEXT DEFAULT 'pending',    -- 'pending' | 'scanning' | 'success' | 'failed'
    scan_error TEXT,                       -- 扫描错误信息

    -- 缓存信息 (API 优化)
    etag TEXT,                             -- GitHub API ETag
    cache_path TEXT,                       -- 本地缓存路径
    cache_commit_sha TEXT,                 -- 缓存的 Commit SHA

    -- 元数据
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- 索引
CREATE INDEX idx_repos_source_type ON repositories(source_type);
CREATE INDEX idx_repos_priority ON repositories(priority);
CREATE INDEX idx_repos_enabled ON repositories(enabled);
CREATE INDEX idx_repos_scan_status ON repositories(scan_status);

-- ============================================
-- 表 2: 市场 Skills（统一的数据表）
-- ============================================
CREATE TABLE marketplace_skills (
    -- 主键
    id TEXT PRIMARY KEY,                   -- 格式：{repository_id}_{skill_path_hash}

    -- 基本信息
    name TEXT NOT NULL,                    -- Skill 名称
    description TEXT,                      -- Skill 描述
    author TEXT,                           -- 作者 (用于命名空间去重)

    -- 仓库路径信息
    skill_path TEXT NOT NULL,              -- 在仓库中的路径，如 "skills/weather-tool"
    repository_id TEXT NOT NULL,           -- 所属仓库

    -- 元数据（从 GitHub 获取）
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    updated_at INTEGER,                    -- 仓库最后更新时间

    -- 扩展信息
    tags TEXT,                             -- JSON 数组
    config_schema TEXT,                    -- JSON 对象

    -- 质量信息（可选）
    quality_score INTEGER,                 -- 质量评分（0-100）
    security_score INTEGER,                -- 安全评分

    -- 同步信息
    discovered_at INTEGER NOT NULL,        -- 发现时间
    synced_at INTEGER NOT NULL,            -- 同步时间

    -- 元数据
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),

    -- 外键约束（删除仓库时级联删除 Skills）
    FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,

    -- 唯一约束：同一仓库内路径唯一
    UNIQUE(repository_id, skill_path)
);

-- 索引
CREATE INDEX idx_market_skills_name_author ON marketplace_skills(name, author);
CREATE INDEX idx_market_skills_stars ON marketplace_skills(stars DESC);
CREATE INDEX idx_market_skills_repo ON marketplace_skills(repository_id);
CREATE INDEX idx_market_skills_quality ON marketplace_skills(quality_score DESC);

-- ============================================
-- 表 3: 已安装的 Skills
-- ============================================
CREATE TABLE installed_skills (
    -- 主键
    id TEXT PRIMARY KEY,

    -- 来源信息（快照模式：即使市场数据删除，此处仍保留完整信息）
    marketplace_skill_id TEXT,            -- 关联到 marketplace_skills (可能为空)

    -- 快照字段 (冗余存储，保证数据独立性)
    original_repository_id TEXT,
    original_repository_name TEXT,
    original_repository_url TEXT,
    original_skill_path TEXT,
    original_author TEXT,
    original_source_type TEXT,

    -- 基本信息
    name TEXT NOT NULL,
    local_path TEXT NOT NULL,             -- 本地安装路径

    -- 安装信息
    installed_at INTEGER NOT NULL,
    enabled INTEGER DEFAULT 1,            -- 是否启用

    -- 元数据
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),

    -- 外键设为 ON DELETE SET NULL，确保安装记录不随市场数据删除而丢失
    FOREIGN KEY (marketplace_skill_id) REFERENCES marketplace_skills(id) ON DELETE SET NULL
);

-- 索引
CREATE INDEX idx_installed_skills_name ON installed_skills(name);
CREATE INDEX idx_installed_skills_local_path ON installed_skills(local_path);
```

#### 7.1.2 视图定义

```sql
-- ============================================
-- 视图：市场 Skills 及其主来源
-- ============================================
CREATE VIEW v_marketplace_skills_with_source AS
SELECT DISTINCT
    -- Skill 基本信息
    ms.id,
    ms.name,
    ms.description,
    ms.author,
    ms.stars,
    ms.forks,
    ms.updated_at as skill_updated_at,
    ms.tags,
    ms.quality_score,
    ms.security_score,

    -- 来源信息
    ms.repository_id,
    r.name as repository_name,
    r.source_type,
    r.priority,
    ms.skill_path,
    ms.discovered_at,
    ms.synced_at
FROM marketplace_skills ms
JOIN repositories r ON ms.repository_id = r.id
WHERE r.enabled = 1
ORDER BY ms.stars DESC;
```

#### 7.1.3 主来源查询

```sql
-- 获取所有 Skills（只显示主来源）
WITH ranked_skills AS (
    SELECT
        ms.id,
        ms.name,
        ms.description,
        ms.stars,
        ms.forks,
        r.source_type,
        r.priority,
        ROW_NUMBER() OVER (
            PARTITION BY ms.name
            ORDER BY r.priority ASC, ms.discovered_at ASC
        ) as rn
    FROM marketplace_skills ms
    JOIN repositories r ON ms.repository_id = r.id
    WHERE r.enabled = 1
)
SELECT * FROM ranked_skills WHERE rn = 1
ORDER BY stars DESC;
```

### 7.2 精选仓库注入方案

#### 7.2.1 SQL 注入脚本

**文件：`src-tauri/scripts/seed-featured-repos.sql`**

```sql
-- ============================================
-- 精选仓库注入脚本
-- ============================================
-- 用途：应用首次启动或数据库初始化时，注入精选仓库
-- 执行：sqlite3 skills-manager.db < seed-featured-repos.sql
-- ============================================

-- 插入精选仓库（示例）
INSERT OR IGNORE INTO repositories (id, url, name, description, source_type, priority, enabled, added_at)
VALUES
(
    'featured-official-1',
    'https://github.com/anthropics/anthropic-skills',
    'Anthropic Official Skills',
    'Official Claude Skills maintained by Anthropic',
    'featured',
    10,                                 -- 最高优先级
    1,                                  -- 默认启用
    strftime('%s', 'now')
),
(
    'featured-community-1',
    'https://github.com/claude-code/community-skills',
    'Community Skills',
    'Curated collection of community-contributed skills',
    'featured',
    10,
    1,
    strftime('%s', 'now')
);

-- 验证插入
SELECT
    id,
    name,
    source_type,
    priority,
    enabled
FROM repositories
WHERE source_type = 'featured';
```

#### 7.2.2 Rust 注入函数

**文件：`src-tauri/src/services/featured_repository_seeder.rs`**

```rust
use anyhow::Result;
use chrono::Utc;
use crate::services::db::get_connection;

/// 精选仓库定义
struct FeaturedRepository {
    id: &'static str,
    url: &'static str,
    name: &'static str,
    description: &'static str,
}

/// 内置的精选仓库列表
const FEATURED_REPOSITORIES: &[FeaturedRepository] = &[
    FeaturedRepository {
        id: "featured-official-1",
        url: "https://github.com/anthropics/anthropic-skills",
        name: "Anthropic Official Skills",
        description: "Official Claude Skills maintained by Anthropic",
    },
    FeaturedRepository {
        id: "featured-community-1",
        url: "https://github.com/claude-code/community-skills",
        name: "Community Skills",
        description: "Curated collection of community-contributed skills",
    },
    // ... 更多精选仓库
];

/// 注入精选仓库到数据库
pub fn seed_featured_repositories() -> Result<()> {
    let conn = get_connection()?;

    // 检查是否已存在精选仓库
    let count: i32 = conn.query_row(
        "SELECT COUNT(*) FROM repositories WHERE source_type = 'featured'",
        [],
        |row| row.get(0)
    )?;

    // 如果已存在，跳过
    if count > 0 {
        log::info!("Featured repositories already exist, skipping seed");
        return Ok(());
    }

    // 插入精选仓库
    let tx = conn.unchecked_transaction()?;

    for repo in FEATURED_REPOSITORIES {
        tx.execute(
            "INSERT OR IGNORE INTO repositories
             (id, url, name, description, source_type, priority, enabled, added_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                repo.id,
                repo.url,
                repo.name,
                repo.description,
                "featured",
                10i32,        // 优先级
                1i32,         // 启用
                Utc::now().timestamp_millis(),
            ],
        )?;
    }

    tx.commit()?;

    log::info!("Seeded {} featured repositories", FEATURED_REPOSITORIES.len());

    Ok(())
}
```

#### 7.2.3 在应用启动时调用

**文件：`src-tauri/src/lib.rs`**

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // 初始化数据库
            crate::services::db::init_db()?;

            // 注入精选仓库（如果不存在）
            crate::services::featured_repository_seeder::seed_featured_repositories()?;

            // 其他初始化...

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### 7.3 后端服务改造

#### 7.3.1 RepositoryService 增强

**新增/修改方法：**

```rust
impl RepositoryService {
    /// 扫描仓库并同步到市场
    pub fn scan_and_sync_to_marketplace(&self, repo_id: &str) -> Result<ScanResult> {
        // 1. 扫描仓库，发现 Skills
        let skills = self.scan_repository(repo_id)?;

        // 2. 同步到 marketplace_skills 表
        for skill in skills {
            // ID 使用下划线
            let skill_id = format!("{}_{}", repo_id, hash(&skill.path));

            // 插入或更新
            let market_skill = MarketplaceSkill {
                id: skill_id.clone(),
                name: skill.name,
                description: skill.description,
                skill_path: skill.path,
                repository_id: repo_id.to_string(),
                discovered_at: Utc::now().timestamp_millis(),
                synced_at: Utc::now().timestamp_millis(),
                // ... 其他字段
            };

            MarketplaceService::new().upsert_skill(&market_skill)?;
        }

        Ok(ScanResult {
            total: skills.len(),
            success: skills.len(),
            // ...
        })
    }

    /// 删除仓库（CASCADE 自动删除关联的 Skills）
    pub fn delete_repository(&self, id: &str) -> Result<u64> {
        let conn = get_connection()?;

        // CASCADE 会自动删除 marketplace_skills 中关联的记录
        let deleted = conn.execute(
            "DELETE FROM repositories WHERE id = ?1",
            params![id],
        )?;

        Ok(deleted as u64)
    }
}
```

#### 7.3.2 MarketplaceService 增强

**新增方法：**

```rust
impl MarketplaceService {
    /// 获取所有 Skills（只显示主来源）
    pub fn list_primary_skills(&self, limit: Option<usize>) -> Result<Vec<MarketplaceSkillDTO>> {
        let conn = get_connection()?;
        let max_limit = limit.unwrap_or(100);

        // CTE 查询：按名称分组，取优先级最高的
        let sql = r#"
            WITH ranked_skills AS (
                SELECT
                    ms.id,
                    ms.name,
                    ms.description,
                    ms.author,
                    ms.stars,
                    ms.forks,
                    ms.repository_id,
                    r.name as repository_name,
                    r.source_type,
                    r.priority,
                    ROW_NUMBER() OVER (
                        PARTITION BY ms.name, ms.author
                        ORDER BY r.priority ASC, ms.discovered_at ASC
                    ) as rn
                FROM marketplace_skills ms
                JOIN repositories r ON ms.repository_id = r.id
                WHERE r.enabled = 1
            )
            SELECT
                id, name, description, stars, forks,
                repository_id, repository_name, source_type
            FROM ranked_skills
            WHERE rn = 1
            ORDER BY stars DESC
            LIMIT ?
        "#;

        // 执行查询...

        Ok(skills)
    }

    /// 按来源筛选
    pub fn list_skills_by_source(
        &self,
        source_type: Option<SourceType>,
        limit: Option<usize>
    ) -> Result<Vec<MarketplaceSkillDTO>> {
        // 类似的查询，添加 WHERE source_type = ? 条件
    }
}
```

### 7.4 前端改造

#### 7.4.1 类型定义更新

**文件：`src/types/marketplace.ts`**

```typescript
export type SourceType = 'featured' | 'user';

export interface MarketplaceSkillDTO {
  // 基本信息
  id: string;
  name: string;
  description?: string;
  author?: string;

  // 元数据
  stars: number;
  forks: number;
  updated_at?: number;
  tags?: string[];
  quality_score?: number;
  security_score?: number;

  // 来源信息
  repository_id: string;
  repository_name: string;
  source_type: SourceType;
  priority: number;
  skill_path: string;
}

// 筛选参数
export interface MarketplaceFilter {
  source_type?: 'featured' | 'user' | 'all';
  min_quality?: number;
  min_stars?: number;
  tags?: string[];
  search_query?: string;
}
```

#### 7.4.2 UI 组件改造

**新增功能：**

1. **来源徽章**
   ```typescript
   // 显示示例
   <Badge variant={source_type === 'featured' ? 'primary' : 'secondary'}>
     {repository_name} ⭐
   </Badge>
   ```

2. **来源筛选**
   ```typescript
   // 筛选选项
   <FilterGroup label="来源">
     <FilterOption value="all">全部</FilterOption>
     <FilterOption value="featured">官方精选</FilterOption>
     <FilterOption value="user">自定义</FilterOption>
   </FilterGroup>
   ```

3. **Toast 提示（不强制跳转）**
   ```typescript
   toast.success(`发现 ${count} 个 Skills，已同步到市场`, {
     action: {
       label: '立即查看',
       onClick: () => navigateToMarketplace(repoId)
     }
   });
   ```

### 7.5 Tauri Commands

**新增/修改的 Commands：**

```typescript
// 获取市场 Skills（只显示主来源）
list_marketplace_skills(
  source_filter?: 'featured' | 'user' | 'all',
  limit?: number
): Promise<MarketplaceSkillDTO[]>

// 扫描仓库并同步到市场
scan_repository_to_marketplace(repoId: string): Promise<ScanResult>

// 删除仓库（CASCADE 自动删除关联 Skills）
delete_repository_with_skills(repoId: string): Promise<DeleteResult>
```

---

## 八、任务清单

### 8.1 后端任务

#### 阶段一：数据库改造 (2天)

- [ ] **Task 1.1**: 创建数据库迁移脚本
  - 添加 `repositories.source_type`, `priority`, `scan_status`, `etag` 字段
  - 创建 `marketplace_skills` 表（使用新结构和 `{repo_id}_{hash}` ID 格式）
  - 修改 `installed_skills` 表结构（移除强约束，添加快照字段）
  - 添加外键约束 `ON DELETE CASCADE` (marketplace) 和 `ON DELETE SET NULL` (installed)
  - 创建索引（包含 name+author 复合索引）
  - 创建视图 `v_marketplace_skills_with_source`

- [ ] **Task 1.2**: 数据迁移
  - 迁移现有的 `repositories` 数据
  - 迁移现有的 `marketplace_skills` 数据（如果有）
  - 迁移 `installed_skills` 数据（填充快照字段）
  - 验证数据完整性

- [ ] **Task 1.3**: 更新数据模型
  - 修改 `Repository` 结构体
  - 修改 `MarketplaceSkill` 结构体
  - 添加 `MarketplaceSkillDTO` 结构体
  - 添加 `SourceType` 枚举

#### 阶段二：精选仓库注入 (1天)

- [ ] **Task 2.1**: 创建精选仓库列表
  - 定义精选仓库配置
  - 准备精选仓库数据

- [ ] **Task 2.2**: 实现 Rust 注入函数
  - 创建 `featured_repository_seeder.rs`
  - 实现 `seed_featured_repositories()` 函数
  - 添加日志输出

- [ ] **Task 2.3**: 集成到应用启动流程
  - 修改 `lib.rs`
  - 在数据库初始化后调用注入函数
  - 测试首次启动和重复启动场景

- [ ] **Task 2.4**: 创建 SQL 注入脚本
  - 编写 `seed-featured-repos.sql`
  - 添加文档说明使用方法

#### 阶段三：服务层改造 (3-4天)

- [ ] **Task 3.1**: RepositoryService 增强
  - 修改 `scan_repository()` 方法
  - 实现 `scan_and_sync_to_marketplace()` 方法
  - 修改 `delete_repository()` 方法（利用 CASCADE）
  - 测试删除逻辑（已安装 Skills 保留）

- [ ] **Task 3.2**: MarketplaceService 重构
  - 实现 `list_primary_skills()` 方法（使用 CTE）
  - 实现 `list_skills_by_source()` 方法
  - 修改 `upsert_skill()` 方法
  - 实现主来源查询逻辑

- [ ] **Task 3.3**: 后台同步任务（可选，未来版本）
  - 设计同步任务调度器
  - 实现定时同步逻辑
  - 实现手动同步逻辑

#### 阶段四：API 层改造 (2天)

- [ ] **Task 4.1**: 修改现有 Commands
  - 修改 `add_repository` - 添加后自动扫描并同步
  - 修改 `scan_repository` - 调用新的同步方法
  - 更新返回值类型

- [ ] **Task 4.2**: 新增 Tauri Commands
  - `list_marketplace_skills` - 支持来源筛选
  - `scan_repository_to_marketplace`
  - `delete_repository_with_skills`

- [ ] **Task 4.3**: 错误处理和日志
  - 统一错误码
  - 添加详细日志
  - 错误消息国际化
  - **API 限流处理**：检测 403/429 错误，提示用户配置 Token

### 8.2 前端任务

#### 阶段五：类型和工具函数 (1天)

- [ ] **Task 5.1**: 更新 TypeScript 类型定义
  - 更新 `MarketplaceSkillDTO`
  - 添加 `SourceType` 类型
  - 更新 `Repository` 类型
  - 添加 `MarketplaceFilter` 类型

- [ ] **Task 5.2**: 更新 Hooks
  - 修改 `useMarketplaceSkills` Hook（支持来源筛选）
  - 修改 `useRepositories` Hook
  - 添加 `useSourceSync` Hook

#### 阶段六：UI 组件改造 (3-4天)

- [ ] **Task 6.1**: SkillCard 组件增强
  - 添加来源徽章显示
  - 支持不同徽章样式（官方/用户）
  - 显示仓库名称或简称

- [ ] **Task 6.2**: FilterPanel 组件增强
  - 添加"来源"筛选选项
  - 支持多选：官方/用户/全部

- [ ] **Task 6.3**: Marketplace 页面改造
  - 添加"添加自定义来源"按钮
  - 集成来源筛选功能
  - 优化操作反馈（Toast，不强制跳转）
  - 添加来源徽章显示

- [ ] **Task 6.4**: Repositories 页面重构为 Sources
  - 重命名路由和页面标题
  - 调整 UI 布局和文案
  - 区分官方来源和自定义来源（只读 vs 可编辑）
  - 显示优先级信息
  - 优化操作流程
  - **Token 配置引导**：显眼位置提示配置 GitHub Token 以提高限流阈值

- [ ] **Task 6.5**: 添加来源对话框
  - 扫描进度显示
  - Toast 提示（不强制跳转）
  - 成功后的操作选项

#### 阶段七：路由和导航 (1天)

- [ ] **Task 7.1**: 路由调整
  - `/repositories` → `/sources`
  - 更新路由配置

- [ ] **Task 7.2**: 侧边栏导航
  - 更新菜单项标题和图标
  - 调整菜单层级

#### 阶段八：国际化 (1天)

- [ ] **Task 8.1**: 更新中文翻译
  - 添加新的翻译键
  - 修改现有翻译（仓库 → 来源）

- [ ] **Task 8.2**: 更新英文翻译
  - 添加新的翻译键
  - 修改现有翻译

### 8.3 测试任务

#### 阶段九：测试 (2-3天)

- [ ] **Task 9.1**: 后端单元测试
  - RepositoryService 测试
  - MarketplaceService 测试
  - 主来源查询逻辑测试
  - CASCADE 删除测试

- [ ] **Task 9.2**: 前端单元测试
  - Hook 测试
  - 组件测试

- [ ] **Task 9.3**: 集成测试
  - 添加来源 → 扫描 → 市场显示（主来源）
  - 删除来源 → Skills 移除（CASCADE）
  - 来源筛选功能
  - 同名 Skills 只显示主来源

- [ ] **Task 9.4**: E2E 测试
  - 用户旅程测试
  - 边界情况测试
  - 性能测试

### 8.4 文档和发布

#### 阶段十：文档和发布 (1-2天)

- [ ] **Task 10.1**: 更新用户文档
  - 功能说明
  - 用户指南
  - FAQ

- [ ] **Task 10.2**: 更新开发者文档
  - API 文档
  - 数据库设计文档
  - 架构说明

- [ ] **Task 10.3**: 编写发布说明
  - 新功能介绍
  - 改进说明
  - 已知问题

---

## 九、验收标准

### 9.1 功能验收

#### 核心 E2E 流程

**场景 1：精选仓库自动注入和显示**

```
Given 用户首次启动应用
When 应用初始化数据库
Then 自动注入精选仓库到数据库
And 精选仓库自动标记为 source_type='featured'
And 精选仓库的 priority=10
When 用户打开市场页面
Then 看到来自精选仓库的 Skills
And 每个 Skill 显示"官方精选"徽章
```

**场景 2：添加用户仓库并查看 Skills**

```
Given 用户在市场页面
When 点击"添加自定义来源"按钮
And 输入有效的 GitHub 仓库 URL
And 点击"添加并扫描"
Then 系统开始扫描并显示进度
And 扫描完成后 Toast 提示"发现 N 个 Skills，已同步到市场"
And 用户可以选择"立即查看"或继续浏览
When 用户选择"立即查看"
Then 市场筛选显示新来源的 Skills
And 每个 Skill 显示"用户来源"徽章
And Skill ID 格式为 {repository_id}_{skill_path_hash}
```

**场景 3：同名 Skills 去重逻辑**

```
Given 存在两个同名 Skill "weather-tool"
And 它们的作者不同 (Author A vs Author B)
When 用户打开市场页面
Then 看到两个 "weather-tool"
And 分别显示不同的作者

Given 存在两个同名 Skill "weather-tool"
And 它们的作者相同 (Author A)
And 一个来自精选仓库 (priority=10)，一个来自用户仓库 (priority=100)
When 用户打开市场页面
Then 只看到一个 "weather-tool"
And 显示的是来自精选仓库的版本
```

**场景 4：删除来源的影响**

```
Given 用户添加了一个来源
And 该来源发现了 10 个 Skills
And 其中 3 个已被用户安装 (installed_skills 有快照)
When 用户删除该来源
Then 该来源从列表中移除
And 未安装的 7 个 Skills 从市场移除（CASCADE）
And 已安装的 3 个 Skills 保留
And installed_skills 中的 marketplace_skill_id 变为 NULL
And 快照信息确保显示正常
When 用户在市场搜索
Then 搜索不到已删除来源的未安装 Skills
And 已安装的 Skills 仍在"我的 Skills"中
```

**场景 5：筛选来源**

```
Given 用户在市场页面
And 已添加多个来源（官方 + 用户）
When 点击"筛选"按钮
And 选择"只显示官方精选"
Then 只显示来自精选仓库的 Skills（主来源）
When 选择"只显示自定义来源"
Then 只显示来自用户仓库的 Skills（主来源）
When 选择"全部来源"
Then 显示所有 Skills（每个 Skill 只显示主来源）
```

### 9.2 性能验收

| 指标 | 目标 | 说明 |
|------|------|------|
| **添加来源后扫描时间** | < 30 秒 | 小型仓库（< 50 Skills） |
| **市场页面加载时间** | < 1 秒 | 100 个 Skills（只显示主来源） |
| **来源筛选响应时间** | < 500ms | 使用索引优化 |
| **数据库查询性能** | < 100ms | 主来源查询（CTE） |
| **删除仓库时间** | < 1 秒 | CASCADE 自动删除 |

### 9.3 兼容性验收

- [ ] **向后兼容**：现有的精选仓库数据正常显示
- [ ] **向后兼容**：已安装的 Skills 不受影响
- [ ] **数据迁移**：迁移脚本正确执行，无数据丢失
- [ ] **API 兼容**：旧版本的 API 调用仍然有效（或提供迁移路径）
- [ ] **开发工具**：`import_marketplace_from_json` 仍可用于开发

### 9.4 数据一致性验收

- [ ] **Skill ID 唯一性**：所有 Skill ID 符合 `{repository_id}_{skill_path_hash}` 格式
- [ ] **CASCADE 删除**：删除仓库时，关联的未安装 Skills 自动删除
- [ ] **命名空间去重**：同名同作者 Skill 显示主来源，同名不同作者 Skill 同时显示
- [ ] **优先级正确性**：精选仓库优先级高于用户仓库
- [ ] **已安装 Skills 保护**：删除仓库不影响已安装的 Skills（快照验证）
- [ ] **API 缓存**：重复扫描未变更的仓库不消耗 API 配额（验证 ETag）

### 9.5 用户体验验收

| 方面 | 验收标准 |
|------|----------|
| **清晰度** | 用户理解"来源"和"市场"的关系 |
| **反馈** | 每个操作都有明确的 Toast 提示 |
| **不打扰** | 不会强制跳转，用户可以自主选择 |
| **引导** | 添加来源后有清晰的下一步引导 |
| **错误处理** | 错误信息友好，可操作 |
| **来源标识** | 每个 Skill 清晰标注来源（徽章或仓库名） |

### 9.6 国际化验收

- [ ] 所有文本支持中英文切换
- [ ] 无硬编码文本
- [ ] 日期和数字格式本地化
- [ ] 翻译准确无误

---

## 附录

### A. 术语表

| 术语 | 定义 |
|------|------|
| **市场** | 应用内展示和安装 Skills 的唯一入口 |
| **来源** | Skills 的数据来源，可以是 GitHub 仓库 |
| **来源管理** | 管理 Skills 数据来源的功能模块（原"仓库管理"） |
| **精选仓库** | 官方维护的优质 Skills 仓库（priority=10） |
| **用户仓库** | 用户自己添加的自定义仓库（priority=100） |
| **主来源** | 同名 Skill 中优先级最高的来源 |
| **同步** | 将来源中的 Skills 元数据同步到市场数据库 |
| **扫描** | 分析仓库内容，发现 Skills 的过程 |

### B. 参考资料

- [当前架构文档](./CLAUDE.md)
- [数据库设计文档](./docs/database-schema.md)
- [API 文档](./docs/api-reference.md)

### C. 未来版本规划

**未来版本可能的功能：**

1. **去重视图**：合并同名 Skills 的所有版本，让用户选择
2. **版本管理**：支持同一 Skill 的多个版本共存
3. **高级统计**：来源贡献度分析、Skill 流行度趋势
4. **本地文件夹来源**：支持从本地文件夹导入 Skills
5. **包文件来源**：支持从 .zip 包导入 Skills

### D. 变更历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2025-01-28 | 初始版本 | Claude |
| v2.0 | 2025-01-28 | 明确数据库方案为关联表模式；更新主来源实现；添加精选仓库注入方案；明确 MVP 功能范围 | Claude |
| v2.1 | 2025-01-28 | 优化数据一致性（快照字段）；改进去重逻辑（引入 Namespace）；增强 API 限流处理；优化 ID 格式 | Claude |

---

**文档结束**
