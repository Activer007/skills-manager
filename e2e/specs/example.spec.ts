import { test, expect } from '../fixtures';

/**
 * E2E 测试示例文件
 *
 * 这是一个基础的 "Hello World" 测试，用于验证 Playwright 环境配置是否正确
 */

test.describe('Environment Setup', () => {
  test('should load the application', async ({ page }) => {
    // 访问应用首页 - 使用更长的超时时间
    await page.goto('/', { timeout: 60000, waitUntil: 'domcontentloaded' });

    // 验证页面标题
    await expect(page).toHaveTitle(/skill-manager/i);

    // 验证页面加载成功
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should navigate to My Skills page', async ({ page }) => {
    // 从首页开始
    await page.goto('/');

    // 导航到 My Skills 页面
    await page.click('text=My Skills');

    // 验证 URL
    await expect(page).toHaveURL(/\/my-skills/);

    // 验证页面标题 - 使用更精确的选择器
    const heading = page.locator('h2').filter({ hasText: /My Skills|Skills/i });
    await expect(heading).toBeVisible();
  });

  test('should navigate to Marketplace page', async ({ page }) => {
    // 从首页开始
    await page.goto('/');

    // 导航到 Marketplace 页面
    await page.click('text=Marketplace');

    // 验证 URL
    await expect(page).toHaveURL(/\/marketplace/);

    // 验证页面标题 - 使用更精确的选择器
    const heading = page.locator('h1').filter({ hasText: /Discover Powerful Skills/i });
    await expect(heading).toBeVisible();
  });

  test('should navigate to Settings page', async ({ page }) => {
    // 从首页开始
    await page.goto('/');

    // 导航到 Settings 页面
    await page.click('text=Settings');

    // 验证 URL
    await expect(page).toHaveURL(/\/settings/);

    // 验证页面标题 - 使用更精确的选择器
    const heading = page.locator('h2').filter({ hasText: /Settings/i });
    await expect(heading).toBeVisible();
  });
});

test.describe('Basic Interactions', () => {
  test('should handle basic click interactions', async ({ page }) => {
    await page.goto('/');

    // 点击导航链接
    const navLinks = page.locator('nav a').first();
    await expect(navLinks).toBeVisible();
    await navLinks.click();

    // 验证导航成功
    await expect(page).not.toHaveURL('/');
  });

  test('should handle form input', async ({ page }) => {
    await page.goto('/marketplace');

    // 查找搜索框（如果存在）
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('test skill');
      await expect(searchInput).toHaveValue('test skill');
    } else {
      // 如果搜索框不存在，跳过测试
      test.skip();
    }
  });
});
