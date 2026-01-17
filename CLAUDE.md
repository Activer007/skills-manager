# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Skill Manager 是一个用于管理 Claude Code Skills 的桌面应用程序，使用 Tauri v2（Rust 后端）和 React 19（前端）构建。

### 核心功能
- **我的 Skills**：扫描和管理已安装的系统级/项目级 Skills，支持查看质量评分和安全状态
- **Skill 市场**：浏览和安装来自 GitHub 的开源 Skills
- **Skill 导入**：支持从 GitHub 仓库或本地文件夹导入
- **安全扫描**：检测 Skills 中的安全风险，支持三种扫描模式和白名单管理
- **扫描历史**：查看历史扫描记录，支持搜索、筛选和导出功能
- **安全中心**：集中管理和监控所有 Skills 的安全状态
- **Skill 质量评分**：基于内容质量、技术实现、维护性和用户体验的 100 分制评分系统
- **项目路径配置**：自定义多个项目路径以扫描项目级 Skills

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
  - `src/pages/MySkills.tsx` - 已安装 Skills 管理，集成质量评分和安全扫描
  - `src/pages/Marketplace.tsx` - Skill 市场
  - `src/pages/Settings.tsx` - 项目路径配置
  - `src/pages/Security.tsx` - 安全中心，监控所有 Skills 安全状态
  - `src/pages/ScanHistory.tsx` - 扫描历史记录，支持搜索、筛选和导出
  - `src/pages/Dashboard.tsx` - 仪表板概览

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
- `scan_skills` - 扫描本地 Skills
- `import_github_skill` - 从 GitHub 导入
- `uninstall_skill` - 卸载 Skill
- `import_local_skill` - 从本地导入
- `get_project_paths` - 获取项目路径配置
- `save_project_paths` - 保存项目路径
- `open_url` - 在系统浏览器打开 URL
- `read_skill` - 读取 SKILL.md 内容

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

- Python 评分系统实现：`~/workspace/ordinary-claude-skills/tools/analyzer/`
- Tauri 文档：https://tauri.app/v2/guides/
- React Router v7 文档：https://reactrouter.com/
