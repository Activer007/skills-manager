# E2E 测试问题清单

**生成日期**: 2026-01-25
**测试框架**: Playwright v1.57.0 + Mock 模式
**测试文件**: 11 个 .spec.ts 文件

## 测试执行摘要

### 当前状态
- **通过 (ok)**: 67 tests
- **跳过 (-)**: 26 tests
- **失败 (x)**: 89 tests
- **总计**: 182 tests
- **通过率**: 43% (67 / 156，排除跳过的测试)

### 详细统计

#### 按测试文件分类

| 测试文件 | 通过 | 跳过 | 失败 | 总计 | 通过率 |
|---------|------|------|------|------|--------|
| example.spec.ts | 4 | 1 | 0 | 5 | 100% |
| settings.spec.ts | 3 | 2 | 3 | 8 | 50% |
| skill-import.spec.ts | 2 | 2 | 4 | 8 | 33% |
| skill-management.spec.ts | 4 | 2 | 4 | 10 | 50% |
| security.spec.ts | 4 | 9 | 5 | 18 | 31% |
| sharing.spec.ts | 14 | 3 | 2 | 19 | 88% |
| share-link-flow.spec.ts | 0 | 23 | 0 | 23 | N/A |
| share-link-real.spec.ts | 0 | 1 | 0 | 1 | N/A |
| task-management.spec.ts | 4 | 0 | 28 | 32 | 13% |
| concurrent-tasks.spec.ts | 1 | 0 | 17 | 18 | 6% |
| share-link-complete-flow.spec.ts | 0 | 3 | 26 | 29 | N/A |

---

## A. 测试代码问题（快速修复）

### A1. 选择器错误
**影响**: 约 30 个测试
**优先级**: P0
**问题描述**: 测试使用的选择器与实际 UI 不匹配

#### 示例
**文件**: `skill-management.spec.ts`
```typescript
// 测试代码: page.locator('[data-testid="quality-score-card"]')
// 实际 UI: 可能缺少该 test-id
```

**修复方案**:
1. 为组件添加缺失的 `data-testid` 属性
2. 更新测试选择器以匹配实际 DOM 结构

**相关测试**:
- `skill-management.spec.ts:82` - should display quality score
- `skill-management.spec.ts:97` - should display security status
- `sharing.spec.ts:24` - should open share dialog
- `sharing.spec.ts:42` - should generate share text

---

### A2. 等待逻辑问题
**影响**: 约 20 个测试
**优先级**: P0
**问题描述**: 测试未正确等待异步操作完成

#### 示例
**文件**: `skill-import.spec.ts`
```typescript
// 当前代码
await page.click('[data-testid="import-skill-button"]');
await expect(page.locator('[data-testid="import-modal"]')).toBeVisible();

// 应该使用
await Promise.all([
  page.waitForSelector('[data-testid="import-modal"]', { state: 'visible' }),
  page.click('[data-testid="import-skill-button"]')
]);
```

**修复方案**:
1. 使用 `Promise.all` 处理导航和对话框打开
2. 添加合理的 `waitForSelector` 等待
3. 增加 `waitForTimeout` 处理动画过渡

**相关测试**:
- `skill-import.spec.ts:23` - should open import dialog
- `task-management.spec.ts:11` - 应该创建导入任务
- `concurrent-tasks.spec.ts:13` - 应该正确处理 2 个并发任务

---

### A3. Mock 数据不完整
**影响**: 约 25 个测试
**优先级**: P0
**问题描述**: Mock 系统缺少某些 Tauri 命令或返回数据格式不正确

#### 示例
**文件**: `e2e/fixtures/index.ts`
```typescript
// 缺少的任务命令
case 'get_tasks': {
  // 需要返回更完整的任务状态数组
  return [
    { id: 'task-001', status: 'pending', ... },
    { id: 'task-002', status: 'running', ... },
    { id: 'task-003', status: 'completed', ... },
    { id: 'task-004', status: 'failed', ... },
    { id: 'task-005', status: 'cancelled', ... }
  ];
}
```

**修复方案**:
1. 扩展 `state.skills` 数组，添加更多测试数据（safe, risk, blocked）
2. 添加任务进度事件模拟（`task-progress`, `task-completed`）
3. 完善 Share Link Mock 数据库

**相关测试**:
- `task-management.spec.ts` - 所有任务管理测试
- `share-link-complete-flow.spec.ts` - 完整流程测试
- `concurrent-tasks.spec.ts` - 并发任务测试

---

### A4. 超时设置不合理
**影响**: 约 10 个测试
**优先级**: P1
**问题描述**: 默认超时时间不足以完成某些操作

**修复方案**:
```typescript
// 增加特定测试的超时时间
test.setTimeout(90 * 1000); // 90 秒
```

**相关测试**:
- `security.spec.ts` - 安全扫描测试
- `skill-import.spec.ts` - GitHub 导入测试

---

## B. 应用代码问题（需要开发）

### B1. 缺少 data-testid 属性
**影响**: 约 40 个测试
**优先级**: P0
**问题描述**: 关键 UI 组件缺少 `data-testid` 属性

#### 需要添加的组件

**ShareSheet 组件** (`src/components/ShareSheet/ShareSheet.tsx`)
```typescript
// 需要添加
- data-testid="share-link-input"
- data-testid="copy-link-button"
- data-testid="share-panel-link"
- data-testid="share-panel-text"
- data-testid="share-panel-image"
- data-testid="share-panel-package"
- data-testid="share-dialog"
```

**SkillCard 组件** (`src/components/SkillCard.tsx`)
```typescript
// 需要添加
- data-testid="skill-card"
- data-testid="share-button"
- data-testid="quality-score-badge"
- data-testid="security-status-badge"
```

**MySkills 页面** (`src/pages/MySkills.tsx`)
```typescript
// 需要添加
- data-testid="import-skill-button"
- data-testid="quality-score-card"
- data-testid="security-status-card"
```

**任务中心组件** (`src/pages/Tasks.tsx` 或类似)
```typescript
// 需要添加
- data-testid="task-card"
- data-testid="task-progress"
- data-testid="task-status"
- data-testid="cancel-task-button"
```

---

### B2. UI 功能未实现
**影响**: 约 15 个测试
**优先级**: P1
**问题描述**: 某些 UI 功能尚未实现

#### 安全模式选择器
**文件**: `src/pages/Settings.tsx` 或 `src/components/SecuritySettings.tsx`
```typescript
// 需要实现
- [data-testid="security-mode-selector"]
- [data-testid="security-mode-strict"]
- [data-testid="security-mode-standard"]
- [data-testid="security-mode-relaxed"]
```

**相关测试**:
- `settings.spec.ts:111` - should display current security mode
- `settings.spec.ts:116` - should change security mode to strict
- `settings.spec.ts:124` - should change security mode to standard

#### 白名单管理界面
**文件**: 可能需要新组件
```typescript
// 需要实现
- [data-testid="whitelist-add-button"]
- [data-testid="whitelist-remove-button"]
- [data-testid="whitelist-entry"]
```

**相关测试**:
- `security.spec.ts:234` - should allow whitelisting skills
- `security.spec.ts:259` - should skip scan for whitelisted skills
- `security.spec.ts:298` - should remove whitelist entries

#### 扫描历史界面
**文件**: 可能需要新组件
```typescript
// 需要实现
- [data-testid="scan-history-list"]
- [data-testid="scan-history-filter"]
- [data-testid="scan-history-export"]
```

**相关测试**:
- `security.spec.ts:324` - should display scan history
- `security.spec.ts:340` - should filter scan history by security level
- `security.spec.ts:368` - should export scan history

---

### B3. Mock API 缺失 transformCallback
**影响**: 所有测试
**优先级**: P2
**问题描述**: 测试日志显示 `window.__TAURI_INTERNALS__.transformCallback is not a function`

**修复方案**:
```typescript
// e2e/fixtures/index.ts
const tauriInternals = window.__TAURI_INTERNALS__ ?? {
  metadata: {
    currentWindow: { label: 'main' },
  },
  transformCallback: (callback, once) => {
    const id = Date.now();
    window.__TAURI_CALLBACKS__ = window.__TAURI_CALLBACKS__ || {};
    window.__TAURI_CALLBACKS__[id] = { callback, once };
    return id;
  },
};
```

---

## C. 测试数据问题

### C1. 缺少多种状态的测试 Skills
**影响**: 约 20 个测试
**优先级**: P0
**问题描述**: 当前只有 1 个安全的测试 Skill，缺少 risk/blocked 状态的

**修复方案**:
```typescript
// e2e/fixtures/index.ts
state.skills = [
  // 现有的 safe skill
  {
    id: 'e2e-test-skill-001',
    status: 'safe',
    securityScore: 90,
    // ...
  },
  // 新增 risk skill
  {
    id: 'e2e-test-risk-001',
    name: 'E2E Risk Skill',
    status: 'risk',
    securityScore: 45,
    // ...
  },
  // 新增 blocked skill
  {
    id: 'e2e-test-blocked-001',
    name: 'E2E Blocked Skill',
    status: 'blocked',
    securityScore: 10,
    // ...
  }
];
```

---

### C2. Share Link Mock 数据不足
**影响**: 约 23 个测试
**优先级**: P0
**问题描述**: Share Link Mock 数据库只有 4 条记录，缺少边界情况

**修复方案**:
```typescript
// e2e/fixtures/index.ts - resolve_share_link
const mockShares = {
  // 现有的
  'mock-share-001': { ... },  // safe skill
  'mock-share-risk-skill': { ... },  // risk skill
  'mock-share-blocked-skill': { ... },  // blocked skill
  'mock-share-no-source': { ... },  // no source_url

  // 新增边界情况
  'mock-share-expired': null,  // 过期链接
  'mock-share-invalid': null,  // 无效链接
  'mock-share-non-github': {   // 非 GitHub URL
    metadata: { source_url: 'https://gitlab.com/test/repo' }
  },
};
```

---

### C3. 任务进度事件模拟不足
**影响**: 约 35 个任务管理测试
**优先级**: P1
**问题描述**: Mock 系统只模拟了一个任务的进度，缺少多任务和失败场景

**修复方案**:
```typescript
// e2e/fixtures/index.ts - import_github_skill_with_progress
case 'import_github_skill_with_progress': {
  const repoUrl = request?.repoUrl ?? '';
  const taskId = `task-${Date.now()}`;

  // 模拟完整生命周期
  const stages = [
    { stage: 'Downloading', progress: 25, delay: 500 },
    { stage: 'Scanning', progress: 50, delay: 1500 },
    { stage: 'Installing', progress: 75, delay: 2500 },
    { stage: 'Completed', progress: 100, delay: 3500 }
  ];

  stages.forEach(({ stage, progress, delay }) => {
    setTimeout(() => {
      if (window.__TAURI__?.core?.emit) {
        window.__TAURI__.core.emit('task-progress', {
          task_id: taskId,
          stage,
          progress,
          message: `${stage}...`
        });
      }
    }, delay);
  });

  // 最终完成事件
  setTimeout(() => {
    if (window.__TAURI__?.core?.emit) {
      window.__TAURI__.core.emit('task-completed', {
        task_id: taskId,
        status: 'completed',
        result: { success: true }
      });
    }
  }, 4000);

  return taskId;
}
```

---

## D. 优先修复建议

### 阶段 1: 快速修复（预期 +30% 通过率）

#### 1.1 扩展测试数据（1 天）
- [ ] 添加 3 个不同状态的测试 Skills（safe, risk, blocked）
- [ ] 扩展 Share Link Mock 数据库（添加 5-6 个边界情况）
- [ ] 完善任务 Mock 数据（添加所有状态的任务）

**文件**: `e2e/fixtures/index.ts`
**预期影响**: 修复约 20 个测试

---

#### 1.2 补充 data-testid（1-2 天）
- [ ] ShareSheet 组件（7 个 test-id）
- [ ] SkillCard 组件（4 个 test-id）
- [ ] MySkills 页面（3 个 test-id）
- [ ] 任务中心组件（5 个 test-id）

**预期影响**: 修复约 30 个测试

---

#### 1.3 修复等待逻辑（1 天）
- [ ] 更新导入流程测试（使用 Promise.all）
- [ ] 添加适当的 waitForSelector
- [ ] 增加超时时间设置

**预期影响**: 修复约 15 个测试

---

### 阶段 2: 功能实现（预期 +20% 通过率）

#### 2.1 安全模式选择器（1 天）
- [ ] 实现安全模式选择 UI
- [ ] 添加对应 test-id
- [ ] 连接到状态管理

**预期影响**: 修复 3 个测试

---

#### 2.2 白名单管理界面（1-2 天）
- [ ] 实现白名单列表 UI
- [ ] 实现添加/移除功能
- [ ] 添加对应 test-id

**预期影响**: 修复 3 个测试

---

#### 2.3 扫描历史界面（1-2 天）
- [ ] 实现扫描历史列表 UI
- [ ] 实现筛选功能
- [ ] 实现导出功能
- [ ] 添加对应 test-id

**预期影响**: 修复 3 个测试

---

### 阶段 3: 高级功能（预期 +10% 通过率）

#### 3.1 增强任务系统（2-3 天）
- [ ] 实现任务进度事件系统
- [ ] 实现任务取消功能
- [ ] 实现并发限制逻辑
- [ ] 实现任务队列功能

**预期影响**: 修复约 25 个任务管理测试

---

#### 3.2 Share Link 完整流程（1-2 天）
- [ ] 实现分享预览页面
- [ ] 实现安装进度显示
- [ ] 实现错误处理和边界情况

**预期影响**: 修复约 15 个 share-link 测试

---

## E. 跳过的测试分析

**跳过的测试总计**: 26 个
**主要原因**:
1. 功能未实现（约 60%）
2. 测试代码不完整（约 30%）
3. 依赖外部服务（约 10%）

### 跳过测试列表

#### Security Scanning - Scan Modes (3 个)
- `should support strict scan mode`
- `should support relaxed scan mode`
- `should support standard scan mode`
**原因**: 安全模式选择器 UI 未实现

#### Security Scanning - Whitelist Management (3 个)
- `should allow whitelisting skills`
- `should skip scan for whitelisted skills`
- `should remove whitelist entries`
**原因**: 白名单管理界面未实现

#### Security Scanning - Scan History (3 个)
- `should display scan history`
- `should filter scan history by security level`
- `should export scan history`
**原因**: 扫描历史界面未实现

#### Share Link Flow (23 个)
- 所有 `share-link-flow.spec.ts` 中的测试
**原因**: Share Link 预览页面功能可能需要更详细的实现

---

## F. 失败测试的常见模式

### 模式 1: Timeout Exceeded
**示例**: `Timed out 60000ms waiting for expect(locator).toBeVisible()`
**原因**:
- 元素不存在或选择器错误
- 异步操作未完成
- 动画过渡未结束

**修复方案**:
- 增加 `waitForSelector` 超时时间
- 使用 `Promise.all` 处理导航
- 添加 `waitForTimeout` 处理动画

---

### 模式 2: Element Not Found
**示例**: `Locator.click: Target closed`
**原因**:
- 元素已被移除或替换
- DOM 结构变化
- 页面导航导致元素消失

**修复方案**:
- 使用更稳定的选择器（data-testid）
- 添加元素存在性检查
- 使用 `waitForSelector` 确保元素存在

---

### 模式 3: Mock Not Implemented
**示例**: `mock invoke <command_name>` 但没有对应实现
**原因**:
- Mock 系统缺少该命令
- 返回数据格式不正确

**修复方案**:
- 在 `e2e/fixtures/index.ts` 添加命令处理
- 确保返回数据格式正确

---

## G. 测试稳定性改进建议

### G1. 添加重试机制
```typescript
test.describe('Feature', () => {
  test.retries(2); // 失败时自动重试 2 次

  test('flaky test', async ({ page }) => {
    // 测试代码
  });
});
```

### G2. 改进等待策略
```typescript
// ❌ 不好的做法
await page.waitForTimeout(5000);

// ✅ 好的做法
await page.waitForSelector('[data-testid="ready-indicator"]', {
  state: 'visible'
});
```

### G3. 使用 Page Object Model
```typescript
// pages/my-skills.page.ts
export class MySkillsPage {
  readonly shareButton = this.page.locator('[data-testid="share-button"]');
  readonly qualityScoreCard = this.page.locator('[data-testid="quality-score-card"]');

  async clickShareButton() {
    await this.shareButton.click();
  }
}
```

---

## H. 下一步行动计划

### 立即执行（本周）
1. ✅ 修复 `concurrent-tasks.spec.ts` 语法错误（已完成）
2. [ ] 扩展测试数据（阶段 1.1）
3. [ ] 补充核心组件的 data-testid（阶段 1.2）

### 短期执行（下周）
4. [ ] 修复等待逻辑（阶段 1.3）
5. [ ] 实现安全模式选择器（阶段 2.1）

### 中期执行（2-3 周）
6. [ ] 实现白名单管理界面（阶段 2.2）
7. [ ] 实现扫描历史界面（阶段 2.3）
8. [ ] 增强任务系统（阶段 3.1）

### 长期执行（1 个月）
9. [ ] 完善 Share Link 完整流程（阶段 3.2）
10. [ ] 完整回归测试和文档更新

---

## I. 成功指标

| 阶段 | 目标通过率 | 预期时间 |
|------|-----------|----------|
| 当前 | 43% | - |
| 阶段 1.1 | 55% | 1 天 |
| 阶段 1.2 | 75% | 2-3 天 |
| 阶段 1.3 | 85% | 3-4 天 |
| 阶段 2 | 90% | 1-2 周 |
| 阶段 3 | 95% | 2-3 周 |

---

## J. 附录：测试命令速查

```bash
# 运行所有测试
npm run e2e

# 运行特定文件
npm run e2e -- e2e/specs/example.spec.ts

# 运行特定测试
npm run e2e -- --grep "should display"

# 调试模式
npm run e2e:debug -- e2e/specs/example.spec.ts

# UI 模式
npm run e2e:ui

# 查看报告
npm run e2e:report

# 只运行失败的测试
npm run e2e -- --repeatEach --workers=1

# 慢速执行（可视化调试）
E2E_SLOW_MO=1000 npm run e2e
```

---

**最后更新**: 2026-01-25
**维护者**: Claude Code
**版本**: v1.0.0
