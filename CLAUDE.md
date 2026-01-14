# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

Skill Manager 是一个用于管理 Claude Code Skills 的桌面应用程序，使用 Tauri v2（Rust 后端）和 React 19（前端）构建。

### 核心功能
- **我的 Skills**：扫描和管理已安装的系统级/项目级 Skills
- **Skill 市场**：浏览和安装来自 GitHub 的开源 Skills
- **Skill 导入**：支持从 GitHub 仓库或本地文件夹导入
- **安全扫描**：检测 Skills 中的安全风险
- **项目路径配置**：自定义多个项目路径以扫描项目级 Skills

## 开发命令

### 前端开发
```bash
npm run dev                # 启动 Vite 开发服务器
npm run build             # 构建前端（TypeScript + Vite）
npm run lint              # 运行 ESLint 检查代码质量
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
  - `src/pages/MySkills.tsx` - 已安装 Skills 管理
  - `src/pages/Marketplace.tsx` - Skill 市场
  - `src/pages/Settings.tsx` - 项目路径配置

### 后端架构（Tauri + Rust）
- **入口点**：`src-tauri/src/lib.rs`
- **Tauri Commands**：通过 `invoke()` 函数从前端调用
- **模块组织**：
  - `src-tauri/src/commands/` - Tauri 命令模块
  - `src-tauri/src/analyzer/` - Skill 质量评分系统（正在开发）

### Tauri Commands 列表
在 `src-tauri/src/lib.rs:441-449` 中注册：
- `scan_skills` - 扫描本地 Skills
- `import_github_skill` - 从 GitHub 导入
- `uninstall_skill` - 卸载 Skill
- `import_local_skill` - 从本地导入
- `get_project_paths` - 获取项目路径配置
- `save_project_paths` - 保存项目路径
- `open_url` - 在系统浏览器打开 URL
- `read_skill` - 读取 SKILL.md 内容
- `analyze_skill_quality` - 分析单个 Skill 质量
- `batch_analyze_skills` - 批量分析 Skills

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

## Rust Skill 评分系统（已完成）

Rust 版本的 Skill 质量评分系统已实现，提供高性能的本地分析功能。

### 评分体系（100分制）
- **内容质量**：50分（最高权重）- `content_scorer.rs`
- **技术实现**：30分 - `technical_scorer.rs`
- **维护性**：10分 - `maintenance_scorer.rs`
- **用户体验**：10分 - `ux_scorer.rs`

### 相关依赖
在 `src-tauri/Cargo.toml` 中添加：
- `serde_yaml = "0.9"` - YAML frontmatter 解析
- `pulldown-cmark = "0.11"` - Markdown 解析
- `chrono = "0.4"` - 日期时间处理

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
当前没有配置前端测试框架。

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
