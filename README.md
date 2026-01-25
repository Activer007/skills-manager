# Skill Manager

[English](./README_en.md)

一个用于管理 Claude Code Skills 的桌面应用程序，支持系统级和项目级 Skill 的浏览、安装、导入和安全扫描。

## 快速开始

直接从 [Releases](https://github.com/Activer007/skills-manager/releases) 下载最新版本。

如有问题请在 [Issues](https://github.com/Activer007/skills-manager/issues) 中反馈。

## 功能特性

### 1. **我的 Skills**
- 自动扫描系统级和项目级已安装的 Skills
- 支持查看 Skill 详细信息
- 一键卸载不需要的 Skills

![我的 Skills](mySkill.png)

### 2. **Skill 市场**
- 浏览 53,000+ 开源 Skills
- **智能搜索栏**：自动识别 GitHub 链接，支持直接粘贴 URL 安装
- **高级筛选**：按类别、评分、编程语言等维度筛选
- **一键安装**：简洁的卡片式设计，支持一键安装到本地
- **UI/UX 优化**：现代化设计系统、Grid/List 布局、清晰的视觉反馈

![Skill 市场](marketplace.png)

### 3. **Skill 导入**
支持三种导入方式：
- **GitHub 导入**：输入 GitHub 仓库 URL，自动克隆到本地
- **本地文件夹**：从本地文件夹导入现有 Skill
- **包导入**：从 `.zip` 包文件导入 Skill（支持离线分享）
- **分享图片导入**：扫描分享卡片中的二维码，快速导入 Skill

### 4. **Skill 分享** 🎉
- ✅ **分享链接**：生成唯一的分享链接，一键分享 Skill 给他人
- ✅ **分享预览页面**：访问分享链接查看 Skill 详细信息（名称、描述、安全等级、质量评分）
- ✅ **一键安装**：从分享链接直接安装 Skill，支持系统级和项目级安装
- ✅ **实时进度**：安装过程显示实时进度（下载、扫描、安装）
- ✅ **文本分享**：一键生成分享文本，支持多平台（Twitter、微博、Mastodon 等）
- ✅ **图片分享**：生成精美的分享卡片（含二维码、质量评分、安全等级）
- ✅ **多主题支持**：默认、简约、暗色三种分享卡片主题
- ✅ **从图片导入**：扫描分享图片二维码，快速导入 Skill
- ✅ **Skill 包导出/导入**：将 Skill 打包为 `.zip` 文件，方便离线分享和备份
- ✅ **修改检测**：智能检测本地修改的 Skill，提醒用户更新分享
- ✅ **URL 验证**：自动验证 GitHub 链接有效性，提示潜在问题
- ✅ **任务集成**：安装任务自动集成到任务中心，支持后台运行

### 5. **安全扫描** 🛡️
- ✅ **自动安全扫描**：安装前自动扫描 60+ 条安全规则
- ✅ **硬触发机制**：检测到危险代码（如 `rm -rf /`、`eval()`、`curl | sh`、`pickle.load`）自动阻止安装
- ✅ **安全评分**：0-100 分评分系统，直观显示 Skill 安全性
- ✅ **详细报告**：提供安全问题详情、修复建议和文件位置
- ✅ **手动扫描**：随时扫描已安装的 Skills
- ✅ **三种扫描模式**：
  - **严格模式（Strict）**：报告所有匹配的规则，包括低置信度规则
  - **标准模式（Standard）**：默认模式，跳过低置信度规则，减少误报
  - **宽松模式（Relaxed）**：仅报告高置信度规则，误报最少
- ✅ **白名单管理**：
  - **Skill 白名单**：信任的 Skill 直接跳过扫描
  - **规则白名单**：忽略特定安全规则的误报
  - 支持添加白名单原因说明
- ✅ **智能缓存**：
  - SHA-256 校验和检测变更
  - 未变更的 Skill 直接返回缓存结果
  - 配置变更（扫描模式/白名单）自动失效缓存
  - 支持强制重新扫描
- ✅ **扫描历史**：查看历史扫描记录，追溯安全状态变化

**检测的危险模式包括**：
- 破坏性文件系统操作（删除、覆盖）
- 远程代码执行（反向 shell、curl 管道）
- 命令注入（eval、exec、动态代码执行）
- 网络数据外传（敏感信息传输）
- 权限提升（sudo、chmod 777）
- 敏感文件访问（/etc/passwd、密钥文件）
- 持久化机制（启动项、定时任务）
- 凭证泄露（API Key、私钥、密码）
- 符号链接（防止越界访问）

**多语言安全检测支持**：
- **JavaScript/TypeScript**: `dangerouslySetInnerHTML`, `innerHTML`, `eval()`, `Function` 构造函数, `localStorage` 敏感数据, `document.write`
- **Rust**: `unsafe` 块, 原始指针, `transmute`, FFI 调用, Tauri `Command::new`
- **Go**: `unsafe` 包, CGo 使用
- **Python**: `pickle.load`（硬触发）, `yaml.load`, `compile()`, `exec()`
- **Shell**: 单词分割注入, 通配符注入, 命令替换注入

**规则置信度分级**：
- 🔴 **高置信度**：确定的安全问题
- 🟡 **中等置信度**：可能的安全风险
- 🟢 **低置信度**：可能存在误报的模式

*提示：通过扫描模式选择合适的置信度阈值*

**扫描性能优化**：
- 最大扫描深度：20 层
- 最大扫描文件数：2000 个
- 单文件大小限制：2MB
- 自动跳过大型依赖目录（`node_modules`、`target`、`.git`、`dist`、`build` 等）

### 6. **Skill 质量评分** ⭐
- ✅ **100 分制评分**：内容质量（50 分）、技术实现（30 分）、维护性（10 分）、用户体验（10 分）
- ✅ **等级评定**：S（90-100）、A（80-89）、B（70-79）、C（60-69）、D（0-59）
- ✅ **四维雷达图**：可视化展示 Skill 在四个维度的得分
- ✅ **改进建议**：提供具体的优化建议和最佳实践
- ✅ **批量评分**：支持批量分析多个 Skills，智能缓存提升性能
- ✅ **Rust 评分引擎**：高性能静态分析，支持 Markdown 和代码质量检测

### 7. **安全中心** 🔒
- ✅ **集中监控**：统一查看所有 Skills 的安全状态
- ✅ **安全等级分类**：安全（Safe）、风险（Risk）、阻止（Blocked）
- ✅ **一键扫描**：手动触发单个或全部 Skills 的安全扫描
- ✅ **快速过滤**：按安全等级筛选 Skills
- ✅ **详细报告**：查看每个 Skill 的完整安全扫描报告

### 8. **扫描历史** 📊
- ✅ **历史记录**：SQLite 数据库存储所有扫描记录
- ✅ **搜索功能**：按 Skill 名称搜索历史记录
- ✅ **筛选功能**：按安全等级筛选（All/Safe/Risk/Blocked）
- ✅ **导出功能**：支持导出 JSON/CSV 格式
- ✅ **数据可视化**：Recharts 折线图展示历史趋势
- ✅ **自动刷新**：每分钟自动刷新数据

### 9. **测试** 🧪
- ✅ **测试覆盖**: 31 个测试文件，193 个测试用例，100% 通过率
- ✅ **测试框架**: Vitest + React Testing Library
- ✅ **测试类型**: 
  - 单元测试（组件、Hooks、工具函数）
  - 集成测试（API 层、安全扫描流程、质量评分流程）
- ✅ **Mock 配置**: Tauri, i18next, Recharts
- ✅ **持续集成**: npm test 命令可快速运行所有测试

### 10. **项目路径配置**
- 自定义多个项目路径
- 自动扫描项目下的 `.claude/skills` 文件夹
- 跨平台支持（Windows、macOS）

## 技术栈

- **前端**: React 19, TypeScript, Vite 7
- **UI 库**: Tailwind CSS 3.4, DaisyUI 5.5
- **状态管理**: TanStack Query 5.90 (服务器状态)
- **路由**: React Router v7
- **图标**: Lucide React
- **图表**: Recharts
- **桌面端**: Tauri v2 (Rust 后端)
- **数据库**: SQLite (扫描历史)
- **测试**: Vitest, React Testing Library, jsdom

## 开发

### 环境要求
- Node.js 20+
- Rust (最新稳定版)
- npm

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式运行

```bash
npm run tauri dev
```

这将同时启动 Vite 开发服务器和 Tauri 应用程序。

### 3. 运行测试

```bash
# Watch 模式
npm run test

# 运行一次
npm run test:run

# UI 模式
npm run test:ui

# 覆盖率报告
npm run test:coverage
```

### 4. 代码检查

```bash
npm run lint
```

### 5. 生产环境构建

```bash
npm run tauri build
```

构建产物将在 `src-tauri/target/release/bundle/` 目录下。

## Skill 目录结构

### 系统级 Skills
- **Windows**: `C:\Users\[用户名]\.claude\skills`
- **macOS/Linux**: `~/.claude/skills`

### 项目级 Skills
在设置页面配置项目根目录，系统会自动扫描：
```
[项目根目录]/.claude/skills/
```

### Skill 格式要求
每个 Skill 文件夹必须包含 `SKILL.md` 文件，格式如下：

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

## 下载

| 平台 | 文件 |
|------|------|
| macOS (Apple Silicon) | `Skill.Manager_x.x.x_arm64.dmg` |
| macOS (Intel) | `Skill.Manager_x.x.x_x64.dmg` |
| Windows (安装程序) | `Skill.Manager_x.x.x_x64-setup.exe` |
| Windows (MSI) | `Skill.Manager_x.x.x_x64_en-US.msi` |

## 贡献

欢迎提交 Issue 和 Pull Request！

---

## ⚠️ 免责声明

**安全扫描限制**：
本项目提供的安全扫描基于 60+ 条预设规则，旨在帮助用户识别潜在的安全风险。但需要明确：

1. **不能保证 100% 准确**：安全检测可能存在误报或漏报的情况
2. **不是替代品**：不能替代专业的安全审计和代码审查
3. **持续改进**：安全规则会持续更新，但无法覆盖所有可能的风险

**使用建议**：
1. ✅ 仅从官方或受信任的来源安装 Skills
2. ✅ 安装前查看 Skill 的源代码
3. ✅ 定期审查已安装的 Skills
4. ✅ 对高风险 Skills 保持谨慎态度
5. ✅ 在生产环境使用前进行充分测试

**责任声明**：
- 使用本软件安装的任何 Skill 所产生的后果由用户自行承担
- 开发者不对因使用本软件而导致的任何损失或损害负责
- 本软件按"原样"提供，不提供任何形式的明示或暗示保证

**报告安全问题**：
如果您发现任何安全漏洞或可疑代码模式，请通过 [GitHub Issues](https://github.com/Activer007/skills-manager/issues) 报告，帮助我们改进安全规则。

---

## 致谢

感谢 [Agent Skills Guard](https://github.com/brucevanfdm/agent-skills-guard) 项目提供的安全扫描引擎基础。
