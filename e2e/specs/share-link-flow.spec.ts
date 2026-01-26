import { test, expect } from '../fixtures';
import { testShareLinks, TEST_TIMEOUTS } from '../fixtures/test-data';

/**
 * Share Link 流程 E2E 测试
 *
 * 测试分享链接的生成、解析、安装等完整流程
 */

test.describe('Share Link - 生成分享链接', () => {
  test('应该成功生成分享链接', async ({ page, mySkillsPage }) => {
    await mySkillsPage.goto();

    // 点击分享按钮
    await page.click('[data-testid="share-button"]');

    // 等待 ShareSheet 打开
    await expect(page.locator('[data-testid="share-sheet"]')).toBeVisible();

    // 验证分享链接已生成
    const linkInput = page.locator('input[value*="share/"]');
    await expect(linkInput).toBeVisible();
    await expect(linkInput).toHaveValue(/http:\/\/localhost:1420\/share\/mock-share-/);

    // 验证复制链接按钮存在
    const copyButton = page.locator('button:has-text("复制链接")');
    await expect(copyButton).toBeVisible();
  });

  test('应该成功复制分享链接到剪贴板', async ({ page, mySkillsPage }) => {
    await mySkillsPage.goto();

    // 点击分享按钮
    await page.click('[data-testid="share-button"]');

    // 点击复制链接按钮
    const copyButton = page.locator('button:has-text("复制链接")');
    await copyButton.click();

    // 验证 Toast 提示
    const toast = page.locator('.toast:has-text("链接已复制")');
    await expect(toast).toBeVisible();

    // 验证按钮状态变化
    await expect(copyButton).toContainText('已复制', { timeout: TEST_TIMEOUTS.SHORT });
  });
});

test.describe('Share Link - 解析分享链接', () => {
  test('应该成功加载分享预览页面', async ({ page }) => {
    await page.goto(testShareLinks.safeSkill);

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 验证页面标题
    await expect(page.locator('h1')).toContainText('E2E Test Safe Skill');

    // 验证描述显示
    await expect(page.locator('text=A safe test skill for E2E testing')).toBeVisible();

    // 验证安全等级徽章
    await expect(page.locator('text=安全')).toBeVisible();

    // 验证质量评分
    await expect(page.locator('text=90/100')).toBeVisible();

    // 验证源链接
    await expect(page.locator('a[href="https://github.com/test/e2e-test-skill"]')).toBeVisible();

    // 验证安装按钮可用
    const installButton = page.locator('button:has-text("安装 Skill")');
    await expect(installButton).toBeEnabled();
  });

  test('应该显示无效链接错误', async ({ page }) => {
    await page.goto(testShareLinks.invalid);

    // 验证错误消息
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // 验证返回按钮存在
    const backButton = page.locator('button:has-text("返回主页")');
    await expect(backButton).toBeVisible();
  });

  test('应该显示安全警告', async ({ page }) => {
    await page.goto(testShareLinks.riskSkill);

    // 验证安全警告显示
    await expect(page.locator('[data-testid="risk-warning-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="risk-warning-message"]')).toBeVisible();

    // 验证安装按钮仍然可用
    const installButton = page.locator('button:has-text("安装 Skill")');
    await expect(installButton).toBeEnabled();
  });

  test('应该显示已阻止状态', async ({ page }) => {
    await page.goto(testShareLinks.blockedSkill);

    // 验证已阻止提示
    await expect(page.locator('[data-testid="blocked-warning-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="blocked-warning-message"]')).toBeVisible();

    // 验证安装按钮被禁用
    const installButton = page.locator('button:has-text("安装 Skill")');
    await expect(installButton).toBeDisabled();
  });
});

test.describe('Share Link - 安装 Skill', () => {
  test('应该成功安装 Skill（系统级）', async ({ page }) => {
    await page.goto(testShareLinks.safeSkill);

    // 点击安装按钮
    const installButton = page.locator('button:has-text("安装 Skill")');
    await installButton.click();

    // 等待安装确认对话框
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // 选择系统级安装
    await page.click('input[type="radio"][value="system"]');

    // 点击确认
    const confirmButton = page.locator('button:has-text("确认安装")');
    await confirmButton.click();

    // 验证进入安装状态
    await expect(page.locator('text=正在准备')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });

    // 验证进度显示
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();

    // 等待安装完成（mock 4秒）
    await page.waitForTimeout(4500);

    // 验证成功页面
    await expect(page.locator('text=安装成功')).toBeVisible();
    await expect(page.locator('text=已成功安装到您的 Skills 列表')).toBeVisible();
  });

  test('应该支持安装到项目', async ({ page }) => {
    await page.goto(testShareLinks.safeSkill);

    // 点击安装按钮
    await page.click('button:has-text("安装 Skill")');

    // 等待对话框
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // 选择项目级安装
    await page.click('input[type="radio"][value="project"]');

    // 选择项目（如果有）
    const projectSelect = page.locator('select');
    if (await projectSelect.isVisible()) {
      await projectSelect.selectOption({ index: 0 });
    }

    // 点击确认
    await page.click('button:has-text("确认安装")');

    // 验证安装开始
    await expect(page.locator('text=正在准备')).toBeVisible();
  });

  test('应该显示实时安装进度', async ({ page }) => {
    await page.goto(testShareLinks.safeSkill);

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 验证阶段变化
    await expect(page.locator('text=正在下载')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=正在扫描')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=正在安装')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('text=安装完成')).toBeVisible({ timeout: 2000 });

    // 验证进度百分比变化
    const progressText = page.locator('text=/\\d+%/');
    await expect(progressText).toBeVisible();
  });

  test('应该支持取消安装', async ({ page }) => {
    await page.goto(testShareLinks.safeSkill);

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 等待安装开始
    await expect(page.locator('text=正在准备')).toBeVisible();

    // 点击取消
    const cancelButton = page.locator('button:has-text("取消")');
    await cancelButton.click();

    // 验证返回到就绪状态
    await expect(page.locator('text=安装 Skill')).toBeVisible();
  });

  test('应该支持导航到任务中心', async ({ page }) => {
    await page.goto(testShareLinks.safeSkill);

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 点击"后台运行并查看任务中心"
    const viewTasksButton = page.locator('button:has-text("后台运行并查看任务中心")');
    await expect(viewTasksButton).toBeVisible();
    await viewTasksButton.click();

    // 验证导航到任务中心
    await expect(page).toHaveURL(/\/tasks/);
  });
});

test.describe('Share Link - 边界情况', () => {
  test('应该处理缺少 source_url 的情况', async ({ page }) => {
    await page.goto(testShareLinks.noSourceUrl);

    // 验证警告提示
    await expect(page.locator('[data-testid="install-warning-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="install-warning-message"]')).toBeVisible();

    // 验证安装按钮禁用且显示正确文本
    const installButton = page.locator('[data-testid="install-skill-button"]');
    await expect(installButton).toBeDisabled();

    // 验证查看源码按钮不存在
    const viewSourceButton = page.locator('button:has-text("查看源码")');
    await expect(viewSourceButton).not.toBeVisible();
  });

  test('应该处理非 GitHub URL', async ({ page }) => {
    // 使用 mock 修改源地址为非 GitHub URL
    await page.goto(testShareLinks.safeSkill);

    // 注意：这个测试需要后端支持返回非 GitHub URL
    // 当前 mock 只返回 GitHub URLs，所以这个测试是预留的
    // 实际测试时可以通过修改 mock 数据来测试

    // 验证蓝色警告提示
    // await expect(page.locator('text=非标准 GitHub 链接')).toBeVisible();
    // await expect(page.locator('text=安装可能失败，请谨慎操作')).toBeVisible();
  });

  test('应该处理网络错误', async ({ page }) => {
    // Mock 网络错误
    await page.addInitScript(() => {
      const originalInvoke = window.__TAURI__.core.invoke;
      window.__TAURI__.core.invoke = async (command: string, args?: any) => {
        if (command === 'resolve_share_link') {
          throw new Error('Network error');
        }
        return originalInvoke(command, args);
      };
    });

    await page.goto(testShareLinks.safeSkill);

    // 验证错误提示
    await expect(page.locator('text=加载分享内容失败')).toBeVisible();
  });

  test('应该处理安装失败', async ({ page }) => {
    // Mock 安装失败
    await page.addInitScript(() => {
      window.__TAURI__.core.invoke = async (command: string, args?: any) => {
        if (command === 'import_github_skill_with_progress') {
          throw new Error('Failed to clone repository');
        }
        // 使用默认 mock
        return null;
      };
    });

    await page.goto(testShareLinks.safeSkill);
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 验证错误显示
    await expect(page.locator('text=启动安装失败')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });

    // 验证重试按钮
    const retryButton = page.locator('button:has-text("重试")');
    await expect(retryButton).toBeVisible();
  });

  test('应该处理过期的分享链接', async ({ page }) => {
    await page.goto(testShareLinks.expired);

    // 验证过期提示
    await expect(page.locator('[data-testid="error-title"]')).toBeVisible();

    // 验证返回按钮
    await expect(page.locator('button:has-text("返回主页")')).toBeVisible();
  });
});

test.describe('Share Link - 向后兼容', () => {
  test('应该支持使用废弃的 url 字段', async ({ page }) => {
    // 使用 legacy url 字段的分享链接
    await page.goto('http://localhost:1420/share/mock-share-legacy');

    // 验证页面正常加载
    await expect(page.locator('text=E2E Legacy Skill')).toBeVisible();

    // 验证源地址显示（从 url 字段回退）
    await expect(page.locator('a[href="https://github.com/test/legacy-skill"]')).toBeVisible();

    // 验证可以安装
    const installButton = page.locator('button:has-text("安装 Skill")');
    await expect(installButton).toBeEnabled();
  });
});

test.describe('Share Link - UI/UX', () => {
  test('应该正确显示安全等级徽章', async ({ page }) => {
    // 测试 Safe 等级
    await page.goto(testShareLinks.safeSkill);
    await expect(page.locator('.text-green-600')).toBeVisible();

    // 测试 Risk 等级
    await page.goto(testShareLinks.riskSkill);
    await expect(page.locator('.text-yellow-600')).toBeVisible();

    // 测试 Blocked 等级
    await page.goto(testShareLinks.blockedSkill);
    await expect(page.locator('.text-red-600')).toBeVisible();
  });

  test('应该正确显示质量评分', async ({ page }) => {
    await page.goto(testShareLinks.safeSkill);

    // 验证评分显示
    await expect(page.locator('text=90/100')).toBeVisible();

    // 验证星级图标
    await expect(page.locator('svg[data-lucide="star"]')).toBeVisible();
  });

  test('应该正确显示作者信息', async ({ page }) => {
    await page.goto(testShareLinks.safeSkill);

    // 验证作者名称
    await expect(page.locator('text=E2E Test')).toBeVisible();

    // 验证作者标签
    await expect(page.locator('svg[data-lucide="user"]')).toBeVisible();
  });

  test('应该正确显示分享时间', async ({ page }) => {
    await page.goto(testShareLinks.safeSkill);

    // 验证时间标签
    await expect(page.locator('svg[data-lucide="clock"]')).toBeVisible();

    // 验证时间格式（相对时间）
    await expect(page.locator('text=/分享|Shared/')).toBeVisible();
  });
});
