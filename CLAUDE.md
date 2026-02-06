# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Skill Master 是一个用于管理 Claude Code Skills 的桌面应用程序，使用 Tauri v2（Rust 后端）和 React 19（前端）构建。

### 核心功能
- **我的 Skills**：扫描和管理已安装的系统级/项目级 Skills，支持查看质量评分和安全状态
- **Skill 市场**：浏览和安装来自 GitHub 的开源 Skills，支持实时导入进度显示
- **Skill 导入**：支持从 GitHub 仓库、本地文件夹、包文件或分享图片导入，智能识别多 Skill 仓库
- **Skill 分享** 🎉：生成分享文本和图片卡片，支持二维码生成和从图片导入，包导出/导入功能
- **安全扫描**：检测 Skills 中的安全风险，支持三种扫描模式和白名单管理
- **扫描历史**：查看历史扫描记录，支持搜索、筛选和导出功能
- **安全中心**：集中管理和监控所有 Skills 的安全状态
- **Skill 质量评分**：基于内容质量、技术实现、维护性和用户体验的 100 分制评分系统
- **项目路径配置**：自定义多个项目路径以扫描项目级 Skills

### 最新特性 (v2.5.0)
- 🎉 **Skill 分享功能** (Phase 1-5)：
  - **Phase 1**: 基础分享功能（文本分享、分享对话框）
  - **Phase 2**: 图片分享功能（多主题卡片、二维码生成）
  - **Phase 3**: 从分享图片导入 Skill（QR 码识别、数据解析）
  - **Phase 4**: 检测修改的 Skill（持久化 GitHub 元数据）
  - **Phase 5**: Skill 包导出/导入（.zip 文件、离线分享）
- 🎨 **市场导入进度显示**: 实时进度条提升用户体验
- 🔧 **规范化 Skill 提取**: 智能识别和提取多 Skill 仓库
- 🛡️ **容错能力增强**: 支持无效 frontmatter 的 Skill
- 🎨 **UI/UX 持续优化**: 设计系统统一，组件库完善

### 最新特性 (v2.6.0) - Share-First 生态
- 🚀 **统一分享入口 (ShareSheet)**：
  - 整合所有分享功能为单一入口
  - 支持 4 种分享方式：链接、文本、图片、包导出
  - `useShare` Hook 统一管理分享逻辑
- 🔗 **分享链接系统**：
  - 生成/解析分享链接
  - 分享预览页面 (`/share/:shareId`)
  - 安全等级显示和一键安装
  - 支持系统级和项目级安装
  - 实时进度显示和任务集成
  - URL 验证和边界情况处理

## 开发命令

### 前端开发
```bash
npm run dev                # 启动 Vite 开发服务器
npm run build             # 构建前端（TypeScript + Vite）
npm run lint              # 运行 ESLint 检查代码质量
npm run test              # 运行 Vitest 测试（watch 模式）
npm run test:run          # 运行测试（单次）
npm run test:ui           # 启动测试 UI
npm run test:coverage     # 生成覆盖率报告
```

### Tauri 桌面应用
```bash
npm run tauri:dev         # 同时启动 Vite 和 Tauri 开发模式
npm run tauri:build       # 构建生产环境应用
npm run tauri:build:windows   # Windows 平台构建
npm run tauri:build:mac       # macOS (Apple Silicon) 构建
```

### Rust 后端
```bash
cd src-tauri
cargo check               # 检查 Rust 代码
cargo test                # 运行 Rust 测试
cargo clippy              # Rust lint 检查
```

## 架构

### 前端架构
- **状态管理**：TanStack Query (for server state)
  - `src/hooks/useSkills.ts` - 核心数据 Hooks
- **路由**：React Router v7（位于 `src/App.tsx`）
- **UI 组件**：Tailwind CSS 3.4 + DaisyUI 5.5
- **主要页面**：
  - `src/pages/MySkills.tsx` - 已安装 Skills 管理，集成质量评分和安全扫描，支持分享功能
  - `src/pages/Marketplace.tsx` - Skill 市场
  - `src/pages/Settings.tsx` - 项目路径配置
  - `src/pages/Security.tsx` - 安全中心，监控所有 Skills 安全状态
  - `src/pages/ScanHistory.tsx` - 扫描历史记录，支持搜索、筛选和导出
  - `src/pages/Dashboard.tsx` - 仪表板概览
- **分享功能组件**：
  - `src/components/ShareSheet/` - 统一分享入口组件 (v2.6.0)
    - `ShareSheet.tsx` - 主组件，整合 4 种分享方式
    - `ShareTextPanel.tsx` - 文本分享面板
    - `ShareImagePanel.tsx` - 图片分享面板
    - `SharePackagePanel.tsx` - 包导出面板
  - `src/components/ShareTextDialog.tsx` - 文本分享对话框（旧版）
  - `src/components/ShareImageDialog.tsx` - 图片分享对话框（旧版）
  - `src/utils/shareTextGenerator.ts` - 分享文本生成器（支持多平台）
  - `src/utils/shareCardGenerator.ts` - 分享卡片生成器（生成 PNG 图片）
  - `src/utils/shareLink.ts` - 分享链接工具（生成、解析、编码）
  - `src/hooks/useShare.ts` - 统一分享逻辑 Hook (v2.6.0)
  - `src/pages/SharePreview.tsx` - 分享预览页面 (v2.6.0)
- **分享功能类型**：`src/types/share.ts` - 包含所有分享相关的 TypeScript 类型定义

### 后端架构（Tauri + Rust）
- **入口点**：`src-tauri/src/lib.rs`
- **Tauri Commands**：通过 `invoke()` 函数从前端调用
- **模块组织**：
  - `src-tauri/src/commands/` - Tauri 命令模块
    - `analyzer.rs` - Skill 质量评分命令
    - `security.rs` - 安全扫描命令（含白名单、扫描历史）
    - `cache.rs` - 缓存管理命令
  - `src-tauri/src/analyzer/` - Skill 质量评分系统（已完成）
  - `src-tauri/src/security/` - 安全扫描引擎
  - `src-tauri/src/services/` - 业务逻辑服务层
    - `whitelist_service.rs` - 白名单管理
    - `scan_history.rs` - 扫描历史记录

### Tauri Commands 列表

#### 核心功能命令（src-tauri/src/lib.rs）
- `scan_skills` - 扫描本地 Skills（扫描深度：6 层）
- `import_github_skill` - 从 GitHub 导入（支持多 Skill 提取和批量安全扫描）
- `uninstall_skill` - 卸载 Skill
- `import_local_skill` - 从本地导入
- `get_project_paths` - 获取项目路径配置
- `save_project_paths` - 保存项目路径
- `open_url` - 在系统浏览器打开 URL
- `read_skill` - 读取 SKILL.md 内容

**v2.2.0 新增特性**:
- `extract_skill_dirs()` - 智能识别和提取仓库中的 Skill 目录
- 导入时支持批量安全扫描和独立阻塞处理
- 容错处理：支持解析无效的 Skill frontmatter

**v2.5.0 新增特性（分享功能）**:
- `calculate_skill_checksum` - 计算 Skill 目录的 SHA-256 校验和（用于检测修改）
- `export_skill_package` - 将 Skill 打包为 `.zip` 文件（包含元数据和可选的依赖）
- `import_skill_package` - 从 `.zip` 包文件导入 Skill（验证格式和安全性）
- `export_collection_package` - 导出收藏集合为 `.collection.zip`（新增）

**v2.6.0 新增特性（分享链接系统）**:
- `generate_share_link` - 生成分享链接（返回 share_id）
- `resolve_share_link` - 解析分享链接（返回 ShareRecord）
- `import_github_skill_with_progress` - 从 GitHub 导入 Skill（带进度跟踪）
- `get_git_remote_url` - 获取本地仓库的远程 URL

> **注意**：QR 码识别由前端使用 `jsQR` 库直接处理，无需后端命令。

#### 仓库管理命令（src-tauri/src/commands/repository.rs）
- `get_repositories` - 获取所有仓库列表
- `get_repository` - 获取单个仓库详情
- `add_repository` - 添加新仓库
- `delete_repository` - 删除仓库
- `toggle_repository_enabled` - 启用/禁用仓库
- `get_featured_repositories` - 获取官方精选仓库
- `refresh_featured_repositories` - 刷新精选仓库数据
- `get_unscanned_repositories` - 获取未扫描的仓库列表
- `get_repository_stats` - 获取仓库统计信息
- `scan_repository_with_progress` - 扫描仓库（带进度）

#### 市场管理命令（src-tauri/src/commands/marketplace.rs）
- `search_marketplace_skills` - 搜索市场 Skills
- `list_marketplace_skills` - 列出市场 Skills（分页）
- `list_marketplace_skills_by_source` - 按来源列出 Skills
- `get_marketplace_skill` - 获取单个市场 Skill
- `upsert_marketplace_skill` - 创建或更新市场 Skill
- `delete_marketplace_skill` - 删除市场 Skill
- `get_marketplace_stats` - 获取市场统计信息
- `clear_marketplace_skills` - 清空市场数据
- `import_marketplace_from_json` - 从 JSON 导入市场数据

#### 收藏管理命令（src-tauri/src/commands/collection.rs）
- `get_collections` - 获取所有收藏列表
- `get_collection` - 获取单个收藏详情
- `create_collection` - 创建新收藏
- `update_collection` - 更新收藏信息
- `delete_collection` - 删除收藏
- `add_skill_to_collection` - 添加 Skill 到收藏
- `remove_skill_from_collection` - 从收藏移除 Skill
- `export_collection_package` - 导出收藏集合为 .collection.zip

#### 分支管理命令（src-tauri/src/commands/fork.rs）
- `fork_skill` - Fork Skill 到本地或组织
- `get_skill_lineage` - 获取 Skill 谱系信息
- `get_fork_info` - 获取分支信息
- `get_fork_stats` - 获取分支统计信息

#### 发布管理命令（src-tauri/src/commands/publish.rs）
- `run_publish_preflight` - 运行发布前检查
- `publish_skill` - 发布 Skill 到市场
- `get_publish_history` - 获取发布历史
- `delete_publish_record` - 删除发布记录

#### 创作者管理命令（src-tauri/src/commands/creator.rs）
- `get_creator_profile` - 获取创作者档案
- `get_creator_skills` - 获取创作者发布的 Skills

#### 任务管理命令（src-tauri/src/commands/task.rs）
- `get_tasks` - 获取所有任务列表
- `get_task` - 获取单个任务详情
- `cancel_task` - 取消任务
- `cleanup_tasks` - 清理已完成的任务

#### Share Link 相关命令（src-tauri/src/commands/share.rs）

#### Skill 质量评分命令（src-tauri/src/commands/analyzer.rs）
- `analyze_skill_quality` - 分析单个 Skill 质量
- `batch_analyze_skills` - 批量分析 Skills（返回 Vec<Option<SkillScore>>）
- `batch_analyze_skills_detailed` - 批量分析 Skills（返回详细结果含错误信息）

#### 安全扫描命令（src-tauri/src/commands/security.rs）
- `scan_skill_security` - 扫描单个 Skill 安全性
- `batch_scan_skills` - 批量扫描 Skills
- `scan_skill_security_incremental` - 增量扫描（支持智能缓存）
- `batch_scan_skills_incremental` - 批量增量扫描
- `get_security_config` - 获取安全配置（扫描模式等）
- `update_security_config` - 更新安全配置
- `get_scan_history` - 获取扫描历史记录
- `add_whitelist_entry` - 添加白名单条目
- `remove_whitelist_entry` - 移除白名单条目
- `get_whitelist` - 获取白名单列表

#### 缓存管理命令（src-tauri/src/commands/cache.rs）
- `get_cache_stats` - 获取缓存统计信息
- `clear_cache` - 清除缓存

## Skill 目录结构

### 系统级 Skills
- **Windows**: `C:\Users\[用户名]\.claude\skills`
- **macOS/Linux**: `~/.claude/skills`

### 项目级 Skills
配置项目根目录后，系统自动扫描：
```
[项目根目录]/.claude/skills/
```

### Skill 格式要求
每个 Skill 必须包含 `SKILL.md` 文件，格式如下：
```markdown
---
name: skill-name
description: Skill description
author: Your Name
version: 1.0.0
---

# Skill Instructions

Your skill content here...
```

## 类型定义

前端 TypeScript 类型定义在 `src/types/index.ts`：
- `MarketplaceSkill` - 市场 Skill 接口
- `InstalledSkill` - 已安装 Skill 接口
- `SkillManifest` - Skill 清单接口

前端评分相关类型定义在 `src/types/scorer.ts`：
- `SkillScore` - 评分结果接口
- `ScoreMetadata` - 评分元数据接口
- `BatchAnalysisResult` - 批量分析结果接口
- `AnalysisError` - 分析错误接口

前端安全相关类型定义在 `src/types/security.ts`：
- `SecurityReport` - 安全扫描报告接口
- `SecurityLevel` - 安全等级类型
- `ScanRecord` - 扫描历史记录接口
- `WhitelistEntry` - 白名单条目接口

前端分享相关类型定义在 `src/types/share.ts`：
- `ShareMetadata` - 分享元数据接口（包含 `source_url` 字段）
- `ShareRecord` - 分享记录接口（后端返回）
- `ShareLink` - 分享链接接口
- `ParsedShareLink` - 解析后的分享链接接口
- `SharePreviewStatus` - 分享预览页面状态类型
- `SharePlatform` - 分享平台类型
- `ShareCardTheme` - 分享卡片主题类型
- `ShareImageData` - 分享图片嵌入数据接口
- `ExportResult` - 包导出结果接口
- `ExportStatus` - 包导出状态类型
- `UseShareReturn` - `useShare` Hook 返回值接口

## Share Link 工作流程 (v2.6.0)

### 生成分享链接

1. **用户操作**：在"我的 Skills"页面点击"分享"按钮
2. **调用 Hook**：`useShare(skill)` 自动生成分享链接
3. **后端处理**：
   - 调用 `generate_share_link` 命令
   - 解析 Skill 元数据（name, description, version, author, source_url）
   - 将元数据存储到数据库
   - 生成唯一的 `share_id`
4. **返回链接**：`{origin}/share/{share_id}`
5. **复制到剪贴板**：用户可分享链接

### 解析和安装

1. **访问链接**：用户打开分享链接 `/share/:shareId`
2. **解析链接**：`parseShareLink(shareId)` 验证格式
3. **获取数据**：调用 `resolve_share_link(shareId)` 获取 ShareRecord
4. **显示预览**：`SharePreview.tsx` 渲染 Skill 信息
5. **URL 验证**：
   - 检查 `source_url` 是否存在
   - 验证是否为有效的 GitHub URL
   - 显示相应的警告或提示
6. **用户确认**：点击"安装 Skill"按钮
7. **安装流程**：
   - 调用 `import_github_skill_with_progress`
   - 返回 `task_id`
   - 实时监听任务进度（通过 `useTaskListener`）
   - 显示安装进度（下载、扫描、安装）
   - 完成后显示成功页面

### 字段映射规范

**重要**：ShareMetadata 字段映射已在 v2.6.0+ 统一

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | Skill 名称 |
| `description` | string | ✅ | Skill 描述 |
| `version` | string | ✅ | 版本号（默认 "1.0.0"） |
| `author` | string? | ❌ | 作者名称 |
| `source_url` | string? | ❌ | **主要字段**：GitHub 仓库链接 |
| `url` | string? | ❌ | **@deprecated**：已废弃，向后兼容 |
| `security_score` | number? | ❌ | 质量评分（0-100） |
| `security_level` | string? | ❌ | 安全等级（safe/risk/blocked/unknown） |

**向前兼容策略**：
- 生成时仅设置 `source_url`
- 解析时优先使用 `source_url`，回退到 `url`
- 安装 URL：`source_url \|\| url \|\| fallback`

### 边界情况处理

1. **缺少 source_url**：
   - 显示黄色警告："无法安装 - 此分享链接缺少源地址信息"
   - 安装按钮禁用，显示"无法安装 (无源地址)"

2. **非 GitHub URL**：
   - 显示蓝色警告："非标准 GitHub 链接 - 安装可能失败，请谨慎操作"

3. **无效链接**：
   - shareId 不存在 → 显示"链接已过期或不存在"
   - shareId 格式错误 → 显示"无效的分享链接格式"

4. **网络错误**：
   - 后端调用失败 → 显示"加载分享内容失败"
   - 安装失败 → 显示错误消息和重试按钮

## Rust Skill 评分系统（已完成）

Rust 版本的 Skill 质量评分系统已实现，提供高性能的本地分析功能。

### 评分体系（100分制）
- **内容质量**：50分（最高权重）- `content_scorer.rs`
  - 清晰度、技术深度、文档完整性、可操作性
- **技术实现**：30分 - `technical_scorer.rs`
  - 代码质量、模式设计、错误处理
- **维护性**：10分 - `maintenance_scorer.rs`
  - 更新频率、社区活跃度、兼容性
- **用户体验**：10分 - `ux_scorer.rs`
  - 易用性、可读性

### 评分等级
- **S 级**：90-100 分（卓越）
- **A 级**：80-89 分（优秀）
- **B 级**：70-79 分（良好）
- **C 级**：60-69 分（合格）
- **D 级**：0-59 分（需改进）

### 前端集成组件
位于 `src/components/SkillQuality/`：
- `QualityBadge.tsx` - 评分等级徽章（列表页）
- `QualityScoreCard.tsx` - 完整评分卡片（详情页）
- `ScoreRadar.tsx` - 四维雷达图可视化
- `SuggestionList.tsx` - 改进建议列表

### 相关依赖
在 `src-tauri/Cargo.toml` 中添加：
- `serde_yaml = "0.9"` - YAML frontmatter 解析
- `pulldown-cmark = "0.11"` - Markdown 解析
- `chrono = "0.4"` - 日期时间处理

## 安全扫描系统（已完成）

### 扫描模式
- **严格模式（Strict）**：报告所有匹配的规则，包括低置信度规则
- **标准模式（Standard）**：默认模式，跳过低置信度规则，减少误报
- **宽松模式（Relaxed）**：仅报告高置信度规则，误报最少

### 智能缓存机制
- SHA-256 校验和检测文件变更
- 未变更的 Skill 直接返回缓存结果
- 配置变更（扫描模式/白名单）自动失效缓存
- 支持强制重新扫描

### 白名单管理
- **Skill 白名单**：信任的 Skill 直接跳过扫描
- **规则白名单**：忽略特定安全规则的误报
- 支持添加白名单原因说明

### 扫描历史
- 自动记录每次扫描结果
- 支持搜索、筛选（安全等级）
- 支持导出 JSON/CSV 格式
- 图表可视化历史趋势

## 重要注意事项

### 分支管理规范
- **严禁直接在 main 分支上修改代码**
- 所有代码修改必须在功能分支上进行
- 完成开发后必须通过 Pull Request 合并到 main
- **严禁自行合并 PR**：创建 PR 后，必须将链接发送给用户，等待用户确认或指令后再进行合并操作。
- 功能分支命名规范：
  - `feature/功能名称` - 新功能开发
  - `fix/问题描述` - Bug 修复
  - `refactor/描述` - 代码重构

### Git 命令使用
- 使用 `docker compose` 而非 `docker-compose`

### 技能安装位置
- 用户配置文件：`~/.claude/skill-manager-config.json`
- 项目路径配置存储在配置文件的 `projectPaths` 字段

### 安全检查
导入 Skill 时会执行安全检查，可通过 `skipSecurityCheck` 参数跳过（不推荐）

### 远程初始化数据
应用首次启动时会从远程 URL 下载 `init-data.zip`，包含默认配置和预装 Skills

## 测试

### 前端测试
使用 Vitest + React Testing Library 进行组件和 Hook 测试。

```bash
npm run test              # 运行测试（watch 模式）
npm run test:run          # 运行测试（单次）
npm run test:ui           # 启动测试 UI
npm run test:coverage     # 生成覆盖率报告
```

测试文件位置：
- 组件测试：`src/components/**/*.test.tsx`
- Hook 测试：`src/hooks/**/*.test.tsx`
- 测试配置：`vitest.config.ts`
- 测试设置：`src/test/setup.ts`

### Rust 测试
```bash
cd src-tauri
cargo test              # 运行所有测试
cargo test -- --nocapture  # 显示测试输出
```

## 代码风格

### TypeScript/JavaScript
- 使用 ESLint 进行代码检查（配置在 `eslint.config.js`）
- 使用 TypeScript 严格模式

### Rust
- 使用 `cargo clippy` 进行 lint 检查
- 遵循 Rust 标准命名约定
- 为公开函数添加文档注释

## 构建产物

生产构建后，应用 bundle 位于：
- **Windows**: `src-tauri/target/release/bundle/`
- **macOS**: `src-tauri/target/release/bundle/`

## 参考资源

- Tauri 文档：https://tauri.app/v2/guides/
- React Router v7 文档：https://reactrouter.com/
