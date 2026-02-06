这份 PRD（产品需求文档）旨在将 **Skill Manager** 从一个简单的“Claude 插件下载器”升级为 **v2.0 “AI 能力枢纽 (AI Capability Hub)”**。

我们将重点解决“多工具支持”、“环境隔离”、“配置管理”三大核心挑战。

---

# Skill Manager v2.0 升级产品需求文档 (PRD)

| 项目 | 内容 |
| --- | --- |
| **版本号** | v2.0.0 (Internal Codename: "Nexus") |
| **核心目标** | 实现多 Agent 平台支持 (Claude/OpenCode/Codex)；建立基于 Profile 的环境隔离机制；完善配置与依赖管理。 |
| **状态** | 待评审 |

---

## 1. 背景与痛点分析 (Background & Problem Statement)

当前 v1.0 版本是一个基于文件系统的“下载器”，在面对复杂开发场景时存在以下致命缺陷：

* **多平台割裂：** 无法支持除 Claude Code 以外的工具（如 OpenCode, Codex），导致用户需重复安装同一工具。
* **上下文污染 (Context Pollution)：** “系统全局安装”会导致所有 Skill 注入所有项目，浪费 Token 并引发 AI 幻觉；“项目级安装”操作繁琐。
* **运行时盲区：** 缺乏依赖检测（如 Python 环境缺失），Skill 显示 "Active" 但无法运行。
* **配置缺失：** 缺乏 API Key 或参数配置入口，导致需要鉴权的 Skill 无法开箱即用。

---

## 2. 核心功能模块 (Core Features)

### 2.1 多平台架构 (Multi-Agent Architecture)

**目标：** 一处存储，多处分发。

* **中央仓库 (Central Store)：**
* 将所有下载的 Skills 统一存储在 `~/.skill-manager/store`，而非直接散落在各工具的文件夹中。


* **软链分发机制 (Symlink Distribution)：**
* **功能：** 用户点击安装时，系统根据目标平台（Claude, OpenCode），在目标目录创建指向中央仓库的软链接 (Symlink/Junction)。
* **适配器 (Manifest Adapter)：** 针对不同平台对配置文件的要求（如 `skill.md` vs `manifest.json`），内置自动转换层。


* **UI 变更：**
* **Skill 卡片：** 增加“兼容性徽章带” (Compatibility Strip)，点亮支持的平台图标 (Claude, OpenCode, Codex)。
* **安装动作：** 点击 Install 弹出多选框：“Install for Claude”, “Install for OpenCode”, “Install Globally”。



### 2.2 环境隔离与 Profile 系统 (Profiles & Context)

**目标：** 解决上下文污染，实现“场景化”管理。

* **引入 "Profile" (能力集) 概念：**
* 不再强制二选一（全局 vs 本地），而是允许用户创建 Profile。
* **预设示例：**
* `Data Science Profile`: 包含 Python解释器, Pandas工具, 绘图工具。
* `Web Dev Profile`: 包含 React文档, Tailwind速查, Chrome调试器。


* **项目绑定：** 用户可将本地的一个项目文件夹绑定到特定的 Profile。当 AI Agent 在该目录下运行时，仅加载该 Profile 内的 Skills。


* **UI 变更：**
* 侧边栏增加 **"Profiles"** 管理入口。
* 项目路径设置页，增加下拉菜单：“选择要绑定的 Profile”。



### 2.3 配置注入与依赖管理 (Config & Dependencies)

**目标：** 让 Skill “安装即用”，而非“安装即报错”。

* **配置 UI 生成器：**
* 支持 Skill 开发者在 `config.schema.json` 中定义所需字段（如 `API_KEY`, `DB_URL`）。
* **安装后流程：** 安装完成后，若检测到配置需求，自动弹出表单模态框，用户填写后安全加密存储。


* **依赖自检 (Health Check)：**
* **前置检查：** 安装前扫描本地环境（如检测 `python --version`, `node --version`）。
* **状态反馈：** 如果依赖缺失，状态栏显示黄色 "Warning" 而非绿色 "Active"，并提供“复制安装命令”按钮（如 `pip install requests`）。



### 2.4 升级版市场与发现 (Marketplace 2.0)

**目标：** 提升海量 Skills 下的检索效率。

* **多维筛选 (Faceted Filter)：**
* 按平台筛选：`Claude Compatible`, `OpenCode Compatible`.
* 按协议筛选：`MCP Server`, `Native Script`.
* 按类别筛选：`Development`, `Productivity`, `Data`.


* **智能排序：**
* **Environment Match:** 优先展示用户本地环境已满足依赖的 Skills。


* **预览体验：**
* 列表页支持 **空格键预览**，弹窗展示 Skill 的核心 Prompt 用法。



---

## 3. 用户体验与交互设计 (UX & Interaction)

### 3.1 导航结构重构

```text
[Sidebar]
  ├── 仪表盘 (Dashboard) - 概览、更新提醒
  ├── 发现 (Marketplace) - 市场搜索
  ├── 我的能力 (My Library)
  │    ├── Installed (已安装的全部)
  │    └── Profiles (按场景分类)
  ├── 映射管理 (Integrations) - 管理 Claude/OpenCode 的路径连接
  └── 设置 (Settings)

```

### 3.2 关键流程图 (User Flow)

* **安装流程：**
1. 浏览市场 -> 2. 点击 Install -> 3. **选择目标平台 (Claude/OpenCode)** -> 4. **(可选) 填写配置表单** -> 5. 完成。


* **项目绑定流程：**
1. 进入 Profiles -> 2. 新建/编辑 Profile (勾选所需 Skills) -> 3. 添加本地项目路径 -> 4. **绑定该 Profile**。



---

## 4. 安全与合规 (Security & Compliance)

* **权限透明化：**
* 在 Skill 详情页引入“权限清单” (Permission Manifest)，明确标注：
* ⚠️ 文件读取 (File System Access)
* ⚠️ 网络请求 (Network Access)
* ⚠️ 命令行执行 (Shell Execution)




* **沙箱模式 (Sandbox Mode) [Roadmap v2.1]:**
* 为 Python 类 Skill 提供基于 `venv` 的独立虚拟环境支持，避免污染全局 Pip。



---

## 5. 开发实施建议 (Implementation Notes)

1. **技术栈保持：** 继续使用 Electron/Tauri + React (shadcn/ui)。
2. **Schema 标准化：** 定义一套内部的 `skill.json` 标准，作为各平台配置文件的超集 (Superset)，用于中间层转换。
3. **MCP 优先：** 优先适配 **Model Context Protocol (MCP)** 标准，这是未来的通用接口，能极大减少多平台适配的工作量。

---

## 6. 成功指标 (Success Metrics)

* **多平台激活率：** 用户平均在 1 个以上的 Agent 平台激活了 Skill。
* **配置成功率：** 需要配置的 Skill，用户在 UI 中完成配置并成功运行的比例。
* **Profile 使用率：** 创建了至少 1 个自定义 Profile 的用户比例。