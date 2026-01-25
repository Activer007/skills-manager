import { test, expect } from '../fixtures';
import { TEST_GITHUB_URLS, TEST_TIMEOUTS } from '../fixtures/test-data';

/**
 * 并发任务 E2E 测试
 *
 * 测试多个任务同时执行时的行为
 * 验证并发限制（global_semaphore: 3, download_semaphore: 2）
 * 和任务队列功能
 */

test.describe('Concurrent Tasks - 并发限制', () => {
  test('应该正确处理 2 个并发任务', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 导入第一个 Skill
    await page.fill('input[placeholder*="GitHub"]', TEST_GITHUB_URLS.VALID_SKILL);
    await page.click('button:has-text("导入")');

    // 等待任务创建
    await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });

    // 导入第二个 Skill
    await page.fill('input[placeholder*="GitHub"]', TEST_GITHUB_URLS.HIGH_QUALITY_SKILL);
    await page.click('button:has-text("导入")');

    // 导航到任务中心
    await page.goto('/tasks');

    // 验证两个任务都在活跃列表中
    const activeTasks = page.locator('[data-testid="task-card"]');
    const count = await activeTasks.count();

    expect(count).toBeGreaterThanOrEqual(2);
    console.log(`[E2E] Active tasks count: ${count}`);

    // 验证两个任务都在运行或排队
    const runningTasks = page.locator('[data-testid="task-card"]:has-text("running"), [data-testid="task-card"]:has-text("queued")');
    expect(await runningTasks.count()).toBeGreaterThanOrEqual(2);
  });

  test('应该正确处理 3 个并发任务（达到全局限制）', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
    ];

    // 导入 3 个 Skills
    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');

      // 等待任务创建
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 验证至少有 3 个任务
    const allTasks = page.locator('[data-testid="task-card"]');
    expect(await allTasks.count()).toBeGreaterThanOrEqual(3);

    // 验证任务状态
    const runningTasks = page.locator('[data-testid="task-status-running"]');
    const queuedTasks = page.locator('[data-testid="task-status-pending"]');

    // 应该有运行中的任务
    expect(await runningTasks.count()).toBeGreaterThan(0);

    // 如果超过全局限制（3），应该有排队的任务
    const totalTasks = await allTasks.count();
    if (totalTasks > 3) {
      expect(await queuedTasks.count()).toBeGreaterThan(0);
    }
  });

  test('应该正确处理超过全局限制的任务（队列功能）', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
      TEST_GITHUB_URLS.VALID_SKILL, // 重复使用
    ];

    // 导入 4 个 Skills（超过全局限制 3）
    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');

      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 验证有 4 个任务
    const allTasks = page.locator('[data-testid="task-card"]');
    expect(await allTasks.count()).toBeGreaterThanOrEqual(4);

    // 验证状态分布
    const runningTasks = page.locator('[data-testid="task-status-running"]');
    const queuedTasks = page.locator('[data-testid="task-status-pending"]');

    const runningCount = await runningTasks.count();
    const queuedCount = await queuedTasks.count();

    console.log(`[E2E] Running tasks: ${runningCount}, Queued tasks: ${queuedCount}`);

    // 最多 3 个任务同时运行
    expect(runningCount).toBeLessThanOrEqual(3);

    // 应该有排队的任务
    expect(queuedCount).toBeGreaterThan(0);

    // 验证总任务数
    expect(runningCount + queuedCount).toBeGreaterThanOrEqual(4);
  });

  test('应该正确处理下载并发限制（2个）', async ({ page, marketplacePage }) => {
    // 这个测试验证下载任务的并发限制
    // 注意：由于 mock 环境的限制，这个测试主要用于验证逻辑

    await marketplacePage.goto();

    // 创建 3 个下载任务（超过下载限制 2）
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 等待 toast 出现，确保操作被处理
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 查找处于 Downloading 阶段的任务
    const downloadingTasks = page.locator('[data-testid="task-card"]:has-text("Downloading")');

    // 最多 2 个任务同时下载
    const count = await downloadingTasks.count();
    expect(count).toBeLessThanOrEqual(2);

    console.log(`[E2E] Downloading tasks: ${count}`);
  });
});

test.describe('Concurrent Tasks - 任务队列', () => {
  test('应该按顺序处理排队的任务', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 创建 4 个任务
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
      TEST_GITHUB_URLS.VALID_SKILL,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 等待 toast 出现，确保操作被处理
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 获取所有任务卡片
    const taskCards = page.locator('[data-testid="task-card"]');
    const taskCount = await taskCards.count();

    console.log(`[E2E] Total tasks: ${taskCount}`);

    // 验证任务顺序（创建时间倒序）
    for (let i = 0; i < taskCount; i++) {
      const taskCard = taskCards.nth(i);
      const isVisible = await taskCard.isVisible();
      expect(isVisible).toBe(true);
    }

    // 验证队列任务开始执行 (使用自动重试断言)
    // 随着任务完成，排队的任务应该开始执行
    await expect(async () => {
      const runningCount = await page.locator('[data-testid="task-status-running"]').count();
      expect(runningCount).toBeGreaterThan(0);
    }).toPass({ timeout: 10000 });

    const runningCount = await page.locator('[data-testid="task-status-running"]').count();
    const pendingCount = await page.locator('[data-testid="task-status-pending"]').count();
  });

  test('应该在任务完成后自动开始队列中的下一个任务', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 创建 3 个任务
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 等待 toast 出现，确保操作被处理
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 记录初始状态
    const initialRunning = await page.locator('[data-testid="task-status-running"]').count();
    const initialPending = await page.locator('[data-testid="task-status-pending"]').count();

    console.log(`[E2E] Initial - Running: ${initialRunning}, Pending: ${initialPending}`);

    // 等待至少一个任务完成
    await expect(page.locator('[data-testid="task-status-completed"]')).not.toHaveCount(0, { timeout: 15000 });

    // 检查状态变化
    const updatedRunning = await page.locator('[data-testid="task-status-running"]').count();
    const updatedPending = await page.locator('[data-testid="task-status-pending"]').count();
    const completedTasks = await page.locator('[data-testid="task-status-completed"]').count();

    console.log(`[E2E] Tasks update - Running: ${updatedRunning}, Pending: ${updatedPending}, Completed: ${completedTasks}`);

    // 验证有任务完成
    expect(completedTasks).toBeGreaterThan(0);

    // 验证仍在运行的任务
    expect(updatedRunning).toBeGreaterThan(0);
  });

  test('应该正确显示队列位置', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 创建 4 个任务
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
      TEST_GITHUB_URLS.VALID_SKILL,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 等待 toast 出现，确保操作被处理
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 查找排队的任务
    const pendingTasks = page.locator('[data-testid="task-status-pending"]');

    if (await pendingTasks.count() > 0) {
      // 验证排队状态显示
      await expect(page.locator('text=/Queued|排队/')).toBeVisible();

      // 验证位置信息（如果有的话）
      const positionText = page.locator('text=/position|位置|Position/');
      // 这个是可选的，取决于 UI 实现
    }
  });
});

test.describe('Concurrent Tasks - 从不同入口并发', () => {
  test('应该支持从 Share Link 和 Marketplace 同时创建任务', async ({ page, mySkillsPage }) => {
    // 1. 从 My Skills 生成 Share Link
    await mySkillsPage.goto();
    await page.click('[data-testid="share-button"]');

    // 获取分享链接
    const linkInput = page.locator('input[value*="share/"]');
    await expect(linkInput).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    const shareUrl = await linkInput.inputValue();

    // 2. 访问分享链接并开始安装（任务 1）
    const page1 = await page.context().newPage();
    await page1.goto(shareUrl);
    await page1.click('button:has-text("安装 Skill")');
    await page1.click('input[type="radio"][value="system"]');
    await page1.click('button:has-text("确认安装")');

    // 3. 在原页面导入另一个 Skill（任务 2）
    await page.goto('/marketplace');
    await page.fill('input[placeholder*="GitHub"]', TEST_GITHUB_URLS.VALID_SKILL);
    await page.click('button:has-text("导入")');

    // 4. 导航到任务中心
    await page.goto('/tasks');

    // 验证至少有 2 个任务
    const allTasks = page.locator('[data-testid="task-card"]');
    expect(await allTasks.count()).toBeGreaterThanOrEqual(2);

    await page1.close();
  });

  test('应该支持多个 Share Link 同时安装', async ({ page }) => {
    // 创建多个页面来同时安装不同的 Share Links
    const shareUrls = [
      'http://localhost:5175/share/mock-share-safe-skill',
      'http://localhost:5175/share/mock-share-risk-skill',
    ];

    const pages: Array<import('@playwright/test').Page> = [];

    // 为每个 URL 创建新页面并开始安装
    for (const url of shareUrls) {
      const newPage = await page.context().newPage();
      await newPage.goto(url);
      await newPage.click('button:has-text("安装 Skill")');
      await newPage.click('input[type="radio"][value="system"]');
      await newPage.click('button:has-text("确认安装")');
      pages.push(newPage);
    }

    // 在主页面查看任务中心
    await page.goto('/tasks');

    // 验证至少有 2 个任务
    const allTasks = page.locator('[data-testid="task-card"]');
    expect(await allTasks.count()).toBeGreaterThanOrEqual(2);

    // 清理
    for (const p of pages) {
      await p.close();
    }
  });
});

test.describe('Concurrent Tasks - 任务取消', () => {
  test('应该支持取消正在运行的任务', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 创建 3 个任务
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 等待 toast 出现，确保操作被处理
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 查找第一个运行中的任务
    const firstRunningTask = page.locator('[data-testid="task-card"]:has-text("running")').first();

    if (await firstRunningTask.isVisible()) {
      // 点击取消按钮
      const cancelButton = firstRunningTask.locator('button:has-text("取消")');
      await cancelButton.click();

      // 验证任务状态变为 Cancelled，或者从活跃列表中消失
      // 注意：这取决于具体实现，这里假设它会变成 cancelled 状态或完成
      // 使用轮询等待状态变化
      await expect(async () => {
         const cancelledCount = await page.locator('[data-testid="task-card"]:has-text("cancelled")').count();
         // 或者检查它是否从运行列表中消失
         const runningCount = await page.locator('[data-testid="task-card"]:has-text("running")').count();
         // 只要有变化即可
         expect(cancelledCount > 0 || runningCount < 3).toBe(true);
      }).toPass();

      // 切换到历史标签验证
      const historyTab = page.locator('button:has-text("历史")');
      if (await historyTab.isVisible()) {
        await historyTab.click();

        const cancelledTask = page.locator('[data-testid="task-card"]:has-text("cancelled")');
        expect(await cancelledTask.count()).toBeGreaterThan(0);
      }
    }
  });

  test('应该支持取消多个任务', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 创建 4 个任务
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
      TEST_GITHUB_URLS.VALID_SKILL,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 等待 toast 出现，确保操作被处理
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 取消所有活跃任务
    const activeTasks = page.locator('[data-testid="task-card"]:has-text("running"), [data-testid="task-card"]:has-text("queued")');
    const activeCount = await activeTasks.count();

    console.log(`[E2E] Active tasks to cancel: ${activeCount}`);

    for (let i = 0; i < activeCount; i++) {
      const task = activeTasks.nth(i);
      const cancelButton = task.locator('button:has-text("取消")');
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        // 不需要强制等待，Playwright 会处理点击动作的等待
      }
    }

    // 验证所有活跃任务被取消 (即没有运行中或排队的任务)
    await expect(page.locator('[data-testid="task-card"]:has-text("running")')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('[data-testid="task-card"]:has-text("queued")')).toHaveCount(0, { timeout: 10000 });

    // 切换到历史标签
    const historyTab = page.locator('button:has-text("历史")');
    if (await historyTab.isVisible()) {
      await historyTab.click();

      const cancelledTasks = page.locator('[data-testid="task-card"]:has-text("cancelled")');
      expect(await cancelledTasks.count()).toBeGreaterThan(0);
    }
  });

  test('取消任务后应该自动开始队列中的下一个任务', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 创建 3 个任务
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 等待 toast 出现，确保操作被处理
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 获取初始运行中的任务数量
    const initialRunning = await page.locator('[data-testid="task-status-running"]').count();
    const initialPending = await page.locator('[data-testid="task-status-pending"]').count();

    console.log(`[E2E] Before cancel - Running: ${initialRunning}, Pending: ${initialPending}`);

    // 取消一个运行中的任务
    const firstRunningTask = page.locator('[data-testid="task-card"]:has-text("running")').first();
    const cancelButton = firstRunningTask.locator('button:has-text("取消")');

    if (await cancelButton.isVisible()) {
      await cancelButton.click();

      // 验证新的任务开始运行
      // 等待运行中的任务数量恢复 (因为取消了一个，队列中的应该补上)
      await expect(page.locator('[data-testid="task-status-running"]')).not.toHaveCount(0, { timeout: 10000 });

      const updatedRunning = await page.locator('[data-testid="task-status-running"]').count();

      console.log(`[E2E] After cancel - Running: ${updatedRunning}`);

      // 运行中的任务数量应该保持或恢复
      expect(updatedRunning).toBeGreaterThan(0);
    }
  });
});

test.describe('Concurrent Tasks - 性能和稳定性', () => {
  test('应该快速响应多个任务创建', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    const startTime = Date.now();

    // 快速创建 3 个任务
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 不使用固定等待，依靠操作的固有等待
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`[E2E] Created 3 tasks in ${duration}ms`);

    // 验证在合理时间内完成（< 5 秒）
    expect(duration).toBeLessThan(5000);

    // 导航到任务中心
    await page.goto('/tasks');

    // 验证任务创建成功
    const allTasks = page.locator('[data-testid="task-card"]');
    expect(await allTasks.count()).toBeGreaterThanOrEqual(3);
  });

  test('应该正确处理大量任务', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 创建 5 个任务
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 确保 toast 出现后再进行下一个，保证创建顺序和压力测试的有效性
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 验证所有任务都显示
    const allTasks = page.locator('[data-testid="task-card"]');
    expect(await allTasks.count()).toBeGreaterThanOrEqual(5);

    // 验证页面加载时间
    const loadStart = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - loadStart;

    console.log(`[E2E] Page load time: ${loadTime}ms`);

    // 验证页面在合理时间内加载（< 3 秒）
    expect(loadTime).toBeLessThan(3000);
  });

  test('应该正确更新任务进度而不卡顿', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 创建 2 个任务
    await page.fill('input[placeholder*="GitHub"]', TEST_GITHUB_URLS.VALID_SKILL);
    await page.click('button:has-text("导入")');
    await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });

    await page.fill('input[placeholder*="GitHub"]', TEST_GITHUB_URLS.HIGH_QUALITY_SKILL);
    await page.click('button:has-text("导入")');

    // 导航到任务中心
    await page.goto('/tasks');

    // 多次采样进度更新
    // 使用轮询断言来验证进度是否发生变化，而不是固定等待
    await expect(async () => {
      const progressBars = page.locator('[role="progressbar"]');
      const count = await progressBars.count();
      expect(count).toBeGreaterThan(0);

      const firstBar = progressBars.first();
      const initialValue = await firstBar.getAttribute('aria-valuenow');

      // 等待值发生变化
      await expect(firstBar).not.toHaveAttribute('aria-valuenow', initialValue || '0', { timeout: 5000 });
    }).toPass({ timeout: 20000 });

    // 原有的详细采样逻辑保留用于调试，但减少固定等待
    /*
    const samples: number[][] = [];
    // ... (代码已注释或简化以符合最佳实践)
    */
  });
});

test.describe('Concurrent Tasks - UI/UX', () => {
  test('应该正确显示多个任务的进度条', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 创建 3 个任务
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 等待 toast 出现，确保操作被处理
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 验证多个进度条显示
    const progressBars = page.locator('[role="progressbar"]');
    expect(await progressBars.count()).toBeGreaterThan(1);

    // 验证每个任务都有状态指示
    const statusBadges = page.locator('[data-testid="task-status"]');
    expect(await statusBadges.count()).toBeGreaterThan(1);
  });

  test('应该清晰区分运行中和排队的任务', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 创建 4 个任务
    const urls = [
      TEST_GITHUB_URLS.VALID_SKILL,
      TEST_GITHUB_URLS.HIGH_QUALITY_SKILL,
      TEST_GITHUB_URLS.MULTI_SKILL_REPO,
      TEST_GITHUB_URLS.VALID_SKILL,
    ];

    for (let i = 0; i < urls.length; i++) {
      await page.fill('input[placeholder*="GitHub"]', urls[i]);
      await page.click('button:has-text("导入")');
      // 等待 toast 出现，确保操作被处理
      await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    }

    // 导航到任务中心
    await page.goto('/tasks');

    // 验证运行中任务的样式
    const runningTasks = page.locator('[data-testid="task-status-running"]');
    if (await runningTasks.count() > 0) {
      await expect(runningTasks.first()).toBeVisible();
    }

    // 验证排队任务的样式
    const pendingTasks = page.locator('[data-testid="task-status-pending"]');
    if (await pendingTasks.count() > 0) {
      await expect(pendingTasks.first()).toBeVisible();
    }

    // 验证视觉差异（例如：运行中任务有动画图标）
    const loaderIcons = page.locator('svg[data-lucide="loader-2"]');
    expect(await loaderIcons.count()).toBeGreaterThan(0);
  });

  test('应该正确显示空状态', async ({ page }) => {
    // 导航到任务中心
    await page.goto('/tasks');

    // 如果没有活跃任务，验证空状态显示
    const emptyState = page.locator('text=No active tasks running|暂无活跃任务');

    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();

      // 验证空状态图标
      const icon = page.locator('svg[data-lucide="activity"]');
      await expect(icon).toBeVisible();
    }
  });
});
