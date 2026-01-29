# 错误处理和边界情况文档

> **版本**: v1.0 | **最后更新**: 2025-01-29 | **维护者**: Skill Master Team

## 📚 文档概述

本文档描述了 Skill Master 的**错误处理策略**、**已知问题清单**、**边界情况处理**和**错误恢复方法**。

### 错误分类

| 错误类型 | 严重程度 | 触发频率 | 恢复难度 | 示例 |
|---------|---------|---------|---------|------|
| **网络错误** | 🟡 中等 | 中频 | 简单 | GitHub API 连接失败 |
| **权限错误** | 🔴 严重 | 低频 | 中等 | 文件系统权限不足 |
| **数据格式错误** | 🟡 中等 | 低频 | 简单 | SKILL.md 格式错误 |
| **安全风险** | 🔴 严重 | 低频 | 困难 | 命令注入风险 |
| **API 限流** | 🟢 轻微 | 中频 | 中等 | GitHub API 限流 |
| **数据库错误** | 🔴 严重 | 罕见 | 困难 | 数据库损坏 |

---

## 🔴 P0 - 阻断性问题（立即修复）

### ISSUE-001: Dashboard 页面未启用

**问题描述**:
Dashboard 页面已完整实现（221 行代码，功能丰富）但未在 `src/App.tsx` 中配置路由，用户无法访问统计概览。

**影响范围**:
- 所有用户无法查看系统统计
- 管理员无法快速了解系统状态
- 仪表板功能闲置

**修复难度**: ⭐ 极简单（5 分钟工作量）

**修复方法**:
```typescript
// 在 src/App.tsx 中添加路由配置

{
  path: 'dashboard',
  element: <Dashboard />
}
```

**相关文件**:
- 前端: `src/App.tsx`
- 前端: `src/pages/Dashboard.tsx` (已完整实现)

**优先级**: 🔴 P0 - 阻断性

**修复计划**: 立即修复

---

## 🟡 P1 - 严重影响（本周修复）

### ISSUE-002: 合集拖拽排序未完成

**问题描述**:
合集详情页面已支持拖拽 UI（GripVertical 图标），但拖拽逻辑未实现，用户无法重新排序 Skills。

**影响范围**:
- 用户无法按优先级排序合集中的 Skills
- 用户体验不完整

**修复难度**: ⭐⭐⭐ 中等（2-3 小时）

**修复方案**:
使用 `@dnd-kit/core` 库实现拖拽排序：

```typescript
// src/pages/CollectionDetail.tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

function CollectionDetail() {
  const [skills, setSkills] = useState([...]);

  function handleDragEnd(event) {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSkills((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={skills} strategy={verticalListSortingStrategy}>
        {skills.map((skill) => (
          <SortableItem key={skill.id} id={skill.id}>
            <SkillCard skill={skill} />
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
```

**相关文件**:
- 前端: `src/pages/CollectionDetail.tsx`
- 依赖: `@dnd-kit/core`

**优先级**: 🟡 P1 - 严重影响

**修复计划**: 本周修复

---

### ISSUE-003: Token 配置引导缺失

**问题描述**:
GitHub API 有速率限制（未认证用户：60 次/小时），超过后会显示限流错误。用户不知如何配置 GitHub Personal Access Token (PAT)，导致功能受限。

**影响范围**:
- 未配置 Token 的用户频繁遇到限流
- 仓库扫描功能受限
- 用户体验下降

**修复难度**: ⭐⭐ 中等（1-2 小时）

**修复方案**:
添加 GitHub Token 配置向导：

**步骤 1**: 检测到 API 限流时，显示配置引导

**UI 元素**:
```
┌─────────────────────────────────────────┐
│ ⚠️ GitHub API 限流                       │
│                                          │
│ GitHub API 速率限制已用完（60 次/小时）  │
│                                          │
│ 解决方案: 配置 GitHub Personal Access Token │
│ 可提升至 5000 次/小时                    │
│                                          │
│ [配置 Token]  [稍后配置]                │
└─────────────────────────────────────────┘
```

**步骤 2**: 打开配置向导

**UI 元素**:
```
┌─────────────────────────────────────────┐
│ 配置 GitHub Token            [×]       │
├─────────────────────────────────────────┤
│ 步骤 1/3: 生成 Token                     │
│                                          │
│ 1. 访问 GitHub Settings:                 │
│    https://github.com/settings/tokens   │
│                                          │
│ 2. 点击 "Generate new token" → "Classic" │
│                                          │
│ 3. 设置 Token 名称（例如: Skill Master） │
│                                          │
│ 4. 选择权限:                             │
│    ☑ repo (status)                       │
│    ☑ read:org                            │
│                                          │
│ 5. 点击 "Generate token"                 │
│                                          │
│ [上一步]  [下一步]  [取消]              │
└─────────────────────────────────────────┘
```

**步骤 3**: 粘贴 Token

**UI 元素**:
```
┌─────────────────────────────────────────┐
│ 配置 GitHub Token            [×]       │
├─────────────────────────────────────────┤
│ 步骤 2/3: 粘贴 Token                     │
│                                          │
│ 将刚生成的 Token 粘贴到下方:             │
│                                          │
│ [Token 输入框]                           │
│ ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx      │
│                                          │
│ [显示/隐藏]                              │
│                                          │
│ [上一步]  [下一步]  [取消]              │
└─────────────────────────────────────────┘
```

**步骤 4**: 验证并保存

**UI 元素**:
```
┌─────────────────────────────────────────┐
│ 配置 GitHub Token            [×]       │
├─────────────────────────────────────────┤
│ 步骤 3/3: 验证 Token                     │
│                                          │
│ 正在验证 Token...                        │
│ ✅ Token 验证成功！                      │
│                                          │
│ 速率限制: 5000 次/小时                   │
│ 到期时间: Never                          │
│                                          │
│ [完成]  [取消]                          │
└─────────────────────────────────────────┘
```

**相关文件**:
- 前端: `src/pages/Settings.tsx`
- 后端: `src-tauri/src/commands/config.rs` - `save_github_token`

**优先级**: 🟡 P1 - 严重影响

**修复计划**: 本周修复

---

### ISSUE-004: 测试覆盖率不足

**问题描述**:
仅有 5/13 个页面有测试（38%），部分核心功能缺乏测试保障。

**缺失测试的页面**:
- Collections.tsx
- Security.tsx
- TaskCenter.tsx
- Repositories.tsx
- Settings.tsx
- CreatorProfile.tsx
- SharePreview.tsx
- Dashboard.tsx

**影响范围**:
- 代码变更风险高
- 回归测试困难
- 质量保障不足

**修复难度**: ⭐⭐⭐⭐ 较高（1-2 天）

**修复方案**:
逐个页面添加测试用例：

**示例**: `Collections.test.tsx`
```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { Collections } from './Collections';

describe('Collections Page', () => {
  it('应该显示合集列表', async () => {
    render(<Collections />);
    expect(screen.getByText('合集')).toBeInTheDocument();
  });

  it('应该能够创建合集', async () => {
    render(<Collections />);
    fireEvent.click(screen.getByText('创建合集'));
    expect(screen.getByText('合集名称')).toBeInTheDocument();
  });

  it('应该能够删除合集', async () => {
    render(<Collections />);
    // ...
  });
});
```

**测试目标**: 覆盖率 > 80%

**相关文件**:
- 测试: `src/pages/*.test.tsx`

**优先级**: 🟡 P1 - 严重影响

**修复计划**: 本周修复（逐步添加）

---

## 🟢 P2 - 中等影响（本月修复）

### ISSUE-005: CASCADE 删除与已安装 Skill 的矛盾

**问题描述**:
删除仓库时，CASCADE 删除会导致已安装的 Skills 失去市场关联，后续更新不可见。当前逻辑存在矛盾：

- 删除仓库 → CASCADE 删除市场 Skills
- 已安装的 Skills 引用市场 Skills
- 结果：已安装 Skills 失去关联

**影响范围**:
- 用户删除仓库后，已安装 Skills 无法更新
- 数据不一致

**修复难度**: ⭐⭐⭐ 中等（2-4 小时）

**修复方案**:

**方案 1: 软删除**（推荐）
- 删除仓库时，不真正删除记录
- 仅标记 `deleted_at` 字段
- 保留已安装 Skills 的关联

**SQL**:
```sql
ALTER TABLE repositories ADD COLUMN deleted_at TEXT;

-- 删除仓库时
UPDATE repositories SET deleted_at = datetime('now') WHERE name = ?;

-- 查询时过滤
SELECT * FROM repositories WHERE deleted_at IS NULL;
```

**方案 2: 保护已安装 Skills**
- 删除仓库前，检查是否有已安装的 Skills
- 如果有，提示用户确认
- 将已安装 Skills 的 `marketplace_skill_id` 设为 NULL

**SQL**:
```sql
-- 删除仓库前
SELECT COUNT(*) FROM installed_skills
INNER JOIN marketplace_skills ON installed_skills.marketplace_skill_id = marketplace_skills.id
WHERE marketplace_skills.repository_name = ?;

-- 如果 count > 0，提示用户
-- 用户确认后
UPDATE installed_skills SET marketplace_skill_id = NULL
WHERE marketplace_skill_id IN (
    SELECT id FROM marketplace_skills WHERE repository_name = ?
);
```

**相关文件**:
- 后端: `src-tauri/src/commands/repository.rs`
- 数据库: Schema migration

**优先级**: 🟢 P2 - 中等影响

**修复计划**: 本月修复

---

### ISSUE-006: Skill 详情页缺失

**问题描述**:
当前仅通过 SlideOver 查看详情，不支持直接链接访问。用户无法分享 Skill 详情链接。

**影响范围**:
- 用户无法分享 Skill 详情链接
- 搜索引擎无法索引 Skill 详情
- 用户体验不完整

**修复难度**: ⭐⭐ 简单（1-2 小时）

**修复方案**:
添加 `/my-skills/:skillId` 路由：

**步骤 1**: 添加路由
```typescript
// src/App.tsx
{
  path: 'my-skills/:skillId',
  element: <SkillDetail />
}
```

**步骤 2**: 创建详情页组件
```typescript
// src/pages/SkillDetail.tsx
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

export function SkillDetail() {
  const { skillId } = useParams();
  const { data: skill } = useQuery({
    queryKey: ['skill', skillId],
    queryFn: () => invoke('get_skill', { skillId })
  });

  if (!skill) return <div>Loading...</div>;

  return (
    <div>
      <h1>{skill.name}</h1>
      {/* 详情内容 */}
    </div>
  );
}
```

**相关文件**:
- 前端: `src/App.tsx`, `src/pages/SkillDetail.tsx`
- 后端: `src-tauri/src/commands/skill.rs` - `get_skill`

**优先级**: 🟢 P2 - 中等影响

**修复计划**: 本月修复

---

### ISSUE-007: Changelog 功能未实现

**问题描述**:
当前 Changelog 为硬编码测试数据，未从 Git 仓库获取真实历史。

**影响范围**:
- 用户无法查看 Skill 的更新历史
- 功能不完整

**修复难度**: ⭐⭐⭐ 中等（2-3 小时）

**修复方案**:
从 Git 仓库获取 commit 历史：

**后端实现**:
```rust
use git2::Repository;

#[tauri::command]
async fn get_skill_changelog(repo_url: String) -> Result<Vec<Commit>, String> {
    // 克隆仓库（或使用缓存）
    let repo = Repository::open(&skill_path)?;

    // 获取 commit 历史
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    revwalk.push_ref("refs/heads/main")?;

    let mut commits = Vec::new();
    for oid in revwalk {
        let oid = oid?;
        let commit = repo.find_commit(oid)?;

        // 提取 commit 信息
        commits.push(Commit {
            hash: commit.id().to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            message: commit.message().unwrap_or("").to_string(),
            timestamp: commit.time().seconds(),
        });
    }

    Ok(commits)
}
```

**相关文件**:
- 后端: `src-tauri/src/commands/skill.rs` - `get_skill_changelog`
- 依赖: `git2` crate

**优先级**: 🟢 P2 - 中等影响

**修复计划**: 本月修复

---

## 🌐 边界情况处理

### 边界情况 1: 分享链接缺少 source_url

**触发条件**: 旧版分享链接或手动创建的 ShareRecord 缺少 `source_url` 字段

**错误提示**:
```
┌─────────────────────────────────────────┐
│ ⚠️ 无法安装                              │
│                                          │
│ 此分享链接缺少源地址信息，无法安装        │
│                                          │
│ 联系分享者补充信息                        │
│ [关闭]                                  │
└─────────────────────────────────────────┘
```

**恢复方法**: 联系分享者重新生成分享链接

---

### 边界情况 2: 非 GitHub URL

**触发条件**: 分享链接的 `source_url` 不是标准的 GitHub URL

**错误提示**:
```
┌─────────────────────────────────────────┐
│ ⚠️ 非标准 GitHub 链接                    │
│                                          │
│ 此分享链接指向非标准的 GitHub 仓库        │
│ 安装可能失败，请谨慎操作                  │
│                                          │
│ 源地址: https://example.com/repo        │
│                                          │
│ [继续安装]  [取消]                      │
└─────────────────────────────────────────┘
```

**恢复方法**: 用户确认风险后继续安装

---

### 边界情况 3: 仓库包含多个 Skills

**触发条件**: 仓库中有多个子目录包含 `SKILL.md`

**处理策略**:
- **智能提取**: 搜索所有子目录（深度：6 层）
- **批量导入**: 提取所有 Skills，一次性导入
- **用户选择**: 显示 Skills 列表，用户选择要导入的 Skills

**UI 元素**:
```
┌─────────────────────────────────────────┐
│ 发现多个 Skills                          │
├─────────────────────────────────────────┤
│ 在仓库中发现了 3 个 Skills，请选择要导入的 │
│                                          │
│ ☑ frontend-design                       │
│ 📖 前端设计专家...                        │
│                                          │
│ ☑ ui-components                         │
│ 📖 UI 组件库...                          │
│                                          │
│ ☐ css-expert                            │
│ 📖 CSS 专家...                           │
│                                          │
│ [全选]  [全不选]  [导入选定]           │
└─────────────────────────────────────────┘
```

---

### 边界情况 4: 无效的 SKILL.md 格式

**触发条件**: SKILL.md frontmatter 解析失败

**容错策略**:
- **缺失字段**: 使用默认值（version: "1.0.0", author: null）
- **格式错误**: 跳过解析，Skill 内容不受影响
- **完全缺失**: 显示错误，提示用户

**示例**:
```markdown
---
name: frontend-design
description: Frontend expert
# 缺少 version 字段，使用默认值 "1.0.0"
---

# Skill Content
```

---

### 边界情况 5: 磁盘空间不足

**触发条件**: 安装 Skill 时磁盘空间不足

**错误提示**:
```
┌─────────────────────────────────────────┐
│ ❌ 安装失败                              │
│                                          │
│ 磁盘空间不足，无法安装 Skill             │
│                                          │
│ 所需空间: 10 MB                          │
│ 可用空间: 5 MB                           │
│                                          │
│ [清理磁盘]  [重试]  [取消]              │
└─────────────────────────────────────────┘
```

**恢复方法**:
1. 清理磁盘空间
2. 重试安装

---

### 边界情况 6: 网络中断

**触发条件**: 下载 Skill 文件时网络中断

**处理策略**:
- **断点续传**: 记录已下载的字节位置，支持续传
- **自动重试**: 失败后自动重试 3 次
- **用户提示**: 显示友好的错误信息

**UI 元素**:
```
┌─────────────────────────────────────────┐
│ ⚠️ 下载失败                              │
│                                          │
│ 网络连接中断，正在重试... (2/3)          │
│                                          │
│ [取消]  [重试]                          │
└─────────────────────────────────────────┘
```

---

### 边界情况 7: 并发安装相同 Skill

**触发条件**: 用户同时安装 2 个相同名称的 Skills

**处理策略**:
- **版本对比**: 保留版本号较高的 Skill
- **用户确认**: 提示用户选择保留哪个版本
- **自动重命名**: 自动重命名为 `skill-name (1)`, `skill-name (2)`

**UI 元素**:
```
┌─────────────────────────────────────────┐
│ ⚠️ 发现重复的 Skill                      │
│                                          │
│ 您已安装了名为 Frontend Design 的 Skill  │
│                                          │
│ 已安装版本: v1.0.0                       │
│ 新安装版本: v2.0.0                       │
│                                          │
│ 是否覆盖现有版本？                        │
│                                          │
│ [覆盖]  [保留两者]  [取消]              │
└─────────────────────────────────────────┘
```

---

## 🛠️ 错误恢复策略

### 策略 1: 自动重试

**适用错误**: 网络错误、临时性错误

**重试策略**:
- 最多重试 3 次
- 指数退避（1s, 2s, 4s）
- 显示重试进度

**代码示例**:
```typescript
async function installWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await installSkill(url);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

---

### 策略 2: 优雅降级

**适用错误**: 非核心功能失败

**降级策略**:
- **Changelog 加载失败**: 显示"暂无更新历史"
- **评分加载失败**: 显示"评分计算中..."
- **头像加载失败**: 显示默认头像

---

### 策略 3: 用户确认

**适用错误**: 破坏性操作、高风险操作

**确认策略**:
- 删除 Skill 前 → 确认对话框
- 删除来源前 → 提示影响
- 安装有风险的 Skill → 警告提示

---

### 策略 4: 日志记录

**适用错误**: 所有错误

**日志策略**:
- 记录错误堆栈
- 记录用户操作路径
- 记录系统状态

**代码示例**:
```typescript
import { invoke } from '@tauri-apps/api/core';

async function logError(error: Error, context: any) {
  await invoke('log_error', {
    message: error.message,
    stack: error.stack,
    context: JSON.stringify(context),
    timestamp: new Date().toISOString()
  });
}
```

---

## 📊 问题优先级矩阵

| 问题ID | 问题描述 | 严重程度 | 修复难度 | 优先级 | 修复计划 |
|--------|---------|---------|---------|--------|---------|
| **ISSUE-001** | Dashboard 路由缺失 | 🔴 严重 | ⭐ 极简单 | 🔴 P0 | 立即修复 |
| **ISSUE-002** | 合集拖拽排序 | 🟡 中等 | ⭐⭐⭐ 中等 | 🟡 P1 | 本周修复 |
| **ISSUE-003** | Token 配置引导 | 🟡 中等 | ⭐⭐ 中等 | 🟡 P1 | 本周修复 |
| **ISSUE-004** | 测试覆盖率不足 | 🟡 中等 | ⭐⭐⭐⭐ 较高 | 🟡 P1 | 本周修复 |
| **ISSUE-005** | CASCADE 删除矛盾 | 🟢 轻微 | ⭐⭐⭐ 中等 | 🟢 P2 | 本月修复 |
| **ISSUE-006** | 详情页缺失 | 🟢 轻微 | ⭐⭐ 简单 | 🟢 P2 | 本月修复 |
| **ISSUE-007** | Changelog 未实现 | 🟢 轻微 | ⭐⭐⭐ 中等 | 🟢 P2 | 本月修复 |

---

## 🔗 相关文档

- **[01-user-journeys.md](./01-user-journeys.md)** - 5 个用户旅程场景
- **[02-feature-flows.md](./02-feature-flows.md)** - 19 个功能流程场景
- **[03-data-flows.md](./03-data-flows.md)** - 3 个核心数据流
- **[CURRENT_STATUS.md](../../CURRENT_STATUS.md)** - 当前功能状态
- **[rebuild-task-review.md](../../docs/rebuild-task-review.md)** - 技术债务清单

---

## 📝 变更历史

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| 2025-01-29 | v1.0 | 创建错误处理文档，整理 7 个已知问题 | Claude Code |

---

**文档版本**: v1.0
**最后更新**: 2025-01-29
**维护者**: Skill Master Team
