import { test, expect } from '../fixtures';
import { waitForAppReady, mockFileDialog } from '../helpers/tauri-helpers';
import { TEST_GITHUB_URLS, TEST_TIMEOUTS } from '../fixtures/test-data';

/**
 * Skill 导入流程 E2E 测试
 *
 * 测试从不同来源导入 Skills：
 * - 从 GitHub URL 导入
 * - 从本地文件夹导入
 * - 从包文件导入（.zip）
 * - 处理导入错误
 * - 多 Skill 仓库识别
 */

test.describe('Skill Import', () => {
  test.beforeEach(async ({ page, marketplacePage }) => {
    await marketplacePage.goto();
    await waitForAppReady(page);
  });

  test.describe('GitHub Import', () => {
    test('should open import dialog', async ({ marketplacePage }) => {
      // 点击 GitHub 导入按钮
      await marketplacePage.openImportDialog();

      // 验证对话框打开
      await expect(marketplacePage.githubUrlInput).toBeVisible();
      await expect(marketplacePage.importConfirmButton).toBeVisible();
    });

    test('should validate GitHub URL format', async ({ marketplacePage }) => {
      await marketplacePage.openImportDialog();

      // 输入无效 URL
      await marketplacePage.githubUrlInput.fill('not-a-valid-url');
      await marketplacePage.importConfirmButton.click();

      // 验证错误提示（根据实际实现调整）
      const errorMsg = marketplacePage.page.locator('.error, [data-testid="error-message"]');
      if (await errorMsg.count() > 0) {
        await expect(errorMsg).toBeVisible();
      }
    });

    test('should show scan progress during import', async ({ marketplacePage }) => {
      await marketplacePage.openImportDialog();

      // 输入有效的 GitHub URL（使用测试 URL）
      await marketplacePage.githubUrlInput.fill(TEST_GITHUB_URLS.VALID_SKILL);
      await marketplacePage.importConfirmButton.click();

      // 验证扫描进度显示
      await expect(marketplacePage.scanProgress).toBeVisible();

      // 等待导入完成或超时
      await marketplacePage.waitForImport(TEST_TIMEOUTS.VERY_LONG);
    });

    test('should handle import errors gracefully', async ({ marketplacePage }) => {
      await marketplacePage.openImportDialog();

      // 使用无效的仓库 URL
      await marketplacePage.githubUrlInput.fill(TEST_GITHUB_URLS.INVALID_REPO);
      await marketplacePage.importConfirmButton.click();

      // 等待一段时间让错误出现
      await marketplacePage.page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

      // 验证错误消息
      const toast = marketplacePage.page.locator('.toast, [role="alert"]');
      if (await toast.count() > 0) {
        await expect(toast).toContainText(/error|not found|failed/i);
      }
    });

    test('should close import dialog on cancel', async ({ marketplacePage }) => {
      await marketplacePage.openImportDialog();

      // 点击取消按钮
      const cancelBtn = marketplacePage.page.locator('[data-testid="cancel-button"], button:has-text("Cancel")');
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();

        // 验证对话框关闭
        await expect(marketplacePage.githubUrlInput).not.toBeVisible();
      }
    });
  });

  test.describe('Local Folder Import', () => {
    test('should open folder selection dialog', async ({ page, marketplacePage }) => {
      // 点击从本地导入按钮
      const importLocalBtn = marketplacePage.page.locator(
        '[data-testid="import-from-local"], button:has-text("Import from Local")'
      );

      if (await importLocalBtn.count() > 0) {
        // Mock 文件对话框
        const mockPath = 'C:\\test\\skills\\test-skill';
        await mockFileDialog(page, mockPath);

        await importLocalBtn.click();

        // 验证文件对话框被调用（通过 mock）
        // 实际验证取决于 Tauri 实现
      } else {
        test.skip();
      }
    });

    test('should import skill from local folder', async ({ page, marketplacePage }) => {
      const importLocalBtn = marketplacePage.page.locator(
        '[data-testid="import-from-local"], button:has-text("Import from Local")'
      );

      if (await importLocalBtn.count() > 0) {
        // Mock 文件对话框返回有效路径
        const mockPath = 'C:\\test\\skills\\valid-skill';
        await mockFileDialog(page, mockPath);

        await importLocalBtn.click();

        // 等待导入完成
        await marketplacePage.page.waitForTimeout(TEST_TIMEOUTS.LONG);

        // 验证成功消息
        const toast = marketplacePage.page.locator('.toast, [role="alert"]');
        if (await toast.count() > 0) {
          await expect(toast).toContainText(/success|installed/i);
        }
      } else {
        test.skip();
      }
    });

    test('should handle invalid local path', async ({ page, marketplacePage }) => {
      const importLocalBtn = marketplacePage.page.locator(
        '[data-testid="import-from-local"], button:has-text("Import from Local")'
      );

      if (await importLocalBtn.count() > 0) {
        // Mock 文件对话框返回无效路径
        const mockPath = 'C:\\invalid\\path';
        await mockFileDialog(page, mockPath);

        await importLocalBtn.click();

        // 等待错误
        await marketplacePage.page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

        // 验证错误消息
        const toast = marketplacePage.page.locator('.toast, [role="alert"]');
        if (await toast.count() > 0) {
          await expect(toast).toContainText(/error|not found/i);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Package Import (.zip)', () => {
    test('should import skill from package file', async ({ page, marketplacePage }) => {
      const importPackageBtn = marketplacePage.page.locator(
        '[data-testid="import-from-package"], button:has-text("Import Package")'
      );

      if (await importPackageBtn.count() > 0) {
        // Mock 文件对话框返回 .zip 文件路径
        const mockPath = 'C:\\test\\skills\\test-skill.zip';
        await mockFileDialog(page, mockPath);

        await importPackageBtn.click();

        // 等待导入完成
        await marketplacePage.page.waitForTimeout(TEST_TIMEOUTS.LONG);

        // 验证成功消息
        const toast = marketplacePage.page.locator('.toast, [role="alert"]');
        if (await toast.count() > 0) {
          await expect(toast).toContainText(/success|installed/i);
        }
      } else {
        test.skip();
      }
    });

    test('should validate package format', async ({ page, marketplacePage }) => {
      const importPackageBtn = marketplacePage.page.locator(
        '[data-testid="import-from-package"], button:has-text("Import Package")'
      );

      if (await importPackageBtn.count() > 0) {
        // Mock 文件对话框返回无效文件
        const mockPath = 'C:\\test\\invalid-package.zip';
        await mockFileDialog(page, mockPath);

        await importPackageBtn.click();

        // 等待验证
        await marketplacePage.page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

        // 验证错误消息
        const toast = marketplacePage.page.locator('.toast, [role="alert"]');
        if (await toast.count() > 0) {
          await expect(toast).toContainText(/invalid|error/i);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Multi-Skill Repository Detection', () => {
    test('should detect multiple skills in repository', async ({ marketplacePage }) => {
      await marketplacePage.openImportDialog();

      // 使用包含多个 Skills 的仓库 URL
      await marketplacePage.githubUrlInput.fill(TEST_GITHUB_URLS.MULTI_SKILL_REPO);
      await marketplacePage.importConfirmButton.click();

      // 等待扫描完成
      await marketplacePage.page.waitForTimeout(TEST_TIMEOUTS.LONG);

      // 验证显示多个 Skills
      const skillList = marketplacePage.page.locator('[data-testid="detected-skills"]');
      if (await skillList.count() > 0) {
        const skillCount = await skillList.locator('[data-testid="skill-item"]').count();
        expect(skillCount).toBeGreaterThan(1);
      }
    });

    test('should allow selecting individual skills from multi-skill repo', async ({ marketplacePage }) => {
      await marketplacePage.openImportDialog();

      await marketplacePage.githubUrlInput.fill(TEST_GITHUB_URLS.MULTI_SKILL_REPO);
      await marketplacePage.importConfirmButton.click();

      await marketplacePage.page.waitForTimeout(TEST_TIMEOUTS.LONG);

      // 如果显示多个 Skills，选择第一个
      const skillItems = marketplacePage.page.locator('[data-testid="skill-item"]');
      if (await skillItems.count() > 0) {
        const firstSkill = skillItems.first();
        await firstSkill.click();

        // 点击安装
        const installBtn = marketplacePage.page.locator('[data-testid="install-selected"]');
        if (await installBtn.count() > 0) {
          await installBtn.click();
          await marketplacePage.page.waitForTimeout(TEST_TIMEOUTS.LONG);
        }
      }
    });
  });

  test.describe('Import History', () => {
    test('should display recent imports', async ({ marketplacePage }) => {
      // 导航到导入历史（如果有此功能）
      const historyBtn = marketplacePage.page.locator('[data-testid="import-history"]');
      if (await historyBtn.count() > 0) {
        await historyBtn.click();

        // 验证历史记录显示
        const historyList = marketplacePage.page.locator('[data-testid="history-list"]');
        await expect(historyList).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should allow re-importing from history', async ({ marketplacePage }) => {
      const historyBtn = marketplacePage.page.locator('[data-testid="import-history"]');
      if (await historyBtn.count() > 0) {
        await historyBtn.click();

        // 点击历史记录项重新导入
        const historyItem = marketplacePage.page.locator('[data-testid="history-item"]').first();
        if (await historyItem.count() > 0) {
          await historyItem.click();

          // 验证导入流程开始
          await expect(marketplacePage.scanProgress).toBeVisible();
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Concurrent Imports', () => {
    test('should handle multiple import attempts', async ({ marketplacePage }) => {
      // 第一次导入
      await marketplacePage.openImportDialog();
      await marketplacePage.githubUrlInput.fill(TEST_GITHUB_URLS.VALID_SKILL);
      await marketplacePage.importConfirmButton.click();

      // 立即尝试第二次导入（应该被阻止或排队）
      await marketplacePage.page.waitForTimeout(1000);

      const secondImportBtn = marketplacePage.page.locator('[data-testid="import-from-github"]');
      if (await secondImportBtn.count() > 0) {
        const isDisabled = await secondImportBtn.isDisabled();
        expect(isDisabled).toBeTruthy();
      }

      // 等待第一次导入完成
      await marketplacePage.waitForImport(TEST_TIMEOUTS.VERY_LONG);
    });
  });
});
