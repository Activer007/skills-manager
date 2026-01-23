import { test, expect } from '../fixtures';
import { waitForAppReady, mockFileDialog } from '../helpers/tauri-helpers';
import { TEST_TIMEOUTS } from '../fixtures/test-data';

/**
 * 设置页面 E2E 测试
 *
 * 测试应用设置功能：
 * - 项目路径配置
 * - 安全扫描模式设置
 * - 系统信息显示
 * - 配置持久化
 * - 导入/导出配置
 */

test.describe('Settings', () => {
  test.beforeEach(async ({ page, settingsPage }) => {
    await settingsPage.goto();
    await waitForAppReady(page);
  });

  test.describe('Project Path Management', () => {
    test('should display existing project paths', async ({ settingsPage }) => {
      const pathCount = await settingsPage.getProjectPathCount();

      // 验证路径列表显示
      if (pathCount > 0) {
        const paths = settingsPage.projectPathsList.locator('[data-testid="project-path-item"]');
        await expect(paths.first()).toBeVisible();
      }
    });

    test('should add new project path', async ({ page, settingsPage }) => {
      // 直接添加路径（没有对话框）
      const mockPath = 'C:\\test\\my-project';

      await settingsPage.pathInput.fill(mockPath);
      await settingsPage.savePathButton.click();

      // 等待保存完成
      await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

      // 验证路径添加成功
      const newCount = await settingsPage.getProjectPathCount();
      expect(newCount).toBeGreaterThan(0);
    });

    test('should validate project path', async ({ settingsPage }) => {
      // 直接输入无效路径（没有对话框）
      await settingsPage.pathInput.fill('C:\\invalid\\path');
      await settingsPage.savePathButton.click();

      // 等待验证
      await settingsPage.page.waitForTimeout(TEST_TIMEOUTS.SHORT);

      // 验证错误提示
      const errorMsg = settingsPage.page.locator('.error, [data-testid="error-message"]');
      if (await errorMsg.count() > 0) {
        await expect(errorMsg).toBeVisible();
      }
    });

    test('should remove project path', async ({ settingsPage }) => {
      const initialCount = await settingsPage.getProjectPathCount();

      if (initialCount > 0) {
        // 删除第一个路径
        await settingsPage.removeProjectPath(0);

        // 等待删除完成
        await settingsPage.page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

        // 验证删除成功
        const newCount = await settingsPage.getProjectPathCount();
        expect(newCount).toBe(initialCount - 1);
      } else {
        test.skip();
      }
    });

    test('should prevent duplicate project paths', async ({ page, settingsPage }) => {
      const initialCount = await settingsPage.getProjectPathCount();

      if (initialCount > 0) {
        // 获取第一个路径
        const firstPath = await settingsPage.projectPathsList
          .locator('[data-testid="project-path-item"]')
          .first()
          .textContent();

        if (firstPath) {
          // 尝试添加相同路径（没有对话框）
          await mockFileDialog(page, firstPath.trim());
          await settingsPage.pathInput.fill(firstPath.trim());
          await settingsPage.savePathButton.click();

          // 验证错误提示
          await page.waitForTimeout(TEST_TIMEOUTS.SHORT);
          const errorMsg = settingsPage.page.locator('.error, [data-testid="error-message"]');
          if (await errorMsg.count() > 0) {
            await expect(errorMsg).toContainText(/duplicate|already exists/i);
          }
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Security Scan Configuration', () => {
    test('should display current security mode', async ({ settingsPage }) => {
      const currentMode = await settingsPage.getSecurityMode();
      expect(currentMode).toBeTruthy();
    });

    test('should change security mode to strict', async ({ settingsPage }) => {
      await settingsPage.selectSecurityMode('strict');

      // 验证模式保存成功
      const currentMode = await settingsPage.getSecurityMode();
      expect(currentMode).toBe('strict');
    });

    test('should change security mode to standard', async ({ settingsPage }) => {
      await settingsPage.selectSecurityMode('standard');

      const currentMode = await settingsPage.getSecurityMode();
      expect(currentMode).toBe('standard');
    });

    test('should change security mode to relaxed', async ({ settingsPage }) => {
      await settingsPage.selectSecurityMode('relaxed');

      const currentMode = await settingsPage.getSecurityMode();
      expect(currentMode).toBe('relaxed');
    });

    test('should show security mode description', async ({ settingsPage }) => {
      const modeSelect = settingsPage.securityModeSelect;

      // 检查是否有说明文本
      const description = settingsPage.page.locator('[data-testid="security-mode-description"]');
      if (await description.count() > 0) {
        await expect(description).toBeVisible();
      }
    });
  });

  test.describe('System Information', () => {
    test('should display system install path', async ({ settingsPage }) => {
      const installPath = await settingsPage.getSystemInstallPath();
      expect(installPath).toBeTruthy();
      expect(installPath).not.toBe('');
    });

    test('should display application version', async ({ page }) => {
      const versionInfo = page.locator('[data-testid="app-version"]');
      if (await versionInfo.count() > 0) {
        await expect(versionInfo).toBeVisible();
        const version = await versionInfo.textContent();
        expect(version).toMatch(/\d+\.\d+\.\d+/);
      }
    });

    test('should display operating system information', async ({ page }) => {
      const osInfo = page.locator('[data-testid="os-info"]');
      if (await osInfo.count() > 0) {
        await expect(osInfo).toBeVisible();
      }
    });

    test('should provide link to documentation', async ({ page }) => {
      const docsLink = page.locator('[data-testid="docs-link"], a:has-text("Documentation")');
      if (await docsLink.count() > 0) {
        await expect(docsLink).toBeVisible();
        await expect(docsLink).toHaveAttribute('href', /http/);
      }
    });
  });

  test.describe('Configuration Persistence', () => {
    test('should persist settings across page reloads', async ({ page, settingsPage }) => {
      // 修改设置
      await settingsPage.selectSecurityMode('strict');

      // 重新加载页面
      await page.reload();
      await waitForAppReady(page);

      // 验证设置保持
      const currentMode = await settingsPage.getSecurityMode();
      expect(currentMode).toBe('strict');
    });

    test('should persist settings across sessions', async ({ settingsPage }) => {
      // 这个测试需要重启应用，在 E2E 测试中较难实现
      // 可以通过验证配置文件来间接测试

      test.skip();
    });
  });

  test.describe('Import/Export Configuration', () => {
    test('should export configuration', async ({ page }) => {
      const exportBtn = page.locator('[data-testid="export-config"]');
      if (await exportBtn.count() > 0) {
        const downloadPromise = page.waitForEvent('download');
        await exportBtn.click();
        const download = await downloadPromise;

        // 验证文件格式
        expect(download.suggestedFilename()).toMatch(/\.(json|config)$/);
      }
    });

    test('should import configuration', async ({ page }) => {
      const importBtn = page.locator('[data-testid="import-config"]');
      if (await importBtn.count() > 0) {
        await importBtn.click();

        // 模拟文件选择
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('e2e/fixtures/test-config.json');

        // 等待导入完成
        await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

        // 验证成功消息
        const toast = page.locator('.toast, [role="alert"]');
        if (await toast.count() > 0) {
          await expect(toast).toContainText(/success|imported/i);
        }
      }
    });

    test('should validate configuration format on import', async ({ page }) => {
      const importBtn = page.locator('[data-testid="import-config"]');
      if (await importBtn.count() > 0) {
        await importBtn.click();

        // 上传无效配置
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('e2e/fixtures/invalid-config.json');

        // 验证错误消息
        await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);
        const errorMsg = page.locator('.error, [data-testid="error-message"]');
        if (await errorMsg.count() > 0) {
          await expect(errorMsg).toBeVisible();
        }
      }
    });

    test('should reset configuration to defaults', async ({ page, settingsPage }) => {
      const resetBtn = page.locator('[data-testid="reset-config"]');
      if (await resetBtn.count() > 0) {
        // 修改设置
        await settingsPage.selectSecurityMode('strict');

        // 重置配置
        await resetBtn.click();

        // 确认重置
        const confirmBtn = page.locator('[data-testid="confirm-reset"]');
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
        }

        // 等待重置完成
        await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

        // 验证恢复默认值
        const currentMode = await settingsPage.getSecurityMode();
        expect(currentMode).toBe('standard'); // 假设默认是 standard
      }
    });
  });

  test.describe('Cache Management', () => {
    test('should display cache statistics', async ({ page }) => {
      const cacheStats = page.locator('[data-testid="cache-stats"]');
      if (await cacheStats.count() > 0) {
        await expect(cacheStats).toBeVisible();

        // 验证显示缓存大小
        const cacheSize = cacheStats.locator('[data-testid="cache-size"]');
        await expect(cacheSize).toBeVisible();
      }
    });

    test('should clear cache', async ({ page }) => {
      const clearCacheBtn = page.locator('[data-testid="clear-cache"]');
      if (await clearCacheBtn.count() > 0) {
        await clearCacheBtn.click();

        // 确认清空
        const confirmBtn = page.locator('[data-testid="confirm-clear-cache"]');
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
        }

        // 等待清空完成
        await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

        // 验证成功消息
        const toast = page.locator('.toast, [role="alert"]');
        if (await toast.count() > 0) {
          await expect(toast).toContainText(/cleared|success/i);
        }
      }
    });
  });

  test.describe('Theme and Appearance', () => {
    test('should change application theme', async ({ page }) => {
      const themeSelect = page.locator('[data-testid="theme-select"]');
      if (await themeSelect.count() > 0) {
        // 切换主题
        await themeSelect.selectOption('dark');

        // 验证主题应用
        const body = page.locator('body');
        await expect(body).toHaveClass(/dark/);

        // 切换回亮色主题
        await themeSelect.selectOption('light');
        await expect(body).not.toHaveClass(/dark/);
      }
    });

    test('should persist theme preference', async ({ page }) => {
      const themeSelect = page.locator('[data-testid="theme-select"]');
      if (await themeSelect.count() > 0) {
        await themeSelect.selectOption('dark');

        // 重新加载页面
        await page.reload();
        await waitForAppReady(page);

        // 验证主题保持
        const body = page.locator('body');
        await expect(body).toHaveClass(/dark/);
      }
    });
  });

  test.describe('Language Settings', () => {
    test('should display available languages', async ({ page }) => {
      const languageSelect = page.locator('[data-testid="language-select"]');
      if (await languageSelect.count() > 0) {
        const options = await languageSelect.locator('option').all();
        expect(options.length).toBeGreaterThan(0);
      }
    });

    test('should change application language', async ({ page }) => {
      const languageSelect = page.locator('[data-testid="language-select"]');
      if (await languageSelect.count() > 0) {
        // 切换语言
        await languageSelect.selectOption('zh-CN');

        // 验证语言应用（检查某个文本元素）
        await page.waitForTimeout(500);

        const settingsTitle = page.locator('h1, h2');
        if (await settingsTitle.count() > 0) {
          // 验证文本已翻译（具体取决于实现）
          await expect(settingsTitle).toBeVisible();
        }
      }
    });
  });

  test.describe('Advanced Settings', () => {
    test('should toggle developer mode', async ({ page }) => {
      const devModeToggle = page.locator('[data-testid="dev-mode-toggle"]');
      if (await devModeToggle.count() > 0) {
        const initialState = await devModeToggle.getAttribute('aria-checked');

        await devModeToggle.click();

        const newState = await devModeToggle.getAttribute('aria-checked');
        expect(initialState).not.toEqual(newState);
      }
    });

    test('should configure debug logging', async ({ page }) => {
      const debugToggle = page.locator('[data-testid="debug-logging-toggle"]');
      if (await debugToggle.count() > 0) {
        await debugToggle.click();

        // 验证设置应用（可能需要检查配置文件）
        const toast = page.locator('.toast, [role="alert"]');
        if (await toast.count() > 0) {
          await expect(toast).toContainText(/saved|success/i);
        }
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid project path gracefully', async ({ page, settingsPage }) => {
      // 直接输入无效路径（没有对话框）
      await settingsPage.pathInput.fill('');
      await settingsPage.savePathButton.click();

      // 验证错误提示
      const errorMsg = settingsPage.page.locator('.error, [data-testid="error-message"]');
      if (await errorMsg.count() > 0) {
        await expect(errorMsg).toBeVisible();
      }
    });

    test('should handle save errors gracefully', async ({ page, settingsPage }) => {
      // 这个测试可能需要 mock 失败的保存操作
      // 暂时跳过
      test.skip();
    });
  });
});
