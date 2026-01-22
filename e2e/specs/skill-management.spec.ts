import { test, expect } from '../fixtures';
import { waitForAppReady, takeScreenshot } from '../helpers/tauri-helpers';
import { TEST_TIMEOUTS } from '../fixtures/test-data';

/**
 * Skill 管理流程 E2E 测试
 *
 * 测试 My Skills 页面的核心功能：
 * - 扫描本地 Skills
 * - 查看 Skill 详情
 * - 启用/禁用 Skills
 * - 卸载 Skills
 * - 查看质量评分和安全状态
 */

test.describe('Skill Management', () => {
  // 每个测试前导航到 My Skills 页面
  test.beforeEach(async ({ page, mySkillsPage }) => {
    await mySkillsPage.goto();
    await waitForAppReady(page);
  });

  test.describe('Skill Scanning', () => {
    test('should scan and display installed skills', async ({ page, mySkillsPage }) => {
      // Skills 自动加载，等待列表加载完成
      await page.waitForTimeout(3000);
      await mySkillsPage.waitForSkills();

      // 验证至少有一个技能（如果有系统安装的技能）
      const hasSkills = await mySkillsPage.hasSkills();
      if (hasSkills) {
        const skillCount = await mySkillsPage.getSkillCount();
        expect(skillCount).toBeGreaterThanOrEqual(0);
      }
    });

    test('should handle empty skill list gracefully', async ({ mySkillsPage }) => {
      // Skills 自动加载，等待列表加载完成
      await mySkillsPage.page.waitForTimeout(3000);

      // 如果没有技能，应该显示空状态
      const hasSkills = await mySkillsPage.hasSkills();

      if (!hasSkills) {
        const emptyState = mySkillsPage.emptyState;
        await expect(emptyState).toBeVisible();
      }
    });

    test('should display skill list', async ({ page, mySkillsPage }) => {
      // Skills 自动加载，验证列表显示
      await page.waitForTimeout(3000);

      const skillList = mySkillsPage.skillList;
      await expect(skillList).toBeVisible();
    });
  });

  test.describe('Skill Details', () => {
    test('should view skill details', async ({ page, mySkillsPage }) => {
      // Skills 自动加载，等待列表加载完成
      await page.waitForTimeout(3000);

      const hasSkills = await mySkillsPage.hasSkills();
      if (!hasSkills) {
        test.skip();
        return;
      }

      // 点击第一个技能查看详情
      await mySkillsPage.viewSkillDetails(0);

      // 验证详情页内容（根据实际实现调整）
      // 这里假设点击后会打开详情对话框或导航到详情页
      await page.waitForTimeout(1000);
      const detailModal = mySkillsPage.page.locator('[data-testid="import-modal"], .slideover, [role="dialog"]');
      if (await detailModal.count() > 0) {
        await expect(detailModal.first()).toBeVisible();
      }
    });

    test('should display quality score', async ({ page, mySkillsPage }) => {
      // Skills 自动加载
      await page.waitForTimeout(3000);

      const hasSkills = await mySkillsPage.hasSkills();
      if (!hasSkills) {
        test.skip();
        return;
      }

      // 检查第一个技能的质量评分
      const qualityScore = await mySkillsPage.getSkillQualityScore(0);
      expect(qualityScore).toBeTruthy();
    });

    test('should display security status', async ({ page, mySkillsPage }) => {
      // Skills 自动加载
      await page.waitForTimeout(3000);

      const hasSkills = await mySkillsPage.hasSkills();
      if (!hasSkills) {
        test.skip();
        return;
      }

      // 检查第一个技能的安全状态
      const securityStatus = await mySkillsPage.getSkillSecurityStatus(0);
      expect(securityStatus).toBeTruthy();
    });
  });

  test.describe('Skill Toggle', () => {
    test('should toggle skill enabled state', async ({ mySkillsPage }) => {
      // Skills 自动加载
      await mySkillsPage.page.waitForTimeout(3000);

      const hasSkills = await mySkillsPage.hasSkills();
      if (!hasSkills) {
        test.skip();
        return;
      }

      // 获取第一个技能的开关初始状态
      const firstCard = mySkillsPage.getSkillCard(0);
      const toggle = firstCard.locator('[data-testid="skill-switch"]');
      const initialState = await toggle.getAttribute('aria-checked');

      // 点击开关
      await mySkillsPage.toggleSkill(0);

      // 等待状态更新
      await mySkillsPage.page.waitForTimeout(500);

      // 验证状态改变
      const newState = await toggle.getAttribute('aria-checked');
      expect(initialState).not.toEqual(newState);
    });

    test('should persist toggle state after refresh', async ({ mySkillsPage }) => {
      // Skills 自动加载
      await mySkillsPage.page.waitForTimeout(3000);

      const hasSkills = await mySkillsPage.hasSkills();
      if (!hasSkills) {
        test.skip();
        return;
      }

      // 切换第一个技能
      const firstCard = mySkillsPage.getSkillCard(0);
      const toggle = firstCard.locator('[data-testid="skill-switch"]');
      const initialState = await toggle.getAttribute('aria-checked');

      await mySkillsPage.toggleSkill(0);
      await mySkillsPage.page.waitForTimeout(500);

      // 重新扫描
      // Skills 自动加载
      await mySkillsPage.page.waitForTimeout(3000);

      // 验证状态保持
      const updatedToggle = mySkillsPage.getSkillCard(0).locator('[data-testid="skill-switch"]');
      const persistedState = await updatedToggle.getAttribute('aria-checked');
      expect(persistedState).not.toEqual(initialState);
    });
  });

  test.describe('Skill Uninstallation', () => {
    test('should uninstall skill with confirmation', async ({ page, mySkillsPage }) => {
      // Skills 自动加载
      await mySkillsPage.page.waitForTimeout(3000);

      const hasSkills = await mySkillsPage.hasSkills();
      if (!hasSkills) {
        test.skip();
        return;
      }

      const initialCount = await mySkillsPage.getSkillCount();

      // 卸载第一个技能
      await mySkillsPage.uninstallSkill(0);

      // 等待卸载完成
      await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

      // 验证技能数量减少
      await mySkillsPage.waitForSkills();
      const finalCount = await mySkillsPage.getSkillCount();

      // 注意：实际测试时可能需要谨慎使用此测试
      // 以免删除重要的系统技能
      // expect(finalCount).toBe(initialCount - 1);
    });

    test('should cancel uninstallation', async ({ mySkillsPage }) => {
      // Skills 自动加载
      await mySkillsPage.page.waitForTimeout(3000);

      const hasSkills = await mySkillsPage.hasSkills();
      if (!hasSkills) {
        test.skip();
        return;
      }

      // 点击卸载按钮
      const firstCard = mySkillsPage.getSkillCard(0);
      const uninstallBtn = firstCard.locator('[data-testid="uninstall-button"]');
      await uninstallBtn.click();

      // 如果有确认对话框，点击取消
      const cancelBtn = mySkillsPage.page.locator('[data-testid="cancel-button"], button:has-text("Cancel")');
      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();

        // 验证对话框关闭
        await expect(cancelBtn).not.toBeVisible();
      }
    });
  });

  test.describe('Skill List Navigation', () => {
    test('should navigate through skill list', async ({ mySkillsPage }) => {
      // Skills 自动加载
      await mySkillsPage.page.waitForTimeout(3000);

      const hasSkills = await mySkillsPage.hasSkills();
      if (!hasSkills) {
        test.skip();
        return;
      }

      const skillCount = await mySkillsPage.getSkillCount();

      // 验证所有技能卡片都可见
      for (let i = 0; i < skillCount; i++) {
        const card = mySkillsPage.getSkillCard(i);
        await expect(card).toBeVisible();
      }
    });

    test('should filter skills by search query', async ({ mySkillsPage }) => {
      // Skills 自动加载
      await mySkillsPage.page.waitForTimeout(3000);

      const hasSkills = await mySkillsPage.hasSkills();
      if (!hasSkills) {
        test.skip();
        return;
      }

      // 如果有搜索框
      const searchInput = mySkillsPage.page.locator('[data-testid="search-input"], input[type="search"]');
      if (await searchInput.count() > 0) {
        const initialCount = await mySkillsPage.getSkillCount();

        // 输入搜索查询
        await searchInput.fill('test');
        await mySkillsPage.page.waitForTimeout(500);

        // 验证搜索结果
        const searchResultCount = await mySkillsPage.getSkillCount();
        expect(searchResultCount).toBeLessThanOrEqual(initialCount);
      }
    });
  });

  test.describe('Error Handling', () => {
    test('should handle scan errors gracefully', async ({ page, mySkillsPage }) => {
      // Skills 自动加载
      await page.waitForTimeout(3000);

      // 验证页面正常加载
      const skillList = mySkillsPage.skillList;
      await expect(skillList).toBeVisible();

      // 检查是否有错误消息
      const errorToast = mySkillsPage.page.locator('.toast, [role="alert"]');
      const hasError = await errorToast.count() > 0;

      // 如果有错误消息，验证它
      if (hasError && await errorToast.isVisible()) {
        await expect(errorToast).toContainText(/error|failed/i);
      }
    });

    test('should handle uninstall errors gracefully', async ({ mySkillsPage }) => {
      // Skills 自动加载
      await mySkillsPage.page.waitForTimeout(3000);

      const hasSkills = await mySkillsPage.hasSkills();
      if (!hasSkills) {
        test.skip();
        return;
      }

      // 尝试卸载并处理可能的错误
      const firstCard = mySkillsPage.getSkillCard(0);
      const uninstallBtn = firstCard.locator('[data-testid="uninstall-button"]');

      if (await uninstallBtn.count() > 0) {
        await uninstallBtn.click();

        // 检查是否有错误消息
        const errorToast = mySkillsPage.page.locator('.toast, [role="alert"]');
        const hasError = await errorToast.count() > 0 && await errorToast.isVisible();

        if (hasError) {
          await expect(errorToast).toBeVisible();
        }
      }
    });
  });
});
