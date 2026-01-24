# 🎯 Skills Manager 后续优先级 Top 10 任务

**生成时间**: 2026-01-24
**依据文档**: `TASK-CURRENT.md`, `TASK-ROADMAP.md`, `planning/`, Git 提交记录, 代码库实际状态
**当前版本**: v2.6.0
**项目状态**: Phase 1-2, 4, 6 完成 | Phase 3 (95%) | Phase 5 (30%)

---

## 📊 执行摘要

### 核心发现

| 模块 | 当前完成度 | 关键差距 |
|------|-----------|----------|
| **Share-First 生态** | 95% | Share Link 安装 URL 构造需完善 |
| **ShareSheet 组件** | 100% | ✅ 已完成 |
| **任务管理系统** | 50% | 后端已完成，前端 UI 完全缺失 (0%) |
| **TrustShield & Compatibility** | 100% | ✅ 已完成 |
| **MCP 集成** | 0% | 能力徽章和依赖检查均未实现 |
| **E2E 测试** | 40% | 框架就绪，关键场景覆盖不足 |
| **性能优化** | 30% | 后端有基础缓存，前端和数据库优化缺失 |
| **Publish Wizard** | 80% | 组件完成，但后端命令未注册 |

### 战略优先级

**P0 - 立即执行（阻断性问题修复）**:
- 🔴 **Publish Wizard 命令注册**：修复 `lib.rs` 中未注册的发布命令（5 分钟）
- 🔴 **Share Link 安装完善**：添加 `source_url` 字段到 `ShareMetadata`（1 小时）

**P0 - 核心功能完善**:
- 任务 #5：任务管理系统前端（后端已完成，只需 UI）

**P1 - 近期执行（质量提升）**:
- 任务 #6-#7：MCP 集成（能力徽章 + 依赖检查）
- 任务 #8：E2E 测试补充关键场景

**P2 - 中期规划（性能与体验）**:
- 任务 #9：性能优化（前端缓存 + 数据库优化）
- 任务 #10：Publish Wizard 完整集成

---

## 🔥 优先级 Top 10 任务

### 🥇 **任务 #1: Unlisted Share Link + Share Page** ✅ **95% 完成**

**优先级**: 🟢 **已基本完成** | **工作量**: 剩余 0.5-1 PD | **类型**: 核心功能

#### ✅ 已实现部分
- ✅ **后端数据模型**：`src-tauri/src/models/share.rs` - ShareRecord 和 ShareMetadata
- ✅ **后端服务**：`src-tauri/src/services/share_service.rs` - 完整的 CRUD 操作
- ✅ **Tauri 命令**：
  - `generate_share_link` - 生成分享链接
  - `resolve_share_link` - 解析分享链接
- ✅ **Share Page**：`src/pages/SharePreview.tsx` - 完整的预览页面
- ✅ **路由配置**：`/share/:shareId` 在 `App.tsx` 中已配置
- ✅ **ShareSheet 集成**：`src/hooks/useShare.ts` - 自动生成分享链接

#### ⚠️ 剩余工作（0.5-1 PD）

##### 1.1 修复 ShareMetadata 模型（0.5 PD）
- [ ] 在 `src-tauri/src/models/share.rs` 的 `ShareMetadata` 中添加 `source_url` 字段
- [ ] 更新 `generate_share_link` 命令，在创建分享记录时保存原始 URL
- [ ] 确保兼容性检查使用 `source_url` 而非硬编码 URL

##### 1.2 完善 SharePreview 安装逻辑（0.5 PD）
- [ ] 修复 `src/pages/SharePreview.tsx` L155-156 的 `installUrl` 构造逻辑
- [ ] 确保从 Share Link 安装时能正确获取 Skill 源地址
- [ ] 测试完整流程：生成链接 → 打开 Share Page → 安装

#### 📊 验收标准
- [x] 可生成唯一 Share Link（格式：`/share/abc123`）
- [x] Share Page 能在 3 秒内加载完成
- [x] 安全评分和兼容性正确展示
- [ ] 支持从 Share Link 安装（30 秒流程）- ⚠️ **待修复**

#### 🔗 相关文件
- 后端模型：`src-tauri/src/models/share.rs:24-60`
- 前端页面：`src/pages/SharePreview.tsx:155-156`

---

### 🥈 **任务 #2: 统一 Share Sheet 入口** ✅ **100% 完成**

**优先级**: ✅ **已完成** | **状态**: 生产就绪

#### ✅ 已实现部分
- ✅ **ShareSheet 组件**：`src/components/ShareSheet/ShareSheet.tsx`
- ✅ **5 种分享方式**：
  - 链接分享（Share Link）
  - 文本分享（`ShareTextPanel.tsx`）
  - 图片分享（`ShareImagePanel.tsx`）
  - 包导出（`SharePackagePanel.tsx`）
  - 嵌入代码（`ShareEmbedPanel.tsx`）
- ✅ **统一 Hook**：`src/hooks/useShare.ts` - 管理所有分享逻辑
- ✅ **预览卡片**：实时预览功能
- ✅ **测试覆盖**：`ShareSheet.test.tsx`

#### 📊 验收标准
- [x] 所有可分享对象都有 Share 入口
- [x] Share Sheet 默认显示"复制链接"
- [x] 预览卡片正确渲染
- [x] 复制成功有明确反馈

---

### 🥉 **任务 #3: 从 Share Link 安装（30 秒流程）** ⚠️ **85% 完成**

**优先级**: 🟡 **需完善** | **工作量**: 剩余 1-2 PD | **类型**: 核心功能

#### ✅ 已实现部分
- ✅ **SharePreview 页面**：完整的安装流程 UI
- ✅ **InstallConfirmDialog**：`src/components/InstallConfirmDialog.tsx`
- ✅ **InstallProgress**：`src/components/InstallProgress.tsx`
- ✅ **解析逻辑**：`parseShareLink` 函数完整
- ✅ **后端解析**：`resolve_share_link` 命令

#### ⚠️ 剩余工作（1-2 PD）

##### 3.1 修复元数据模型（0.5 PD）
- [ ] 同任务 #1.1，添加 `source_url` 字段

##### 3.2 完善安装流程（0.5-1 PD）
- [ ] 集成依赖诊断摘要（见任务 #7）
- [ ] 添加安装目标选择 UI（见下文）
- [ ] 实现安装进度实时更新（集成任务管理系统）

##### 3.3 安装目标选择（可选，1 PD）
- [ ] 创建 `InstallTargetModal` 组件
- [ ] 支持三种目标：System / Project / Profile
- [ ] 显示已安装路径列表

#### 📊 验收标准
- [x] Share Preview 页面显示安装按钮
- [x] 安装确认对话框正常工作
- [ ] 用户能在 30 秒内完成安装（含目标选择）- ⚠️ **依赖任务 #7**
- [ ] 依赖缺失有明确提示和修复建议 - ⚠️ **依赖任务 #7**
- [ ] 安装进度实时可见 - ⚠️ **依赖任务 #5**

---

### **任务 #4: TrustShield 摘要与 Compatibility Badge** ✅ **100% 完成**

**优先级**: ✅ **已完成** | **状态**: 生产就绪

#### ✅ TrustShield 组件
- ✅ **文件**：`src/components/TrustShield.tsx`
- ✅ **5 个安全等级**：verified (90-100) / safe (70-89) / warning (50-69) / critical (30-49) / unknown (0-29)
- ✅ **3 种尺寸**：sm / md / lg
- ✅ **国际化支持**
- ✅ **测试**：`TrustShield.test.tsx`

#### ✅ CompatibilityBadge 组件
- ✅ **文件**：`src/components/CompatibilityBadge.tsx`
- ✅ **支持 4 种 Agent**：Claude Code, Cursor, Windsurf, v0
- ✅ **图标显示** + **Tooltip 提示**
- ✅ **测试**：`__tests__/CompatibilityBadge.test.tsx`

#### ✅ 集成状态
- ✅ Marketplace 卡片显示徽章
- ✅ My Skills 列表显示徽章
- ✅ Skill 详情页显示完整报告
- ✅ Share Preview 页面显示

#### 📊 验收标准
- [x] 卡片和详情页显示安全等级和兼容状态
- [x] 不同等级展示不同颜色和说明
- [x] 扫描结果变化可更新展示

---

### **任务 #5: 任务管理系统前端** ❌ **0% 完成（后端已完成）**

**优先级**: 🔴 **P0 - 最高** | **工作量**: 5-8 PD | **类型**: 前端 UI

#### 📋 背景说明
**后端基础设施已在 `src-tauri/src/tasks/task_manager.rs` 完整实现**，但前端 UI 完全缺失。

#### ✅ 后端已完成部分
- ✅ **TaskManager 服务**：完整的任务管理逻辑
- ✅ **并发控制**：全局信号量（3）+ 下载信号量（2）
- ✅ **进度事件**：`task-progress` 和 `task-update` 事件
- ✅ **Tauri 命令**（已实现，可能未注册）：
  - `get_tasks` - 获取所有任务
  - `get_task` - 获取单个任务
  - `cancel_task` - 取消任务
  - `cleanup_tasks` - 清理旧任务

#### ❌ 前端缺失部分

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

##### 5.4 并发控制 UI（1 PD）
- [ ] 显示当前并发任务数
- [ ] 任务队列管理（先进先出）
- [ ] 优先级控制（安装 > 下载 > 扫描）

##### 5.5 后端命令注册（0.5 PD）
- [ ] 检查 `src-tauri/src/lib.rs` 中是否已注册任务命令
- [ ] 如未注册，添加以下命令：
  ```rust
  commands::task::get_tasks,
  commands::task::get_task,
  commands::task::cancel_task,
  commands::task::cleanup_tasks,
  ```

#### 📊 验收标准
- [ ] 任务中心页面可实时更新进度
- [ ] 支持取消正在进行的任务
- [ ] 并发任务不超过 3 个
- [ ] 任务失败有明确通知

#### 🔗 依赖关系
- ✅ 后端已完成
- ⚠️ 需要与任务 #3（安装流）配合

---

### **任务 #6: MCP Capability Badges** ❌ **0% 完成**

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
- [ ] 创建 `src/components/CapabilityBadges.tsx` 组件
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
- [ ] SkillCard 显示能力数量徽章
- [ ] 详情页可查看能力清单和权限声明
- [ ] 支持手动声明和自动检测

#### 🔗 依赖关系
- ✅ 可与任务 #4 并行开发
- ⚠️ 与任务 #7（依赖检查）共享解析逻辑

---

### **任务 #7: MCP 依赖检查与缺失提醒** ❌ **0% 完成**

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
- [ ] 创建 `src/components/MissingDependenciesAlert.tsx` 组件
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
- [ ] 对缺失 MCP 依赖给出明确提示
- [ ] 提供 One-Click 修复指引
- [ ] 安装前诊断可阻断 Critical 缺失

#### 🔗 依赖关系
- ✅ 与任务 #6 共享解析逻辑
- ✅ 集成到任务 #3（安装流）

---

### **任务 #8: E2E 测试基础建设** ⚠️ **40% 完成**

**优先级**: 🟡 **P1 - 高** | **工作量**: 剩余 4-8 PD | **类型**: 测试

#### 📋 背景说明
**E2E 测试框架已就绪**，但关键场景覆盖不足。

#### ✅ 已实现部分
- ✅ **测试框架**：Playwright + Tauri
- ✅ **测试文件**：
  - `tests/e2e/sharing.spec.ts` - 分享功能测试（522 行，完整）
  - `tests/e2e/skill-management.spec.ts` - Skill 管理
  - `tests/e2e/skill-import.spec.ts` - Skill 导入
  - `tests/e2e/security.spec.ts` - 安全扫描
  - `tests/e2e/settings.spec.ts` - 设置
- ✅ **测试辅助**：
  - `tests/e2e/helpers/tauri-helpers.ts`
  - `tests/e2e/pages/*.page.ts` - 页面对象模式
  - `tests/e2e/fixtures/test-data.ts`

#### ⚠️ 缺失部分

##### 8.1 关键场景测试（3 PD）
- [ ] **测试 1**: Share Link 完整流程
  - 生成 Share Link
  - 打开 Share Page
  - 点击安装
  - 完成安装
- [ ] **测试 2**: Publish Wizard 流程
  - Preflight 检查
  - 填写元数据
  - 发布成功
- [ ] **测试 3**: 任务管理系统
  - 创建任务
  - 监听进度
  - 完成任务

##### 8.2 失败路径测试（1.5 PD）
- [ ] 测试依赖缺失时的处理
- [ ] 测试安全扫描阻止时的处理
- [ ] 测试网络错误时的重试

##### 8.3 CI/CD 集成（1.5 PD）
- [ ] 配置 GitHub Actions 运行 E2E 测试
- [ ] 每次 PR 自动运行测试
- [ ] 失败时阻止合并

##### 8.4 性能基线（1 PD）
- [ ] 记录关键操作性能指标
  - 首屏加载时间: < 2s
  - 列表滚动 FPS: > 55
  - 图片加载时间: < 1s
- [ ] 建立性能监控 Dashboard

#### 📊 验收标准
- [x] Playwright 框架已配置
- [x] 基础测试场景已覆盖
- [ ] Share Link 完整流程测试 - ❌ **缺失**
- [ ] Publish Wizard 流程测试 - ❌ **缺失**
- [ ] 至少 1 条失败路径测试 - ❌ **缺失**
- [ ] CI 自动运行测试 - ❌ **缺失**

#### 🔗 依赖关系
- ✅ 独立任务，可立即开始

---

### **任务 #9: 性能优化 Phase 5** ⚠️ **30% 完成**

**优先级**: 🟢 **P2 - 中** | **工作量**: 剩余 4-7 PD | **类型**: 性能优化

#### 📋 背景说明
**性能优化部分完成**，后端有基础缓存，前端和数据库优化缺失。

特别注意：`marketplace.json` 已超过 70MB，前端直接加载会导致内存飙升和卡顿。

#### ✅ 已实现部分
- ✅ **后端缓存**：
  - `src-tauri/src/commands/cache.rs`
  - `get_cache_stats`, `clear_cache`, `update_cache_config` 命令
- ✅ **增量扫描**：
  - `scan_skill_security_incremental`
  - SHA-256 校验和检测
- ✅ **最近优化**：
  - Git 提交 `ce768f3` - "refactor(cache): optimize concurrency and improve checksum stability"

#### ⚠️ 缺失部分

##### 9.1 Marketplace 数据 DB 托管（3 PD）
- [ ] 创建 `marketplace_skills` 表
- [ ] 实现 Rust 后台流式导入（JSON Stream -> DB Upsert）
- [ ] 实现 Tauri Command `get_skills` 支持分页和搜索
- [ ] 前端移除全量 JSON 加载，改为按需请求

##### 9.2 前端缓存层（1.5 PD）
- [ ] 集成 React Query 或 SWR
- [ ] 实现请求去重和批处理
- [ ] 添加缓存失效策略

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

##### 9.4 数据库优化（0.5-1 PD）
- [ ] 添加必要索引（`repository_url`, `installed_commit_sha`）
- [ ] 启用 WAL 模式（提升并发性能）
- [ ] 创建缓存统计页面（命中率、大小）

#### 📊 验收标准
- [ ] 前端启动不再加载 70MB JSON
- [ ] 缓存命中率 > 80%
- [ ] GitHub API 速率限制正常处理
- [ ] 列表滚动和搜索响应 < 100ms

#### 🔗 依赖关系
- ✅ 独立任务，可并行开发

---

### **任务 #10: Publish Wizard（发布向导）** ⚠️ **80% 完成**

**优先级**: 🟢 **P2 - 中** | **工作量**: 剩余 1-3 PD | **类型**: 新功能

#### 📋 背景说明
**Share-First 生态的发布端**：让用户能发布自己的 Skills。

#### ✅ 已实现部分
- ✅ **前端组件**：`src/components/PublishWizard.tsx`（348 行，完整）
  - 4 步向导流程（Preflight → Metadata → Publishing → Success）
  - 进度指示器
  - 完整的表单和验证
- ✅ **后端实现**：`src-tauri/src/commands/publish.rs`
  - `run_publish_preflight` - 预检查（SKILL.md, License, 安全扫描）
  - `publish_skill` - 发布逻辑（模拟）
- ✅ **类型定义**：`src/types/publish.ts`

#### ❌ 关键问题

##### 10.1 🔴 **阻断性：命令未注册**（0.5 PD）
**问题**：`src-tauri/src/lib.rs` 中**未注册**发布命令

**修复**：
```rust
// 在 src-tauri/src/lib.rs 的 invoke_handler 中添加：
.generate_handler([
    // ... 其他命令
    commands::publish::run_publish_preflight,
    commands::publish::publish_skill,
])
```

##### 10.2 真实集成（1-2 PD）
- [ ] 连接真实的市场发布 API（当前为模拟）
- [ ] 支持 Git tag 策略
- [ ] 支持 SkillPack 策略（.skillzip）
- [ ] 自动生成版本号（SemVer）

##### 10.3 版本管理（可选，1 PD）
- [ ] 保存发布历史
- [ ] 支持版本回滚
- [ ] 显示版本对比

#### 📊 验收标准
- [x] Preflight 必含结构/secret/license/依赖/权限检查
- [x] 发布流程 UI 完整
- [ ] 发布命令已注册并可调用 - ❌ **阻断性问题**
- [ ] 发布后可获取作品页或分享链接

#### 🔗 依赖关系
- ✅ 依赖任务 #1（Share Link 生成）
- ⚠️ 可与任务 #8（Community Listing）并行

---

## 📊 任务对比矩阵（更新）

| 任务 | 优先级 | 工作量 | 完成度 | 用户价值 | 技术价值 | 风险 |
|------|--------|--------|--------|---------|---------|------|
| #1 Share Link | 🟢 已完成 | 0.5-1 PD | 95% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 低 |
| #2 Share Sheet | ✅ 完成 | - | 100% | ⭐⭐⭐⭐ | ⭐⭐⭐ | 无 |
| #3 安装流 | 🟡 需完善 | 1-2 PD | 85% | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 低 |
| #4 TrustShield | ✅ 完成 | - | 100% | ⭐⭐⭐⭐ | ⭐⭐⭐ | 无 |
| #5 任务管理前端 | 🔴 P0 | 5-8 PD | 0% | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 低 |
| #6 MCP Badges | 🟡 P1 | 5-9 PD | 0% | ⭐⭐⭐⭐ | ⭐⭐⭐ | 中 |
| #7 依赖检查 | 🟡 P1 | 6-10 PD | 0% | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 中 |
| #8 E2E 测试 | 🟡 P1 | 4-8 PD | 40% | ⭐⭐ | ⭐⭐⭐⭐ | 低 |
| #9 性能优化 | 🟢 P2 | 4-7 PD | 30% | ⭐⭐⭐ | ⭐⭐⭐⭐ | 低 |
| #10 发布向导 | 🟡 需修复 | 1-3 PD | 80% | ⭐⭐⭐⭐ | ⭐⭐⭐ | 低 |

---

## 📅 建议执行路线图（更新）

### Phase A：阻断性问题修复（立即执行）
**时间**: 0.5-1 天

```
Day 1 上午：修复任务 #10（Publish Wizard 命令注册）
  └─ 在 lib.rs 中注册发布命令（5 分钟）

Day 1 下午：修复任务 #1（Share Link 元数据）
  └─ 添加 source_url 字段（1 小时）
```

### Phase B：核心功能完善（优先）
**时间**: 1-2 周

```
Week 1: 任务 #5（任务管理系统前端）
  ├─ Day 1-3: 任务中心页面 + 实时进度
  ├─ Day 4-5: 任务通知系统
  └─ Day 6-7: 测试和优化

Week 2: 任务 #3（安装流完善）+ 任务 #6（MCP Badges）
  ├─ 任务 #3: 依赖任务 #7 的依赖检查
  └─ 任务 #6: 并行开发
```

### Phase C：质量与兼容性提升
**时间**: 1-2 周

```
Week 3: 任务 #7（依赖检查）
Week 4: 任务 #8（E2E 测试补充）
```

### Phase D：性能与发布（中期）
**时间**: 1-2 周

```
Week 5: 任务 #9（性能优化）
Week 6: 任务 #10（Publish Wizard 完整集成）
```

---

## 🎯 关键里程碑（更新）

| 里程碑 | 时间 | 交付物 | 状态 |
|--------|------|--------|------|
| **M0**: 阻断性问题修复 | Day 1 | Publish Wizard + Share Link 修复 | ❌ 待开始 |
| **M1**: 任务管理 UI | Week 1 | 任务中心页面上线 | ❌ 待开始 |
| **M2**: 安装流完善 | Week 2 | 完整安装流程 | ❌ 待开始 |
| **M3**: MCP 集成 | Week 3 | 能力徽章 + 依赖检查 | ❌ 待开始 |
| **M4**: E2E 测试覆盖 | Week 4 | 关键场景测试 | ❌ 待开始 |
| **M5**: 性能提升 | Week 5 | 缓存优化 + API 优化 | ❌ 待开始 |
| **M6**: 发布系统 | Week 6 | Publish Wizard 完整集成 | ❌ 待开始 |

---

## 🚀 立即可以开始的任务

### **推荐从阻断性问题修复开始**

**原因**:
1. ✅ **投入产出比最高** - 修复 Publish Wizard 命令注册只需 5 分钟
2. ✅ **立即可见** - 修复后功能立即可用
3. ✅ **无风险** - 简单的代码添加，不影响其他功能

### **立即执行清单**

```bash
# 1. 修复 Publish Wizard 命令注册（5 分钟）
# 文件：src-tauri/src/lib.rs
# 在 invoke_handler 中添加：
commands::publish::run_publish_preflight,
commands::publish::publish_skill,

# 2. 修复 Share Link 元数据（1 小时）
# 文件：src-tauri/src/models/share.rs
# 在 ShareMetadata 中添加：
pub source_url: Option<String>,
```

### **后续优先级**

**Week 1** 可并行启动：
- **主线程**: 任务 #5（任务管理系统前端）- 🔴 P0
- **副线程 A**: 任务 #6（MCP Badges）- 🟡 P1
- **副线程 B**: 任务 #8（E2E 测试补充）- 🟡 P1

---

## 📞 需要帮助？

如果你准备开始某个任务，我可以帮你：
- 📝 详细的实施步骤和代码示例
- 💻 完整的代码实现
- 🧪 测试用例编写
- 📚 文档撰写

**请告诉我你想从哪个任务开始！** 🚀

---

**文档版本**: 2.0
**最后更新**: 2026-01-24
**更新内容**: 根据代码库实际状态更新完成度
