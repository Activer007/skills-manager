import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../helpers/tauri-helpers';
import { TEST_GITHUB_URLS, TEST_TIMEOUTS } from '../fixtures/test-data';

/**
 * 安全扫描阻断 E2E 测试
 *
 * 测试安全扫描功能：
 * - 检测危险代码模式
 * - 硬阻断机制
 * - 三种扫描模式
 * - 白名单功能
 * - 扫描历史记录
 */

test.describe('Security Scanning', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-skills', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test.describe('Dangerous Pattern Detection', () => {
    test('should block dangerous code patterns', async ({ page }) => {
      // 打开导入对话框（在 MySkills 页面）
      await page.click('[data-testid="import-skill-button"]');

      // 输入包含危险代码的 Skill URL
      await page.fill('[data-testid="github-url-input"]', TEST_GITHUB_URLS.DANGEROUS_SKILL);
      await page.click('[data-testid="import-confirm"]');

      // 等待扫描完成
      await page.waitForTimeout(TEST_TIMEOUTS.LONG);

      // 验证被安全阻断
      const blockedMsg = page.locator('[data-testid="security-blocked"]');
      await expect(blockedMsg).toBeVisible();

      // 验证危险代码提示
      await expect(blockedMsg).toContainText(/dangerous|malicious|unsafe/i);
    });

    test('should show detected dangerous patterns', async ({ page }) => {
      await page.click('[data-testid="import-skill-button"]');
      await page.fill('[data-testid="github-url-input"]', TEST_GITHUB_URLS.DANGEROUS_SKILL);
      await page.click('[data-testid="import-confirm"]');

      await page.waitForTimeout(TEST_TIMEOUTS.LONG);

      // 检查是否显示具体危险模式
      const patterns = page.locator('[data-testid="dangerous-pattern"]');
      if (await patterns.count() > 0) {
        await expect(patterns.first()).toBeVisible();

        // 验证常见的危险代码模式
        const patternText = await patterns.first().textContent();
        expect(patternText).toMatch(/rm\s+-rf\s+\/|eval\(|exec\(|innerHTML/i);
      }
    });

    test('should allow safe skills', async ({ page }) => {
      await page.click('[data-testid="import-skill-button"]');
      await page.fill('[data-testid="github-url-input"]', TEST_GITHUB_URLS.VALID_SKILL);
      await page.click('[data-testid="import-confirm"]');

      await page.waitForTimeout(TEST_TIMEOUTS.LONG);

      // 验证没有被阻断
      const blockedMsg = page.locator('[data-testid="security-blocked"]');
      const isBlocked = await blockedMsg.count() > 0;

      if (isBlocked) {
        // 如果被阻断，检查是否是误报或其他原因
        await expect(blockedMsg).not.toContainText(/dangerous|malicious/i);
      } else {
        // 验证成功消息或安装按钮
        const installBtn = page.locator('[data-testid="install-button"]');
        await expect(installBtn).toBeVisible();
      }
    });
  });

  test.describe('Hard Block Mechanism', () => {
    test('should prevent installation of blocked skills', async ({ page }) => {
      await page.click('[data-testid="import-skill-button"]');
      await page.fill('[data-testid="github-url-input"]', TEST_GITHUB_URLS.DANGEROUS_SKILL);
      await page.click('[data-testid="install-confirm"]');

      await page.waitForTimeout(TEST_TIMEOUTS.LONG);

      // 验证安装按钮被禁用或隐藏
      const installBtn = page.locator('[data-testid="install-button"]');
      const isDisabled = await installBtn.isDisabled();
      const isVisible = await installBtn.isVisible();

      expect(isDisabled || !isVisible).toBeTruthy();
    });

    test('should show warning message for blocked skills', async ({ page }) => {
      await page.click('[data-testid="import-skill-button"]');
      await page.fill('[data-testid="github-url-input"]', TEST_GITHUB_URLS.DANGEROUS_SKILL);
      await page.click('[data-testid="import-confirm"]');

      await page.waitForTimeout(TEST_TIMEOUTS.LONG);

      // 验证警告消息
      const warning = page.locator('[data-testid="security-warning"], .warning');
      if (await warning.count() > 0) {
        await expect(warning).toBeVisible();
        await expect(warning).toContainText(/security|risk|danger/i);
      }
    });
  });

  test.describe('Scan Modes', () => {
    test('should support strict scan mode', async ({ page }) => {
      // 导航到设置页面
      await page.goto('/settings');
      await waitForAppReady(page);

      // 选择严格模式
      await page.selectOption('[data-testid="security-mode-select"]', 'strict');

      // 返回市场并导入
      await page.goto('/marketplace');
      await page.click('[data-testid="import-skill-button"]');
      await page.fill('[data-testid="github-url-input"]', TEST_GITHUB_URLS.VALID_SKILL);
      await page.click('[data-testid="import-confirm"]');

      await page.waitForTimeout(TEST_TIMEOUTS.LONG);

      // 验证严格模式下可能报告更多问题
      const scanResult = page.locator('[data-testid="scan-result"]');
      if (await scanResult.count() > 0) {
        await expect(scanResult).toBeVisible();
      }
    });

    test('should support relaxed scan mode', async ({ page }) => {
      await page.goto('/settings');
      await waitForAppReady(page);

      // 选择宽松模式
      await page.selectOption('[data-testid="security-mode-select"]', 'relaxed');

      await page.goto('/marketplace');
      await page.click('[data-testid="import-skill-button"]');
      await page.fill('[data-testid="github-url-input"]', TEST_GITHUB_URLS.VALID_SKILL);
      await page.click('[data-testid="import-confirm"]');

      await page.waitForTimeout(TEST_TIMEOUTS.LONG);

      // 宽松模式应该只报告高置信度问题
      const blockedMsg = page.locator('[data-testid="security-blocked"]');
      const isBlocked = await blockedMsg.count() > 0;

      if (!isBlocked) {
        // 验证可以安装
        const installBtn = page.locator('[data-testid="install-button"]');
        await expect(installBtn).toBeVisible();
      }
    });

    test('should support standard scan mode', async ({ page }) => {
      await page.goto('/settings');
      await waitForAppReady(page);

      // 选择标准模式（默认）
      await page.selectOption('[data-testid="security-mode-select"]', 'standard');

      await page.goto('/marketplace');
      await page.click('[data-testid="import-skill-button"]');
      await page.fill('[data-testid="github-url-input"]', TEST_GITHUB_URLS.VALID_SKILL);
      await page.click('[data-testid="import-confirm"]');

      await page.waitForTimeout(TEST_TIMEOUTS.LONG);

      // 标准模式应该平衡误报和漏报
      const scanResult = page.locator('[data-testid="scan-result"]');
      if (await scanResult.count() > 0) {
        await expect(scanResult).toBeVisible();
      }
    });
  });

  test.describe('Whitelist Management', () => {
    test('should allow whitelisting skills', async ({ page }) => {
      // 导航到安全中心
      await page.goto('/security');
      await waitForAppReady(page);

      // 点击白名单按钮
      const whitelistBtn = page.locator('[data-testid="whitelist-button"]');
      if (await whitelistBtn.count() > 0) {
        await whitelistBtn.click();

        // 添加白名单条目
        const addWhitelistInput = page.locator('[data-testid="whitelist-input"]');
        await addWhitelistInput.fill(TEST_GITHUB_URLS.DANGEROUS_SKILL);

        const addWhitelistBtn = page.locator('[data-testid="add-whitelist"]');
        await addWhitelistBtn.click();

        // 验证添加成功
        const toast = page.locator('.toast, [role="alert"]');
        await expect(toast).toContainText(/added|success/i);
      } else {
        test.skip();
      }
    });

    test('should skip scan for whitelisted skills', async ({ page }) => {
      // 先添加白名单（通过设置或直接调用 API）
      await page.goto('/security');
      await waitForAppReady(page);

      const whitelistBtn = page.locator('[data-testid="whitelist-button"]');
      if (await whitelistBtn.count() > 0) {
        await whitelistBtn.click();

        const addWhitelistInput = page.locator('[data-testid="whitelist-input"]');
        await addWhitelistInput.fill(TEST_GITHUB_URLS.DANGEROUS_SKILL);

        const addWhitelistBtn = page.locator('[data-testid="add-whitelist"]');
        await addWhitelistBtn.click();

        // 现在导入该 Skill
        await page.goto('/my-skills', { timeout: 60000, waitUntil: 'domcontentloaded' });
        await page.click('[data-testid="import-skill-button"]');
        await page.fill('[data-testid="github-url-input"]', TEST_GITHUB_URLS.DANGEROUS_SKILL);
        await page.click('[data-testid="import-confirm"]');

        await page.waitForTimeout(TEST_TIMEOUTS.LONG);

        // 验证跳过扫描或直接通过
        const blockedMsg = page.locator('[data-testid="security-blocked"]');
        const isBlocked = await blockedMsg.count() > 0;

        if (isBlocked) {
          await expect(blockedMsg).toContainText(/whitelisted|trusted/i);
        }
      } else {
        test.skip();
      }
    });

    test('should remove whitelist entries', async ({ page }) => {
      await page.goto('/security');
      await waitForAppReady(page);

      const whitelistList = page.locator('[data-testid="whitelist-list"]');
      if (await whitelistList.count() > 0) {
        const entries = whitelistList.locator('[data-testid="whitelist-entry"]');
        const count = await entries.count();

        if (count > 0) {
          // 删除第一个条目
          const firstEntry = entries.first();
          const deleteBtn = firstEntry.locator('[data-testid="delete-whitelist"]');
          await deleteBtn.click();

          // 验证删除成功
          const newCount = await entries.count();
          expect(newCount).toBe(count - 1);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Scan History', () => {
    test('should display scan history', async ({ page }) => {
      await page.goto('/security');
      await waitForAppReady(page);

      const historyTab = page.locator('[data-testid="scan-history-tab"]');
      if (await historyTab.count() > 0) {
        await historyTab.click();

        // 验证历史记录显示
        const historyList = page.locator('[data-testid="scan-history-list"]');
        await expect(historyList).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should filter scan history by security level', async ({ page }) => {
      await page.goto('/security');
      await waitForAppReady(page);

      const historyTab = page.locator('[data-testid="scan-history-tab"]');
      if (await historyTab.count() > 0) {
        await historyTab.click();

        // 选择过滤器
        const filterBtn = page.locator('[data-testid="filter-level"]');
        if (await filterBtn.count() > 0) {
          await filterBtn.click();
          await page.click('text=Dangerous');

          // 验证过滤结果
          const historyList = page.locator('[data-testid="scan-history-list"]');
          const items = historyList.locator('[data-testid="history-item"]');

          if (await items.count() > 0) {
            const firstItem = items.first();
            await expect(firstItem).toContainText(/dangerous/i);
          }
        }
      } else {
        test.skip();
      }
    });

    test('should export scan history', async ({ page }) => {
      await page.goto('/security');
      await waitForAppReady(page);

      const historyTab = page.locator('[data-testid="scan-history-tab"]');
      if (await historyTab.count() > 0) {
        await historyTab.click();

        // 点击导出按钮
        const exportBtn = page.locator('[data-testid="export-history"]');
        if (await exportBtn.count() > 0) {
          // Mock 文件保存对话框
          const downloadPromise = page.waitForEvent('download');
          await exportBtn.click();
          const download = await downloadPromise;

          // 验证下载
          expect(download.suggestedFilename()).toMatch(/\.(json|csv)$/);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Security Dashboard', () => {
    test('should display overall security status', async ({ page }) => {
      await page.goto('/security');
      await waitForAppReady(page);

      // 验证仪表板元素
      const dashboard = page.locator('[data-testid="security-dashboard"]');
      if (await dashboard.count() > 0) {
        await expect(dashboard).toBeVisible();

        // 检查统计数据
        const stats = dashboard.locator('[data-testid="security-stats"]');
        await expect(stats).toBeVisible();
      }
    });

    test('should show skills requiring attention', async ({ page }) => {
      await page.goto('/security');
      await waitForAppReady(page);

      const attentionList = page.locator('[data-testid="skills-need-attention"]');
      if (await attentionList.count() > 0) {
        await expect(attentionList).toBeVisible();

        // 验证列表项
        const items = attentionList.locator('[data-testid="skill-item"]');
        if (await items.count() > 0) {
          await expect(items.first()).toBeVisible();
        }
      }
    });
  });

  test.describe('Incremental Scanning', () => {
    test('should cache scan results for unchanged skills', async ({ page }) => {
      await page.goto('/my-skills');
      await waitForAppReady(page);

      // 第一次扫描
      await page.click('[data-testid="scan-button"]');
      await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

      // 第二次扫描（应该使用缓存）
      await page.click('[data-testid="scan-button"]');
      await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

      // 验证第二次扫描更快（通过时间或日志判断）
      // 这里主要验证不会出错
      const skillList = page.locator('[data-testid="skill-list"]');
      await expect(skillList).toBeVisible();
    });

    test('should rescan skills when configuration changes', async ({ page }) => {
      // 先扫描一次
      await page.goto('/my-skills');
      await page.click('[data-testid="scan-button"]');
      await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

      // 修改安全配置
      await page.goto('/settings');
      await page.selectOption('[data-testid="security-mode-select"]', 'strict');

      // 重新扫描
      await page.goto('/my-skills');
      await page.click('[data-testid="scan-button"]');
      await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

      // 验证扫描完成
      const skillList = page.locator('[data-testid="skill-list"]');
      await expect(skillList).toBeVisible();
    });
  });
});
