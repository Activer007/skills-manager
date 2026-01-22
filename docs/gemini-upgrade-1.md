这是一份经过全面整合的 PRD 文档。它将所有之前的零散讨论（多平台支持、Profile 环境隔离、配置注入、版本快照）整合成了一个逻辑严密的产品升级方案。

---

# Product Requirement Document (PRD): Skill Manager v2.0 "Nexus"

| 文档信息 |  |
| --- | --- |
| **项目名称** | Skill Manager v2.0 (Internal Codename: Nexus) |
| **核心愿景** | 从单一的下载器进化为 **AI Agent 时代的通用能力枢纽 (AI Capabilities Hub)**，实现跨工具、跨环境、可回溯的智能化管理。 |
| **版本类型** | Major Upgrade (架构重构级更新) |
| **优先级** | P0 (Critical) |

---

## 1. 产品战略与核心痛点

### 1.1 现状分析

当前 v1.0 版本本质是一个“文件下载器”，在面对复杂的 AI 开发场景时存在严重的逻辑断层：

* **多工具割裂：** 无法支持 Claude Code 以外的 Agent（如 OpenCode, Codex）。
* **上下文污染：** 全局安装导致所有项目混杂大量无关 Skill，浪费 Token 并引发 AI 幻觉。
* **配置盲区：** 缺乏 API Key 管理和环境依赖检测，导致 Skill “下载即报错”。
* **版本失控：** 用户修改 Skill 代码后无法回滚，缺乏安全的试错机制。

### 1.2 v2.0 核心价值主张

* **Unified (统一)：** 一处存储，多处分发（Write/Install once, run everywhere）。
* **Context-Aware (情境感知)：** 基于 Profile 的环境隔离，只给 AI 喂当前需要的工具。
* **Resilient (鲁棒性)：** 内置版本快照与依赖自检，确保工具链稳定。

---

## 2. 功能架构设计 (Functional Architecture)

### 2.1 核心模块：Profile 环境隔离系统 (Profile System)

**定义：** 彻底摒弃“全局/本地”的简单二分法，引入“能力集 (Profile)”概念。

* **逻辑结构：**
* **Global Store (仓库层)：** `~/.skill-manager/store/` 存放所有下载的 Skill 原始文件及版本快照。
* **Profile (配置层)：** 一个 JSON 配置文件，定义了“这个集合包含哪些 Skill”以及“这些 Skill 的特定配置”。
* **Mapping (映射层)：** 将 Profile 挂载到具体的本地项目路径或 Agent 全局配置中。


* **默认预设 (Presets)：**
* `Default Global`: 所有工具共享的基础能力。
* `Python Data Stack`: 包含 Pandas, Matplotlib, Python-Interpreter。
* `Web Dev Stack`: 包含 Chrome-Tools, React-Docs, TailWind-Helper。



### 2.2 核心模块：多平台分发引擎 (Multi-Agent Dispatcher)

**定义：** 解决不同 Agent 对配置文件格式和路径的不同要求。

* **支持平台：** Claude Code (核心), OpenCode, Codex (VS Code Copilot).
* **分发机制 - 软链策略 (Symlink Strategy)：**
* 不复制文件。当 Profile 激活时，在目标项目的配置目录下创建指向 Global Store 的软链接。


* **Manifest 适配器 (Manifest Adapter)：**
* 系统内置转换层。读取 Skill 的通用元数据，自动生成目标平台所需的配置文件（如为 Claude 生成 `skill.md`，为 OpenCode 生成 `manifest.yaml`）。



### 2.3 核心模块：轻量级版本管理 (Snapshot Versioning)

**定义：** 不依赖 Git 的本地文件快照系统。

* **机制：**
* **Install Snapshot:** 下载时自动创建 v1.0 原始快照。
* **Manual Snapshot:** 用户点击“保存快照”时，将当前文件夹打包为 zip 存入 `.history/`。
* **Restore:** 一键解压旧版本 zip 覆盖当前工作区。



---

## 3. UI/UX 交互与界面升级详情

### 3.1 导航栏重构 (Navigation)

* **左侧侧边栏新增：**
* `Profiles` (环境集)：管理不同的工具组合。
* `Integrations` (平台集成)：管理 Claude/OpenCode 的路径和连接状态。



### 3.2 市场与安装流程 (Marketplace & Install)

**界面变更：**

* **卡片设计：**
* **底部兼容性徽章：** 显示 [Claude Icon] [OpenCode Icon] [Universal]。
* **依赖提示：** 如果检测到本地缺少 Python/Node，卡片右上角显示黄色感叹号 ⚠️。


* **安装交互 (Wizard)：**
* **Step 1:** 点击 Install。
* **Step 2 (Target):** 选择安装到哪个 Profile？（例如：勾选 "Web Dev Stack"）。
* **Step 3 (Config):** (如果有) 弹出表单填写 API Key。



### 3.3 Skill 详情与管理页 (Detail View)

**新增三大选项卡 (Tabs)：**

#### Tab 1: 概览 (Overview)

* **Switch Toggle:** 启用/禁用 (Enabled/Disabled)。
* **平台状态矩阵：**
* Claude Code: ✅ Active (via Web Profile)
* OpenCode: ⚪ Inactive


* **配置区 (Configuration):**
* 可视化表单编辑 `config.json`（隐藏敏感 Key）。



#### Tab 2: 代码与版本 (Code & Versions)

* **左侧：历史时间轴 (Timeline)**
* 显示：`v3 (Current)`, `v2 (Modified prompt)`, `v1 (Original)`.
* 操作：`Create Snapshot` (新建), `Restore` (回滚).


* **右侧：简易编辑器 (Editor)**
* **Monaco Diff Editor:** 如果选中了历史版本，显示“当前版本 vs 历史版本”的差异对比。



#### Tab 3: 依赖自检 (Diagnostics)

* **环境扫描：**
* Python: ✅ Detected (v3.10)
* Node.js: ❌ Missing (此 Skill 需要 Node 环境) -> [Fix Button: Copy Install Command]


* **权限清单：** 列出该 Skill 请求的权限（读写文件、网络访问）。

---

## 4. 关键操作流程图 (User Flows)

### 4.1 场景：为新项目配置环境

1. 用户在侧边栏点击 **Profiles** -> **New Profile**。
2. 命名为 "My Startup Project"。
3. 从已安装库中勾选 5 个 Skills，或去市场下载新 Skill 并添加到此 Profile。
4. 在 Profile 设置中，点击 **"Link Project"**，选择本地文件夹 `~/Projects/startup-app`。
5. **系统后台动作：** 在 `~/Projects/startup-app/.claude/skills` 中创建软链接。
6. **结果：** 用户在 CLI 打开该目录运行 Claude 时，只有这 5 个 Skill 被加载。

### 4.2 场景：修改 Skill 并回滚

1. 用户觉得某个 Skill 的 Prompt 太啰嗦，进入 **"Code & Versions"**。
2. 点击 **"Create Snapshot"**，备注 "Original Backup"。
3. 在编辑器中直接修改 Prompt，保存。
4. 测试后发现效果变差。
5. 回到版本列表，点击 "Original Backup" 旁的 **"Restore"**。
6. 系统提示“确认覆盖？”，确认后恢复文件。

---

## 5. 技术实施路线图 (Roadmap)

### Phase 1: 基础架构重构 (v2.0-alpha)

* [Backend] 实现 Global Store + Symlink 分发逻辑。
* [Backend] 实现 Profile 数据结构与存储。
* [UI] 侧边栏更新，增加 Profile 管理界面。

### Phase 2: 版本与配置 (v2.0-beta)

* [Backend] 实现 Zip 快照与还原逻辑。
* [UI] 集成 Monaco Editor 实现代码查看与 Diff。
* [UI] 实现安装时的 Config Form 动态渲染。

### Phase 3: 多平台适配 (v2.0-Release)

* [Logic] 编写 Claude 到 OpenCode/Codex 的配置文件转换器。
* [UI] 完善市场卡片的兼容性标识。

---

## 6. 风险与对策 (Risk Management)

| 风险点 | 影响 | 对策 |
| --- | --- | --- |
| **软链接失效** | Windows/Mac/Linux 对软链接处理不一致，可能导致 Agent 读不到文件。 | 在 Windows 下使用 Junction 或管理员权限处理；提供“复制模式”作为 Fallback 选项。 |
| **依赖环境复杂** | 用户本地环境千奇百怪，依赖检查难以覆盖所有情况。 | 初期只支持最主流的 `pip` 和 `npm` 检查；提供 Docker 容器化运行 Skill 的远景规划。 |
| **配置安全性** | 明文存储 API Key 存在风险。 | 使用系统级 Keytar/Keychain 存储敏感信息，配置文件中仅保存引用 ID。 |

---

