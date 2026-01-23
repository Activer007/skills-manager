# E2E 测试使用指南

## 概述

Skills Manager 使用 Playwright 作为 E2E 测试框架，用于测试应用的端到端功能。

## 环境要求

- Node.js 18+
- npm 或 yarn
- Playwright 浏览器（首次运行时自动安装）

## 安装

### 1. 安装 Playwright 浏览器

```bash
npm run e2e:install
```

这会安装 Chromium 浏览器及其依赖。

### 2. 验证安装

```bash
npx playwright --version
```

## 运行测试

### 运行所有测试

```bash
npm run e2e
```

### UI 模式（推荐用于开发）

UI 模式提供可视化界面，方便调试和编写测试：

```bash
npm run e2e:ui
```

### 调试模式

调试模式会逐步执行测试，并在每步暂停：

```bash
npm run e2e:debug
```

### 环境变量（可选）

在本地调试时可使用以下环境变量：

```powershell
# 断点调试（启动 Playwright Inspector）
$env:PWDEBUG="1"

# 放慢执行速度（单位 ms）
$env:E2E_SLOW_MO="200"
```

### 运行特定测试文件

```bash
npx playwright test e2e/specs/skill-management.spec.ts
```

### 运行特定测试用例

```bash
npx playwright test -g "should scan and display installed skills"
```

## 查看测试报告

测试运行后，会生成 HTML 报告：

```bash
npm run e2e:report
```

报告位于 `playwright-report/index.html`。

## 测试结构

```
e2e/
├── fixtures/          # 测试数据和夹具
│   ├── index.ts       # 扩展的 test 对象
│   └── test-data.ts   # 测试数据常量
├── helpers/           # 辅助函数
│   └── tauri-helpers.ts  # Tauri 特定辅助函数
├── pages/             # 页面对象模型 (POM)
│   ├── base.page.ts
│   ├── my-skills.page.ts
│   ├── marketplace.page.ts
│   └── settings.page.ts
└── specs/             # 测试规范
    ├── example.spec.ts          # 示例测试
    ├── skill-management.spec.ts # Skill 管理测试
    ├── skill-import.spec.ts     # 导入流程测试
    ├── security.spec.ts         # 安全扫描测试
    ├── sharing.spec.ts          # 分享功能测试
    └── settings.spec.ts         # 设置页面测试
```

## 编写测试

### 基础测试示例

```typescript
import { test, expect } from '@playwright/test';

test('my test', async ({ page }) => {
  await page.goto('/my-skills');
  await expect(page).toHaveTitle(/My Skills/);

  await page.click('[data-testid="scan-button"]');
  await expect(page.locator('[data-testid="skill-list"]')).toBeVisible();
});
```

### 使用页面对象模型 (POM)

```typescript
import { test } from '../fixtures';
import { MySkillsPage } from '../pages/my-skills.page';

test('should scan skills', async ({ mySkillsPage }) => {
  await mySkillsPage.goto();
  await mySkillsPage.scanSkills();
  await mySkillsPage.waitForSkills();

  const skillCount = await mySkillsPage.getSkillCount();
  expect(skillCount).toBeGreaterThan(0);
});
```

### 使用 Tauri 辅助函数

```typescript
import { mockFileDialog, waitForAppReady } from '../helpers/tauri-helpers';

test('should import from local', async ({ page }) => {
  // Mock 文件对话框
  await mockFileDialog(page, 'C:\\test\\skill');

  // 等待应用就绪
  await waitForAppReady(page);
});
```

## 添加 data-testid 属性

为了让测试更稳定，请在关键 UI 元素上添加 `data-testid` 属性：

```tsx
<button data-testid="scan-button">Scan Skills</button>
<div data-testid="skill-card">...</div>
<input data-testid="github-url-input" />
```

## 最佳实践

1. **使用 data-testid 而不是 CSS 选择器**
   - ✅ `page.locator('[data-testid="scan-button"]')`
   - ❌ `page.locator('.btn-primary')`

2. **使用页面对象模型 (POM)**
   - 封装页面交互逻辑
   - 提高测试可维护性

3. **使用显式等待**
   - ✅ `await expect(element).toBeVisible()`
   - ❌ `await page.waitForTimeout(5000)`

4. **保持测试独立**
   - 每个测试应该独立运行
   - 不要依赖测试执行顺序

5. **使用描述性测试名称**
   - ✅ `should scan and display installed skills`
   - ❌ `test 1`

## 调试技巧

### 1. 使用 UI 模式

```bash
npm run e2e:ui
```

提供可视化界面，可以：
- 查看每一步执行
- 检查元素状态
- 查看网络请求
- 实时修改测试

### 2. 使用调试模式

```bash
npm run e2e:debug
```

会启动 Playwright Inspector，可以：
- 逐步执行测试
- 检查页面元素
- 查看 locator 状态

### 3. 截图和录屏

失败的测试会自动：
- 截图（`test-results` 目录）
- 录制视频（如果配置了）
- 保存 trace（`trace` 文件）

查看 trace：
```bash
npx playwright show-trace trace.zip
```

### 4. 使用 console.log

```typescript
test('my test', async ({ page }) => {
  console.log('Current URL:', page.url());
  const count = await page.locator('[data-testid="skill-card"]').count();
  console.log('Skill count:', count);
});
```

## 当前测试覆盖

| 测试文件 | 测试用例数 | 状态 |
|---------|----------|------|
| example.spec.ts | 5 | ✅ 基础验证 |
| skill-management.spec.ts | 15+ | ✅ 核心功能 |
| skill-import.spec.ts | 10+ | ✅ 导入流程 |
| security.spec.ts | 12+ | ✅ 安全扫描 |
| sharing.spec.ts | 15+ | ✅ 分享功能 |
| settings.spec.ts | 15+ | ✅ 设置页面 |

**总计**: 70+ 个测试用例

## 注意事项

### Tauri 应用特性

1. **启动时间较长**
   - Tauri 首次编译需要时间
   - 在 `playwright.config.ts` 中设置了 180 秒超时

2. **单 Worker 运行**
   - 避免端口冲突
   - 配置为串行执行

3. **文件系统操作**
   - 使用 Tauri Mock API 模拟文件对话框
   - 不要依赖真实文件系统

4. **Web 环境 Mock**
   - E2E 运行在浏览器环境时会注入 `__TAURI__` / `__TAURI_INTERNALS__` mock
   - 目的是避免因 Tauri API 缺失导致的报错与卡顿

### 跨平台兼容性

- 测试使用平台无关的选择器
- 路径处理使用辅助函数
- 在不同操作系统上运行前需验证

## 故障排除

### 问题 1: 浏览器未安装

```bash
npm run e2e:install
```

### 问题 2: 端口 5173 被占用

```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:5173 | xargs kill -9
```

### 问题 3: Tauri 启动失败

确保 Rust 工具链已安装：
```bash
rustc --version
cargo --version
```

### 问题 4: 测试超时

- 增加超时时间：`test.setTimeout(60000)`
- 检查网络连接
- 查看测试报告中的错误信息

## 下一步

### 短期目标

- [ ] 为所有关键组件添加 `data-testid`
- [ ] 提高测试稳定性（减少误报）
- [ ] 添加更多边界条件测试

### 中期目标

- [ ] 提高测试覆盖率到 80%+
- [ ] 添加性能测试
- [ ] 添加可访问性测试

### 长期目标

- [ ] 配置 CI/CD 自动运行测试
- [ ] 添加视觉回归测试
- [ ] 添加多平台测试

## 参考资源

- [Playwright 官方文档](https://playwright.dev)
- [Tauri WebDriver 文档](https://tauri.app/v2/guides/testing/webdriver/)
- [测试最佳实践](https://playwright.dev/docs/best-practices)

## 贡献指南

添加新测试时：

1. 在对应的 `specs/` 目录下创建测试文件
2. 使用页面对象模型封装交互
3. 添加必要的 `data-testid` 属性
4. 编写描述性的测试名称
5. 在本地运行测试验证
6. 更新此文档

## 联系方式

如有问题或建议，请：
- 提交 Issue
- 发起 Pull Request
- 联系维护者
