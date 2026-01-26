import { Page } from '@playwright/test';

/**
 * 测试数据清理助手
 *
 * 提供统一的测试数据清理机制，确保每个测试之间的数据隔离
 */

/**
 * 清理 localStorage 中的所有 E2E 测试数据
 *
 * @param page Playwright Page 对象
 */
export async function clearLocalStorage(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('e2e_tauri_state');
    // 清理其他可能的测试数据
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('e2e_') || key?.startsWith('test_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  });
}

/**
 * 重置测试状态到初始值
 *
 * @param page Playwright Page 对象
 */
export async function resetTestState(page: Page) {
  await page.evaluate(() => {
    const initialState = {
      projectPaths: [],
      skills: [
        // 预置 4 个测试 Skills
        {
          id: 'e2e-test-skill-001',
          name: 'E2E Test Skill',
          description: 'A test skill for E2E testing - 用于端到端测试的 Skill',
          descriptionZh: '用于端到端测试的 Skill',
          descriptionEn: 'A test skill for E2E testing',
          installDate: Date.now() - 86400000,
          localPath: 'C:\\mock\\skills\\e2e-test-skill',
          path: 'C:\\mock\\skills\\e2e-test-skill',
          status: 'safe',
          type: 'system',
          version: '1.0.0',
          enabled: true,
          config: { enabled: true },
          author: 'E2E Test',
          authorAvatar: 'https://github.com/user.png',
          githubUrl: 'https://github.com/test/e2e-test-skill',
          stars: 42,
          forks: 5,
          securityScore: 90,
          qualityScore: 88,
        },
        {
          id: 'e2e-test-risk-001',
          name: 'E2E Risk Skill',
          description: 'A skill with potential security risks - 包含潜在安全风险的 Skill',
          descriptionZh: '包含潜在安全风险的 Skill',
          descriptionEn: 'A skill with potential security risks',
          installDate: Date.now() - 172800000,
          localPath: 'C:\\mock\\skills\\e2e-test-risk',
          path: 'C:\\mock\\skills\\e2e-test-risk',
          status: 'risk',
          type: 'system',
          version: '1.2.0',
          enabled: true,
          config: { enabled: true },
          author: 'Risk Tester',
          authorAvatar: 'https://github.com/risk.png',
          githubUrl: 'https://github.com/test/e2e-test-risk',
          stars: 15,
          forks: 2,
          securityScore: 45,
          qualityScore: 65,
        },
        {
          id: 'e2e-test-blocked-001',
          name: 'E2E Blocked Skill',
          description: 'A blocked skill with dangerous patterns - 包含危险模式而被阻止的 Skill',
          descriptionZh: '包含危险模式而被阻止的 Skill',
          descriptionEn: 'A blocked skill with dangerous patterns',
          installDate: Date.now() - 259200000,
          localPath: 'C:\\mock\\skills\\e2e-test-blocked',
          path: 'C:\\mock\\skills\\e2e-test-blocked',
          status: 'blocked',
          type: 'system',
          version: '0.5.0',
          enabled: false,
          config: { enabled: false },
          author: 'Blocked Tester',
          authorAvatar: 'https://github.com/blocked.png',
          githubUrl: 'https://github.com/test/e2e-test-blocked',
          stars: 3,
          forks: 0,
          securityScore: 10,
          qualityScore: 30,
        },
        {
          id: 'e2e-test-high-quality-001',
          name: 'E2E High Quality Skill',
          description: 'A high-quality skill with excellent documentation - 高质量的 Skill',
          descriptionZh: '高质量的 Skill',
          descriptionEn: 'A high-quality skill with excellent documentation',
          installDate: Date.now() - 43200000,
          localPath: 'C:\\mock\\skills\\e2e-test-high-quality',
          path: 'C:\\mock\\skills\\e2e-test-high-quality',
          status: 'safe',
          type: 'system',
          version: '2.0.0',
          enabled: true,
          config: { enabled: true },
          author: 'Quality Tester',
          authorAvatar: 'https://github.com/quality.png',
          githubUrl: 'https://github.com/test/e2e-test-high-quality',
          stars: 128,
          forks: 24,
          securityScore: 95,
          qualityScore: 92,
        },
      ],
      skillConfigs: {
        'e2e-test-skill-001': { enabled: true },
        'e2e-test-risk-001': { enabled: true },
        'e2e-test-blocked-001': { enabled: false },
        'e2e-test-high-quality-001': { enabled: true },
      },
      securityMode: 'standard',
    };
    localStorage.setItem('e2e_tauri_state', JSON.stringify(initialState));
  });
}

/**
 * 清理测试文件和截图
 *
 * @param testInfo 测试信息对象
 */
export async function clearTestArtifacts(testInfo: any) {
  // 这个函数在测试后自动调用，用于清理截图和视频
  // Playwright 会自动管理这些文件，这里主要用于记录
  console.log(`[test-cleanup] Cleaning up artifacts for ${testInfo.title}`);
}

/**
 * 等待所有异步操作完成
 *
 * @param page Playwright Page 对象
 */
export async function waitForAsyncOperations(page: Page) {
  // 等待所有网络请求完成
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {
    console.log('[test-cleanup] Network idle timeout, continuing...');
  });

  // 等待所有定时器和动画完成
  await page.waitForTimeout(100);

  // 等待 React 状态更新完成
  await page.evaluate(() => {
    return new Promise((resolve) => {
      // 等待下一个事件循环
      setTimeout(resolve, 0);
    });
  });
}

/**
 * 完整的测试清理流程
 *
 * 在每个测试之后调用，确保数据状态一致
 *
 * @param page Playwright Page 对象
 * @param testInfo 测试信息对象
 */
export async function cleanupAfterTest(page: Page, testInfo: any) {
  console.log(`[test-cleanup] Cleaning up after test: ${testInfo.title}`);

  try {
    // 1. 等待所有异步操作完成
    await waitForAsyncOperations(page);

    // 2. 清理 localStorage（或者重置到初始状态）
    if (testInfo.retry) {
      // 如果是重试，重置到初始状态
      await resetTestState(page);
    } else {
      // 否则完全清理
      await clearLocalStorage(page);
    }

    // 3. 清理测试产物
    await clearTestArtifacts(testInfo);

    console.log(`[test-cleanup] Cleanup completed for ${testInfo.title}`);
  } catch (error) {
    console.error(`[test-cleanup] Error during cleanup:`, error);
  }
}

/**
 * 测试前的准备工作
 *
 * @param page Playwright Page 对象
 * @param testInfo 测试信息对象
 */
export async function setupBeforeTest(page: Page, testInfo: any) {
  console.log(`[test-cleanup] Setting up before test: ${testInfo.title}`);

  try {
    // 0. 确保页面已加载（解决 localStorage 访问权限问题）
    if (page.url() === 'about:blank') {
      await page.goto('/');
    }

    // 1. 重置测试状态到初始值
    await resetTestState(page);

    // 2. 刷新页面以确保状态生效
    await page.reload();

    // 3. 等待应用完全加载
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });

    console.log(`[test-cleanup] Setup completed for ${testInfo.title}`);
  } catch (error) {
    console.error(`[test-cleanup] Error during setup:`, error);
  }
}

/**
 * 获取当前测试状态
 *
 * @param page Playwright Page 对象
 * @returns 当前测试状态
 */
export async function getTestState(page: Page): Promise<any> {
  return await page.evaluate(() => {
    const state = localStorage.getItem('e2e_tauri_state');
    return state ? JSON.parse(state) : null;
  });
}
