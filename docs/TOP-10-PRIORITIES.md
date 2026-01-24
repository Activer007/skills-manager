# 🎯 Skills Manager 后续优先级 Top 10 任务

**生成时间**: 2026-01-24
**依据文档**: `TASK-CURRENT.md`, `TASK-ROADMAP.md`, `planning/`, Git 提交记录
**当前版本**: v2.6.0
**项目状态**: Phase 1-2, 4, 6 完成 | Phase 3 (95%) | Phase 5 (0%)

---

## 📊 执行摘要

### 核心发现

| 模块 | 当前完成度 | 关键差距 |
|------|-----------|----------|
| **Share-First 生态** | 95% | Share Link + Share Page + 安装流缺失 |
| **任务管理系统** | 50% | 后端已完成，前端 UI 缺失 |
| **性能优化** | 0% | 缓存、API、数据库均需优化 |
| **E2E 测试** | 0% | 完全缺失 |
| **MCP 集成** | 0% | 能力声明和依赖检查 |

### 战略优先级

**P0 - 立即执行（核心闭环）**:
- 任务 #1-#3：完善 Share-First 生态最后 5%
- 任务 #4-#5：任务管理系统前端

**P1 - 近期执行（质量提升）**:
- 任务 #6-#7：MCP 集成和依赖诊断
- 任务 #8：E2E 测试基础

**P2 - 中期规划（性能与体验）**:
- 任务 #9-#10：性能优化和发布向导

---

## 🔥 优先级 Top 10 任务

### 🥇 **任务 #1: Unlisted Share Link + Share Page MVP**

**优先级**: 🔴 **P0 - 最高** | **工作量**: 6-10 PD | **类型**: 核心功能

#### 📋 背景说明
当前分享功能已完成文本/图片/包分享，但**缺少核心的 Share Link 系统**，导致：
- ❌ 无法生成可分享的链接
- ❌ 无法通过链接预览和安装 Skill
- ❌ Share-First 生态无法形成闭环

#### 🎯 任务目标
实现完整的 Share Link 生态系统，让用户可以：
1. 生成唯一 Share Link（默认 Unlisted）
2. 访问 Share Page 查看技能详情
3. 一键安装到指定位置

#### 📝 详细任务清单

##### 1.1 Share 数据模型与存储（2 PD）
- [ ] 创建 `ShareRecord` 数据模型
- [ ] 实现 `share_id` 生成机制（UUID / 短码）
- [ ] 定义可见性类型（Unlisted/Public）
- [ ] SQLite 存储方案（新建 `shares` 表）

**数据模型**:
```typescript
interface ShareRecord {
  share_id: string;           // 唯一标识
  target_type: 'skill';       // 未来支持 profile/collection
  target_id: string;          // 技能 ID
  visibility: 'unlisted' | 'public';
  created_at: string;
  expires_at?: string;        // 可选过期时间
  metadata: {
    name: string;
    description: string;
    version: string;
    author?: string;
    security_score?: number;
    security_level?: string;
  };
}
```

##### 1.2 Share Link 生成命令（1.5 PD）
- [ ] 实现 `generate_share_link` Tauri 命令
- [ ] 支持目标类型和可见性参数
- [ ] 返回 `share_id` 和完整 URL

**接口设计**:
```rust
#[tauri::command]
async fn generate_share_link(
    target_type: String,
    target_id: String,
    visibility: String,
) -> Result<ShareLinkResponse, String>
```

##### 1.3 Share Page 路由与 UI（3.5 PD）
- [ ] 创建 `/share/:shareId` 路由
- [ ] 实现 `SharePreview.tsx` 页面组件
- [ ] 展示技能基本信息（标题/作者/版本）
- [ ] 集成安全评分和兼容性徽章
- [ ] 一键安装按钮

**UI 布局**:
```tsx
<SharePreviewPage>
  <Header>
    <SkillName>TaskMaster</SkillName>
    <VersionBadge>v1.2.0</VersionBadge>
    <Author>@Activer007</Author>
  </Header>

  <SecuritySection>
    <TrustShield score={85} level="Safe" />
    <CompatibilityBadge platforms={["Claude", "Cursor"]} />
  </SecuritySection>

  <Actions>
    <InstallButton>Install to System</InstallButton>
    <CopyLinkButton>Copy Link</CopyLinkButton>
  </Actions>
</SharePreviewPage>
```

##### 1.4 Share Link 解析与安装联动（2 PD）
- [ ] 实现 `resolve_share_link` Tauri 命令
- [ ] 集成到导入流程（支持 Share Link 输入）
- [ ] 自动填充元数据（名称/描述/来源）

##### 1.5 安全与性能（1.5 PD）
- [ ] Share Link 访问权限验证（Unlisted 需要正确 ID）
- [ ] 缓存 Share Record（减少数据库查询）
- [ ] 添加埋点统计（访问量/安装量）

#### 📊 验收标准
- [x] 可生成唯一 Share Link（格式：`/share/abc123`）
- [x] Share Page 能在 3 秒内加载完成
- [x] 支持从 Share Link 安装（30 秒流程）
- [x] 安全评分和兼容性正确展示

#### 🚀 预期效果
- **用户体验**: 用户可以像 App Store 一样分享和安装 Skills
- **生态闭环**: 完成 Share-First 核心闭环
- **数据追踪**: 可统计分享量和安装量

#### 🔗 依赖关系
- ✅ 无外部阻塞依赖
- ⚠️ 需要与任务 #3（安装流）配合测试

#### 📅 建议时间表
| 日期 | 任务 |
|------|------|
| Day 1-2 | 数据模型与存储 |
| Day 3-4 | Share Link 生成命令 |
| Day 5-7 | Share Page UI 开发 |
| Day 8-9 | 解析与安装联动 |
| Day 10 | 测试与优化 |

---

### 🥈 **任务 #2: 统一 Share Sheet 入口与预览卡片**

**优先级**: 🔴 **P0 - 最高** | **工作量**: 4-7 PD | **类型**: UI/UX

#### 📋 背景说明
当前分享入口分散在多个位置，缺少**统一的分享体验**：
- ❌ 文本分享、图片分享分别独立
- ❌ 缺少链接分享选项
- ❌ 预览卡片样式不统一

#### 🎯 任务目标
实现统一的多对象 Share Sheet，支持渐进式展开。

#### 📝 详细任务清单

##### 2.1 Share Sheet 组件开发（2 PD）
- [ ] 创建 `ShareSheet.tsx` 组件
- [ ] 支持 4 种分享方式：链接/文本/图片/包
- [ ] 渐进式展开选项（默认显示常用）
- [ ] 实时预览卡片生成

**组件设计**:
```tsx
<ShareSheet
  target={skill}              // Skill | Profile | Collection
  isOpen={isOpen}
  onClose={onClose}
>
  <SharePreviewCard>
    <SkillCard skill={skill} />
    <ShareOptions>
      <ShareLinkOption />
      <ShareTextOption />
      <ShareImageOption />
      <SharePackageOption />
    </ShareOptions>
  </SharePreviewCard>
</ShareSheet>
```

##### 2.2 统一入口补齐（1.5 PD）
- [ ] 在 Skill 详情页添加 Share 按钮
- [ ] 在 Creator Profile 添加 Share 按钮
- [ ] 在 Collection 页面添加 Share 按钮
- [ ] 支持 Snapshot（临时快照）分享

##### 2.3 链接分享集成（1.5 PD）
- [ ] 默认选项："复制链接"
- [ ] 集成任务 #1 的 Share Link 生成
- [ ] 复制成功提示和 Toast 反馈
- [ ] 支持切换可见性（Unlisted/Public）

##### 2.4 预览卡片优化（1 PD）
- [ ] 统一卡片样式（与 Share Page 一致）
- [ ] 添加安全评分和兼容性徽章
- [ ] 实时生成预览（防抖优化）

#### 📊 验收标准
- [x] 所有可分享对象都有 Share 入口
- [x] Share Sheet 默认显示"复制链接"
- [x] 预览卡片正确渲染
- [x] 复制成功有明确反馈

#### 🔗 依赖关系
- ✅ 可与任务 #1 并行开发
- ⚠️ 链接分享依赖任务 #1 的 Share Link 生成

---

### 🥉 **任务 #3: 从 Share Link 安装（30 秒流程）**

**优先级**: 🔴 **P0 - 最高** | **工作量**: 7-12 PD | **类型**: 核心功能

#### 📋 背景说明
Share-First 生态的关键环节：**让用户通过链接快速安装 Skill**。

#### 🎯 任务目标
实现流畅的 30 秒安装流程，包含：
1. 安装目标选择（System/Project/Profile）
2. 依赖诊断摘要
3. 安装任务追踪

#### 📝 详细任务清单

##### 3.1 安装目标选择 UI（2 PD）
- [ ] 创建 `InstallTargetModal` 组件
- [ ] 支持三种目标类型：
  - **System**: 系统级 Skills（`~/.claude/skills`）
  - **Project**: 项目级 Skills（`{project}/.claude/skills`）
  - **Profile**: 用户自定义 Profile
- [ ] 显示已安装路径列表
- [ ] 支持新增路径（跳转到 Settings）

**UI 设计**:
```tsx
<InstallTargetModal>
  <TargetOptions>
    <TargetOption
      type="system"
      path="~/.claude/skills"
      installedCount={12}
    />
    <TargetOption
      type="project"
      path="D:/my-project/.claude/skills"
      installedCount={5}
    />
    <AddNewTargetButton />
  </TargetOptions>
</InstallTargetModal>
```

##### 3.2 依赖诊断摘要（3 PD）
- [ ] 实现 `diagnose_dependencies` Tauri 命令
- [ ] 检测 MCP 服务器依赖
- [ ] 检测系统兼容性（OS、Agent 版本）
- [ ] 显示缺失依赖和修复建议

**诊断报告**:
```typescript
interface DependencyReport {
  target: string;              // 安装目标
  compatible: boolean;         // 是否兼容
  missing_dependencies: {
    mcp_servers: string[];     // 缺失的 MCP 服务器
    tools: string[];            // 缺失的工具
    permissions: string[];     // 需要的权限
  };
  risks: {
    level: 'safe' | 'low' | 'high' | 'critical';
    issues: string[];
  };
  suggestions: string[];       // 修复建议
}
```

##### 3.3 安装任务追踪（2 PD）
- [ ] 集成任务管理系统后端（PR #78 已实现）
- [ ] 实现安装进度实时更新（Tauri Events）
- [ ] 显示任务日志（下载/扫描/安装）
- [ ] 失败重试和回滚机制

**任务追踪**:
```typescript
interface InstallTask {
  task_id: string;
  share_id: string;
  target: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;           // 0-100
  current_step: string;        // 当前步骤描述
  logs: LogEntry[];
  error?: string;
}

// 监听任务进度
Tauri.listen('install-progress', (event) => {
  updateTaskProgress(event.payload);
});
```

##### 3.4 快速安装优化（2 PD）
- [ ] 跳过安全扫描按钮（如果已在 Share Page 显示）
- [ ] 批量安装支持（多个 Skills）
- [ ] 后台下载和安装队列

#### 📊 验收标准
- [x] 用户能在 30 秒内完成安装（含目标选择）
- [x] 依赖缺失有明确提示和修复建议
- [x] 安装进度实时可见
- [x] 失败可重试或回滚

#### 🔗 依赖关系
- ✅ 依赖任务 #1（Share Link 解析）
- ✅ 依赖任务 #4（TrustShield 和兼容性徽章）

---

### **任务 #4: TrustShield 摘要与 Compatibility Badge**

**优先级**: 🔴 **P0 - 最高** | **工作量**: 4-8 PD | **类型**: UI 组件

#### 📋 背景说明
安全评分和兼容性信息已存在，但**缺少统一的可视化组件**。

#### 🎯 任务目标
创建统一的安全和兼容性展示组件。

#### 📝 详细任务清单

##### 4.1 TrustShield 组件（2 PD）
- [ ] 创建 `TrustShield.tsx` 组件
- [ ] 5 个安全等级：Safe(90-100) / Low(70-89) / Medium(50-69) / High(30-49) / Critical(0-29)
- [ ] 对应颜色和图标：🟢/🟡/🟠/🔴/⛔
- [ ] 显示在卡片、详情页、分享页

**组件设计**:
```tsx
<TrustShield score={85} level="safe" size="md">
  <ShieldIcon type="shield-check" />
  <ScoreText>85</ScoreText>
  <LevelText>Safe</LevelText>
</TrustShield>
```

##### 4.2 Compatibility Badge（1.5 PD）
- [ ] 创建 `CompatibilityBadge.tsx` 组件
- [ ] 支持平台图标：Claude/Cursor/Zed/Windsurf
- [ ] 兼容状态：✅ 完全兼容 / ⚠️ 部分兼容 / ❌ 不兼容
- [ ] 鼠标悬停显示详细信息

**数据模型**:
```typescript
interface CompatibilityInfo {
  claude: { compatible: boolean; version?: string };
  cursor: { compatible: boolean; version?: string };
  zed: { compatible: boolean; version?: string };
  notes: string[];
}
```

##### 4.3 集成到现有页面（2 PD）
- [ ] Marketplace 卡片显示徽章
- [ ] My Skills 列表显示徽章
- [ ] Skill 详情页显示完整报告
- [ ] Share Preview 页面显示

##### 4.4 联动评分和扫描系统（1.5 PD）
- [ ] 连接质量评分系统（`QualityBadge`）
- [ ] 连接安全扫描系统（`SecurityReportCard`）
- [ ] 统一数据获取（避免重复请求）

#### 📊 验收标准
- [x] 卡片和详情页显示安全等级和兼容状态
- [x] 不同等级展示不同颜色和说明
- [x] 扫描结果变化可更新展示

---

### **任务 #5: 任务管理系统前端**

**优先级**: 🔴 **P0 - 最高** | **工作量**: 5-8 PD | **类型**: 前端 UI

#### 📋 背景说明
**后端基础设施已在 PR #78 实现**，但前端 UI 缺失。

#### 🎯 任务目标
实现完整的任务中心 UI，让用户能追踪所有后台任务。

#### 📝 详细任务清单

##### 5.1 任务中心页面（3 PD）
- [ ] 创建 `src/pages/TaskCenter.tsx` 页面
- [ ] 任务列表展示（扫描/下载/安装）
- [ ] 任务状态筛选（全部/进行中/已完成/失败）
- [ ] 支持任务取消和重试

**UI 设计**:
```tsx
<TaskCenterPage>
  <TaskFilters>
    <FilterTab value="all">全部</FilterTab>
    <FilterTab value="running">进行中</FilterTab>
    <FilterTab value="completed">已完成</FilterTab>
    <FilterTab value="failed">失败</FilterTab>
  </TaskFilters>

  <TaskList>
    <TaskItem task={installTask}>
      <TaskIcon type="download" />
      <TaskName>Installing TaskMaster</TaskName>
      <ProgressBar progress={45} />
      <CancelButton />
    </TaskItem>
  </TaskList>
</TaskCenterPage>
```

##### 5.2 实时进度更新（1.5 PD）
- [ ] 监听 Tauri Events（`task-progress`）
- [ ] 更新任务进度条（0-100%）
- [ ] 显示当前步骤描述
- [ ] 完成后移除任务

**事件监听**:
```typescript
import { listen } from '@tauri-apps/api/event';

useEffect(() => {
  const unlisten = listen('task-progress', (event) => {
    const { task_id, progress, step } = event.payload;
    updateTask(task_id, { progress, current_step: step });
  });

  return () => { unlisten.then(fn => fn()); };
}, []);
```

##### 5.3 任务通知系统（1.5 PD）
- [ ] 任务开始通知（"正在安装 XXX..."）
- [ ] 任务完成通知（"XXX 安装成功"）
- [ ] 任务失败通知（"XXX 安装失败：原因..."）
- [ ] 系统托盘通知（可选）

##### 5.4 并发控制（1 PD）
- [ ] 限制最大并发任务数（3 个）
- [ ] 任务队列管理（先进先出）
- [ ] 优先级控制（安装 > 下载 > 扫描）

#### 📊 验收标准
- [x] 任务中心页面可实时更新进度
- [x] 支持取消正在进行的任务
- [x] 并发任务不超过 3 个
- [x] 任务失败有明确通知

#### 🔗 依赖关系
- ✅ 后端已完成（PR #78）
- ⚠️ 需要与任务 #3（安装流）配合

---

### **任务 #6: MCP Capability Badges + 能力清单**

**优先级**: 🟡 **P1 - 高** | **工作量**: 5-9 PD | **类型**: 功能增强

#### 📋 背景说明
Skills 可能有 MCP Tools/Resources/Prompts，但**当前没有展示这些能力**。

#### 🎯 任务目标
让用户能快速了解 Skill 的 MCP 能力。

#### 📝 详细任务清单

##### 6.1 Manifest 解析（2 PD）
- [ ] 实现 `parse_mcp_manifest` Tauri 命令
- [ ] 解析 SKILL.md 中的 MCP 能力声明
- [ ] 统计 Tools/Resources/Prompts 数量
- [ ] 提取权限声明（`allow_` 前缀）

**解析示例**:
```yaml
# SKILL.md
---
mcp:
  tools:
    - name: "read_file"
      description: "Read file content"
      allow: ["fs:*"]
  resources:
    - name: "database"
      description: "SQLite access"
      allow: ["sqlite://*"]
```

##### 6.2 Capability Badges 组件（2 PD）
- [ ] 创建 `CapabilityBadges.tsx` 组件
- [ ] 显示三类能力数量：
    - 🔧 Tools: 5
    - 📦 Resources: 2
    - 💬 Prompts: 3
- [ ] 在卡片、详情页展示

##### 6.3 能力清单页面（3 PD）
- [ ] 创建详情页 Tab：`Capabilities`
- [ ] 列出所有 Tools（名称/描述/权限）
- [ ] 列出所有 Resources
- [ ] 列出所有 Prompts

**UI 设计**:
```tsx
<CapabilitiesTab>
  <CapabilitySection title="Tools">
    <ToolItem>
      <ToolName>read_file</ToolName>
      <ToolDesc>Read file content from disk</ToolDesc>
      <Permissions>fs:*</Permissions>
    </ToolItem>
  </CapabilitySection>

  <CapabilitySection title="Resources">
    <ResourceItem>
      <ResourceName>database</ResourceName>
      <ResourceDesc>SQLite database access</ResourceDesc>
      <Permissions>sqlite://*</Permissions>
    </ResourceItem>
  </CapabilitySection>
</CapabilitiesTab>
```

##### 6.4 自动检测（1 PD）
- [ ] 扫描 Skill 代码自动检测能力
- [ ] 从代码注释中提取工具列表
- [ ] 后备方案：无法解析时显示"未声明"

#### 📊 验收标准
- [x] SkillCard 显示能力数量徽章
- [x] 详情页可查看能力清单和权限声明
- [x] 支持手动声明和自动检测

#### 🔗 依赖关系
- ✅ 可与任务 #4 并行开发
- ⚠️ 与任务 #7（依赖检查）共享解析逻辑

---

### **任务 #7: MCP 依赖检查与缺失提醒**

**优先级**: 🟡 **P1 - 高** | **工作量**: 6-10 PD | **类型**: 功能增强

#### 📋 背景说明
Skill 可能需要特定 MCP 服务器或插件，**当前没有依赖检查**。

#### 🎯 任务目标
检测缺失依赖并提供修复建议。

#### 📝 详细任务清单

##### 7.1 依赖声明格式（1.5 PD）
- [ ] 定义依赖声明格式（在 SKILL.md 或 `dependencies.json`）
- [ ] 支持声明 MCP 服务器版本要求
- [ ] 支持声明必需的 Agent 功能

**依赖格式**:
```yaml
# SKILL.md
---
dependencies:
  mcp_servers:
    - name: "sqlite"
      version: ">=1.0.0"
      required: true
    - name: "filesystem"
      version: ">=2.0.0"
      required: true
  agent_features:
    - "computer_use"
    - "artifact_management"
```

##### 7.2 依赖检测逻辑（3 PD）
- [ ] 实现 `check_dependencies` Tauri 命令
- [ ] 检测已安装的 MCP 服务器（从配置文件）
- [ ] 检测 Agent 版本和功能支持
- [ ] 比对依赖声明

##### 7.3 缺失提示 UI（2 PD）
- [ ] 创建 `MissingDependenciesAlert` 组件
- [ ] 安装前阻断 Critical 缺失（可配置）
- [ ] 显示缺失列表和修复建议

**UI 设计**:
```tsx
<MissingDependenciesAlert>
  <AlertIcon type="warning" />
  <AlertMessage>
    This skill requires the following dependencies:
  </AlertMessage>

  <DependencyList>
    <DependencyItem name="sqlite" required>
      <InstallButton href="https://...">Install Guide</InstallButton>
    </DependencyItem>
  </DependencyList>

  <Actions>
    <Button variant="primary">Install Anyway</Button>
    <Button variant="secondary">Cancel</Button>
  </Actions>
</MissingDependenciesAlert>
```

##### 7.4 修复指引（1.5 PD）
- [ ] 为常见依赖生成安装命令
- [ ] 提供文档链接
- [ ] 一键复制安装命令

##### 7.5 安装后验证（1 PD）
- [ ] 安装后重新检测依赖
- [ ] 标记 Skill 为"依赖已满足"
- [ ] 更新缓存

#### 📊 验收标准
- [x] 对缺失 MCP 依赖给出明确提示
- [x] 提供 One-Click 修复指引
- [x] 安装前诊断可阻断 Critical 缺失

#### 🔗 依赖关系
- ✅ 与任务 #6 共享解析逻辑
- ✅ 集成到任务 #3（安装流）

---

### **任务 #8: E2E 测试基础建设**

**优先级**: 🟡 **P1 - 高** | **工作量**: 6-12 PD | **类型**: 测试

#### 📋 背景说明
**当前有 193 个单元测试，但完全缺少 E2E 测试**。

#### 🎯 任务目标
建立 E2E 测试框架，覆盖关键用户流程。

#### 📝 详细任务清单

##### 8.1 Playwright 环境配置（1 PD）
- [ ] 安装 Playwright（已安装，需配置）
- [ ] 创建 `tests/e2e/` 目录
- [ ] 配置 `playwright.config.ts`
- [ ] 创建测试辅助工具（登录、安装 Skill 等）

##### 8.2 关键流程测试（3 PD）
- [ ] **测试 1**: 分享 → 安装流程
  - 生成 Share Link
  - 打开 Share Page
  - 选择安装目标
  - 完成安装
- [ ] **测试 2**: Marketplace 安装流程
  - 搜索 Skill
  - 点击安装
  - 配置参数
  - 完成安装
- [ ] **测试 3**: 安全扫描流程
  - 导入高风险 Skill
  - 查看扫描报告
  - 添加白名单
  - 完成安装

**测试示例**:
```typescript
import { test, expect } from '@playwright/test';

test('share and install workflow', async ({ page }) => {
  // 1. 进入 My Skills
  await page.goto('/my-skills');

  // 2. 点击分享按钮
  await page.click('[data-testid="share-button"]');

  // 3. 生成 Share Link
  await page.click('button:has-text("Copy Link")');

  // 4. 访问 Share Page
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto(shareUrl);

  // 5. 点击安装
  await page.click('button:has-text("Install")');

  // 6. 选择目标
  await page.selectOption('#install-target', 'system');

  // 7. 确认安装
  await page.click('button:has-text("Confirm")');

  // 8. 验证安装成功
  await expect(page.locator('.toast-success')).toBeVisible();
});
```

##### 8.3 失败路径测试（1.5 PD）
- [ ] 测试依赖缺失时的处理
- [ ] 测试安全扫描阻止时的处理
- [ ] 测试网络错误时的重试

##### 8.4 CI/CD 集成（1.5 PD）
- [ ] 配置 GitHub Actions 运行 E2E 测试
- [ ] 每次 PR 自动运行测试
- [ ] 失败时阻止合并

##### 8.5 性能基线（1 PD）
- [ ] 记录关键操作性能指标
  - 首屏加载时间: < 2s
  - 列表滚动 FPS: > 55
  - 图片加载时间: < 1s
- [ ] 建立性能监控 Dashboard

#### 📊 验收标准
- [x] Playwright 覆盖"分享→打开→安装→成功运行"主流程
- [x] 至少 1 条失败路径测试
- [x] CI 自动运行测试
- [x] 性能基线记录完成

#### 🔗 依赖关系
- ✅ 独立任务，可立即开始

---

### **任务 #9: 性能优化 Phase 5 - 缓存与 API & DB**

**优先级**: 🟢 **P2 - 中** | **工作量**: 6-10 PD | **类型**: 性能优化

#### 📋 背景说明
**性能优化尚未开始（Phase 5: 0% 完成）**。
特别注意：`marketplace.json` 已超过 70MB，前端直接加载会导致内存飙升和卡顿。

#### 🎯 任务目标
实现 LRU 缓存、API 速率限制，并将 Marketplace 数据托管到 SQLite。

#### 📝 详细任务清单

##### 9.1 Marketplace 数据 DB 托管（3 PD）
- [ ] 创建 `marketplace_skills` 表
- [ ] 实现 Rust 后台流式导入（JSON Stream -> DB Upsert）
- [ ] 实现 Tauri Command `get_skills` 支持分页和搜索
- [ ] 前端移除全量 JSON 加载，改为按需请求

##### 9.2 LRU 缓存实现（2 PD）
- [ ] 实现 LRU 缓存策略（替换简单缓存）
- [ ] 添加缓存大小限制（最大 500MB）
- [ ] 实现缓存手动清理按钮
- [ ] 实现 TTL 支持（默认 7 天）

**缓存策略**:
```rust
// src-tauri/src/services/lru_cache.rs
use lru::LruCache;

pub struct SkillCache {
    lru: LruCache<String, CacheEntry>,
    max_size: usize,
    ttl: Duration,
}

impl SkillCache {
    pub fn get(&mut self, key: &str) -> Option<&CacheEntry> {
        if let Some(entry) = self.lru.get(key) {
            if !entry.is_expired() {
                return Some(entry);
            }
        }
        None
    }

    pub fn put(&mut self, key: String, value: CacheEntry) {
        self.lru.put(key, value);
    }
}
```

##### 9.3 GitHub API 优化（2 PD）
- [ ] 实现速率限制处理（5000 次/小时）
- [ ] 添加指数退避重试机制
- [ ] 实现请求队列管理
- [ ] 添加请求超时处理（30 秒）

**重试策略**:
```rust
pub async fn fetch_with_retry(url: &str) -> Result<Response> {
    let max_retries = 3;
    let mut delay = Duration::from_secs(1);

    for attempt in 0..max_retries {
        match fetch(url).await {
            Ok(resp) if resp.status().is_success() => return Ok(resp),
            Ok(resp) if resp.status() == 429 => {
                // Rate limited
                if attempt < max_retries - 1 {
                    tokio::time::sleep(delay).await;
                    delay *= 2; // 指数退避
                }
            }
            Err(e) if attempt < max_retries - 1 => {
                tokio::time::sleep(delay).await;
                delay *= 2;
            }
            Err(e) => return Err(e),
            _ => break,
        }
    }

    Err(anyhow!("Max retries exceeded"))
}
```

##### 9.4 数据库优化与统计（2 PD）
- [ ] 添加必要索引（`repository_url`, `installed_commit_sha`）
- [ ] 启用 WAL 模式（提升并发性能）
- [ ] 创建缓存统计页面（命中率、大小）

#### 📊 验收标准
- [x] 前端启动不再加载 70MB JSON
- [x] 缓存命中率 > 80%
- [x] GitHub API 速率限制正常处理
- [x] 列表滚动和搜索响应 < 100ms

#### 🔗 依赖关系
- ✅ 独立任务，可并行开发

---

### **任务 #10: Publish Wizard（发布向导）**

**优先级**: 🟢 **P2 - 中** | **工作量**: 8-14 PD | **类型**: 新功能

#### 📋 背景说明
**Share-First 生态的发布端**：让用户能发布自己的 Skills。

#### 🎯 任务目标
实现完整的发布向导，包含 Preflight 检查、元数据编辑、版本策略。

#### 📝 详细任务清单

##### 10.1 Preflight 检查（3 PD）
- [ ] 检查 SKILL.md 结构
- [ ] 扫描 Secrets（API Key、密码等）
- [ ] 检查依赖声明完整性
- [ ] 检查 License 声明
- [ ] 检查权限合理性

**检查项**:
```typescript
interface PreflightResult {
  passed: boolean;
  checks: {
    structure: boolean;
    secrets: SecretScanResult[];
    dependencies: boolean;
    license: boolean;
    permissions: PermissionCheckResult;
  };
  warnings: string[];
  errors: string[];
}
```

##### 10.2 元数据编辑（2.5 PD）
- [ ] 创建元数据编辑表单
- [ ] 编辑标题、描述、分类
- [ ] 上传图标/预览图
- [ ] 选择标签（Tags）

##### 10.3 版本策略选择（2 PD）
- [ ] 支持 Git tag 策略
- [ ] 支持 SkillPack 策略（.skillzip）
- [ ] 自动生成版本号
- [ ] 支持 SemVer（Major.Minor.Patch）

##### 10.4 发布流程（2.5 PD）
- [ ] 选择可见性（Public/Unlisted）
- [ ] 发布到 Community Marketplace
- [ ] 生成 Release Notes
- [ ] 发布成功页面

##### 10.5 版本管理（2 PD）
- [ ] 保存发布历史
- [ ] 支持版本回滚
- [ ] 显示版本对比

#### 📊 验收标准
- [x] Preflight 必含结构/secret/license/依赖/权限检查
- [x] 发布流程可选 visibility 与版本策略
- [x] 发布后可获取作品页或分享链接

#### 🔗 依赖关系
- ✅ 依赖任务 #1（Share Link 生成）
- ⚠️ 可与任务 #8（Community Listing）并行

---

## 📊 任务对比矩阵

| 任务 | 优先级 | 工作量 | 用户价值 | 技术价值 | 依赖 | 风险 |
|------|--------|--------|---------|---------|------|------|
| #1 Share Link | 🔴 P0 | 6-10 PD | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 无 | 低 |
| #2 Share Sheet | 🔴 P0 | 4-7 PD | ⭐⭐⭐⭐ | ⭐⭐⭐ | #1 | 低 |
| #3 安装流 | 🔴 P0 | 7-12 PD | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | #1 | 中 |
| #4 TrustShield | 🔴 P0 | 4-8 PD | ⭐⭐⭐⭐ | ⭐⭐⭐ | 无 | 低 |
| #5 任务管理前端 | 🔴 P0 | 5-8 PD | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 后端完成 | 低 |
| #6 MCP Badges | 🟡 P1 | 5-9 PD | ⭐⭐⭐⭐ | ⭐⭐⭐ | 无 | 中 |
| #7 依赖检查 | 🟡 P1 | 6-10 PD | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | #6 | 中 |
| #8 E2E 测试 | 🟡 P1 | 6-12 PD | ⭐⭐ | ⭐⭐⭐⭐ | 无 | 低 |
| #9 性能优化 | 🟢 P2 | 6-10 PD | ⭐⭐⭐ | ⭐⭐⭐⭐ | 无 | 低 |
| #10 发布向导 | 🟢 P2 | 8-14 PD | ⭐⭐⭐⭐ | ⭐⭐⭐ | #1 | 中 |

---

## 📅 建议执行路线图

### Phase A：Share-First 核心闭环（优先）
**时间**: 3-4 周

```
Week 1-2: 任务 #1（Share Link + Share Page）
  ├─ Day 1-4: 数据模型、命令、UI
  └─ Day 5-10: 测试和优化

Week 2-3: 任务 #2-3（Share Sheet + 安装流）
  ├─ 任务 #2: 并行开发
  └─ 任务 #3: 依赖任务 #1

Week 3-4: 任务 #4-5（TrustShield + 任务管理）
  ├─ 任务 #4: 独立开发
  └─ 任务 #5: 前端任务中心
```

### Phase B：质量与兼容性提升
**时间**: 2-3 周

```
Week 5-6: 任务 #6-7（MCP 集成）
  ├─ 任务 #6: 并行开发
  └─ 任务 #7: 依赖 #6

Week 7: 任务 #8（E2E 测试）
  └─ 独立开发
```

### Phase C：性能与发布（中期）
**时间**: 2-3 周

```
Week 8-9: 任务 #9（性能优化）
Week 10: 任务 #10（发布向导）
```

---

## 🎯 关键里程碑

| 里程碑 | 时间 | 交付物 |
|--------|------|--------|
| **M1**: Share Link MVP | Week 2 | Share Link 生成 + Share Page |
| **M2**: 分享闭环 | Week 4 | Share Sheet + 安装流完整打通 |
| **M3**: 任务管理 | Week 4 | 任务中心 UI 上线 |
| **M4**: MCP 集成 | Week 6 | 能力徽章 + 依赖检查 |
| **M5**: 质量保障 | Week 7 | E2E 测试覆盖 |
| **M6**: 性能提升 | Week 9 | 缓存优化 + API 优化 |
| **M7**: 发布系统 | Week 10 | Publish Wizard 上线 |

---

## 🚀 立即可以开始的任务

### **推荐从任务 #1 开始**

**原因**:
1. ✅ **用户价值最高** - Share Link 是 Share-First 生态的核心
2. ✅ **无阻塞依赖** - 独立任务，可立即开始
3. ✅ **相对简单** - 6-10 PD 可完成
4. ✅ **生态闭环** - 完成后 Share-First 生态可达 100%

### **并行启动建议**

**Week 1** 可并行启动：
- **主线程**: 任务 #1（Share Link）
- **副线程 A**: 任务 #4（TrustShield）
- **副线程 B**: 任务 #8（E2E 测试框架）

---

## 📞 需要帮助？

如果你准备开始某个任务，我可以帮你：
- 📝 详细的实施步骤和代码示例
- 💻 完整的代码实现
- 🧪 测试用例编写
- 📚 文档撰写

**请告诉我你想从哪个任务开始！** 🚀

---

**文档版本**: 1.0
**最后更新**: 2026-01-24
**维护者**: Skills Manager Team
