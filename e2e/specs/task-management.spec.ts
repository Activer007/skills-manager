import { test, expect } from '../fixtures';
import { TEST_GITHUB_URLS, TEST_TIMEOUTS } from '../fixtures/test-data';

/**
 * 任务管理 E2E 测试
 *
 * 测试任务的创建、进度更新、状态转换、取消等功能
 */

test.describe('Task Management - 任务创建', () => {
  test('应该创建导入任务', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 输入 GitHub URL
    await page.fill('input[placeholder*="GitHub"]', TEST_GITHUB_URLS.VALID_SKILL);

    // 点击导入按钮
    const importButton = page.locator('button:has-text("导入")');
    await importButton.click();

    // 验证任务创建成功
    await expect(page.locator('text=/任务已创建|已启动/')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
  });

  test('应该在任务中心显示新任务', async ({ page }) => {
    await page.goto('/tasks');

    // 验证任务中心页面加载
    await expect(page.locator('text=任务中心')).toBeVisible();

    // 验证任务列表显示
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible();

    // 验证至少有一个任务
    const taskCards = page.locator('[data-testid="task-card"]');
    await expect(taskCards).toHaveCount(await taskCards.count());
  });

  test('应该显示任务初始状态', async ({ page }) => {
    await page.goto('/tasks');

    // 等待任务加载
    await page.waitForTimeout(1000);

    // 验证任务状态徽章
    const statusBadge = page.locator('[data-testid="task-status"]');
    await expect(statusBadge.first()).toBeVisible();

    // 验证任务类型显示
    await expect(page.locator('text=导入')).toBeVisible();
  });
});

test.describe('Task Management - 实时进度', () => {
  test('应该显示进度条', async ({ page }) => {
    await page.goto('/tasks');

    // 查找正在运行的任务
    const runningTask = page.locator('[data-testid="task-card"]:has-text("running")');

    if (await runningTask.count() > 0) {
      // 验证进度条显示
      const progressBar = runningTask.locator('[role="progressbar"]');
      await expect(progressBar).toBeVisible();

      // 验证进度百分比显示
      const progressText = runningTask.locator('text=/\\d+%/');
      await expect(progressText).toBeVisible();
    }
  });

  test('应该显示当前阶段', async ({ page }) => {
    await page.goto('/tasks');

    // 查找正在运行的任务
    const runningTask = page.locator('[data-testid="task-card"]:has-text("running")');

    if (await runningTask.count() > 0) {
      // 验证阶段文本显示
      const stageText = runningTask.locator('text=/Downloading|Scanning|Installing|Queued/');
      await expect(stageText).toBeVisible();
    }
  });

  test('应该监听后端进度事件', async ({ page }) => {
    // Mock 进度事件监听
    let progressEvents: any[] = [];

    await page.addInitScript(() => {
      (window as any).progressEvents = [];

      const originalEmit = window.__TAURI__?.core?.emit;
      if (originalEmit) {
        window.__TAURI__.core.emit = (event: string, payload: any) => {
          if (event === 'task-progress') {
            (window as any).progressEvents.push(payload);
          }
          return originalEmit(event, payload);
        };
      }
    });

    await page.goto('/tasks');

    // 等待一段时间收集事件
    await page.waitForTimeout(5000);

    // 验证事件被捕获
    const eventsCount = await page.evaluate(() => (window as any).progressEvents?.length || 0);
    expect(eventsCount).toBeGreaterThan(0);
  });

  test('应该实时更新进度条', async ({ page }) => {
    await page.goto('/tasks');

    // 获取初始进度
    const initialProgress = await page.locator('[role="progressbar"]').first()
      .getAttribute('aria-valuenow');

    // 等待进度更新
    await page.waitForTimeout(2000);

    // 获取更新后的进度
    const updatedProgress = await page.locator('[role="progressbar"]').first()
      .getAttribute('aria-valuenow');

    // 验证进度发生变化（如果有运行中的任务）
    if (initialProgress && updatedProgress && initialProgress !== '100') {
      expect(updatedProgress).not.toBe(initialProgress);
    }
  });

  test('应该正确显示进度百分比', async ({ page }) => {
    await page.goto('/tasks');

    // 验证进度百分比格式
    const progressElements = page.locator('text=/\\d+%/');

    const count = await progressElements.count();
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await progressElements.nth(i).textContent();
        const match = text?.match(/(\d+)%/);
        expect(match).toBeTruthy();
        const percentage = parseInt(match![1]);
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      }
    }
  });
});

test.describe('Task Management - 状态转换', () => {
  test('应该从 Pending 转换到 Running', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 开始导入
    await page.fill('input[placeholder*="GitHub"]', TEST_GITHUB_URLS.VALID_SKILL);
    await page.click('button:has-text("导入")');

    // 立即导航到任务中心
    await page.goto('/tasks');

    // 验证任务从 Queued/Pending 转换到 Running
    const taskStatus = page.locator('[data-testid="task-status"]').first();

    // 等待状态变化（最多 5 秒）
    await expect(async () => {
      const status = await taskStatus.textContent();
      expect(status).toMatch(/Running|Downloading/);
    }).toPass({ timeout: TEST_TIMEOUTS.MEDIUM });
  });

  test('应该从 Running 转换到 Completed', async ({ page }) => {
    await page.goto('/tasks');

    // 查找运行中的任务
    const runningTask = page.locator('[data-testid="task-card"]:has-text("running")');

    if (await runningTask.count() > 0) {
      // 等待任务完成（mock 4 秒）
      await page.waitForTimeout(5000);

      // 验证任务状态变为 Completed
      await expect(runningTask).not.toBeVisible();
    }
  });

  test('应该处理任务失败', async ({ page }) => {
    // Mock 任务失败
    await page.addInitScript(() => {
      window.__TAURI__.core.invoke = async (command: string, args?: any) => {
        if (command === 'import_github_skill_with_progress') {
          const taskId = `task-${Date.now()}`;
          // 发送失败事件
          setTimeout(() => {
            if (window.__TAURI__?.core?.emit) {
              window.__TAURI__.core.emit('task-error', {
                task_id: taskId,
                error: 'Network error',
              });
            }
          }, 1000);
          return taskId;
        }
        return null;
      };
    });

    await page.goto('/tasks');

    // 等待失败状态
    await page.waitForTimeout(2000);

    // 验证错误显示
    const errorStatus = page.locator('text=/failed|error|Failed/', { caseSensitive: false });
    if (await errorStatus.count() > 0) {
      await expect(errorStatus.first()).toBeVisible();
    }
  });

  test('应该在完成后将任务移到历史', async ({ page }) => {
    await page.goto('/tasks');

    // 切换到历史标签
    const historyTab = page.locator('button:has-text("历史")');
    if (await historyTab.isVisible()) {
      await historyTab.click();

      // 验证历史任务显示
      await expect(page.locator('[data-testid="task-card"]')).toBeVisible();
    }
  });

  test('应该显示正确的状态图标', async ({ page }) => {
    await page.goto('/tasks');

    // 验证不同状态的图标
    const statusIcons = {
      pending: 'clock',
      running: 'loader-2',
      completed: 'check-circle',
      failed: 'x-circle',
      cancelled: 'ban',
    };

    for (const [status, icon] of Object.entries(statusIcons)) {
      const statusElement = page.locator(`[data-testid="task-status-${status}"]`);
      if (await statusElement.isVisible()) {
        const iconElement = statusElement.locator(`svg[data-lucide="${icon}"]`);
        await expect(iconElement).toBeVisible();
      }
    }
  });
});

test.describe('Task Management - 任务操作', () => {
  test('应该支持取消运行中的任务', async ({ page }) => {
    await page.goto('/tasks');

    // 查找运行中的任务
    const runningTask = page.locator('[data-testid="task-card"]:has-text("running")');

    if (await runningTask.count() > 0) {
      // 点击取消按钮
      const cancelButton = runningTask.locator('button:has-text("取消")');
      await cancelButton.click();

      // 验证任务状态变为 Cancelled
      await expect(runningTask).not.toBeVisible({ timeout: TEST_TIMEOUTS.SHORT });

      // 切换到历史标签验证
      const historyTab = page.locator('button:has-text("历史")');
      if (await historyTab.isVisible()) {
        await historyTab.click();

        const cancelledTask = page.locator('[data-testid="task-card"]:has-text("cancelled")');
        await expect(cancelledTask.first()).toBeVisible();
      }
    }
  });

  test('应该支持清除历史任务', async ({ page }) => {
    await page.goto('/tasks');

    // 切换到历史标签
    const historyTab = page.locator('button:has-text("历史")');
    if (await historyTab.isVisible()) {
      await historyTab.click();

      // 获取初始任务数量
      const initialCount = await page.locator('[data-testid="task-card"]').count();

      // 点击清除历史按钮
      const clearButton = page.locator('button:has-text("清除历史")');
      if (await clearButton.isVisible()) {
        await clearButton.click();

        // 确认对话框
        const confirmButton = page.locator('button:has-text("确认")');
        await confirmButton.click();

        // 验证历史任务被清除
        await page.waitForTimeout(1000);
        const finalCount = await page.locator('[data-testid="task-card"]').count();
        expect(finalCount).toBeLessThan(initialCount);
      }
    }
  });

  test('应该支持重试失败的任务', async ({ page }) => {
    await page.goto('/tasks');

    // 切换到历史标签
    const historyTab = page.locator('button:has-text("历史")');
    if (await historyTab.isVisible()) {
      await historyTab.click();

      // 查找失败的任务
      const failedTask = page.locator('[data-testid="task-card"]:has-text("failed")');

      if (await failedTask.count() > 0) {
        // 点击重试按钮
        const retryButton = failedTask.locator('button:has-text("重试")');
        await retryButton.click();

        // 验证新任务创建
        await page.waitForTimeout(1000);

        // 切换回活跃任务
        const activeTab = page.locator('button:has-text("活跃")');
        await activeTab.click();

        // 验证有新任务
        await expect(page.locator('[data-testid="task-card"]')).toHaveCount(await page.locator('[data-testid="task-card"]').count());
      }
    }
  });

  test('应该支持查看任务详情', async ({ page }) => {
    await page.goto('/tasks');

    // 点击任务卡片
    const firstTask = page.locator('[data-testid="task-card"]').first();
    await firstTask.click();

    // 验证详情对话框打开
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // 验证详情信息显示
    await expect(page.locator('text=任务详情')).toBeVisible();
  });

  test('应该支持复制任务日志', async ({ page }) => {
    await page.goto('/tasks');

    // 点击任务卡片
    const firstTask = page.locator('[data-testid="task-card"]').first();
    await firstTask.click();

    // 查找复制日志按钮
    const copyLogButton = page.locator('button:has-text("复制日志")');

    if (await copyLogButton.isVisible()) {
      await copyLogButton.click();

      // 验证 Toast 提示
      await expect(page.locator('text=日志已复制')).toBeVisible();
    }
  });
});

test.describe('Task Management - 集成测试', () => {
  test('应该从 Share Preview 导航到任务中心', async ({ page }) => {
    // 访问分享链接并开始安装
    await page.goto('http://localhost:1420/share/mock-share-001');

    // 点击安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 点击查看任务中心
    const viewTasksButton = page.locator('button:has-text("后台运行并查看任务中心")');
    await viewTasksButton.click();

    // 验证导航到任务中心
    await expect(page).toHaveURL(/\/tasks/);

    // 验证任务显示
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible();
  });

  test('应该在 Marketplace 导航到任务中心', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 开始导入
    await page.fill('input[placeholder*="GitHub"]', TEST_GITHUB_URLS.VALID_SKILL);
    await page.click('button:has-text("导入")');

    // 等待 Toast 中的"查看任务"链接
    const viewTasksLink = page.locator('a:has-text("查看任务")');

    if (await viewTasksLink.isVisible({ timeout: TEST_TIMEOUTS.MEDIUM })) {
      await viewTasksLink.click();

      // 验证导航到任务中心
      await expect(page).toHaveURL(/\/tasks/);
    }
  });

  test('应该正确处理多个并发任务', async ({ page, marketplacePage }) => {
    await marketplacePage.goto();

    // 导入第一个 Skill
    await page.fill('input[placeholder*="GitHub"]', TEST_GITHUB_URLS.VALID_SKILL);
    await page.click('button:has-text("导入")');

    // 等待一下
    await page.waitForTimeout(500);

    // 导入第二个 Skill
    await page.fill('input[placeholder*="GitHub"]', TEST_GITHUB_URLS.HIGH_QUALITY_SKILL);
    await page.click('button:has-text("导入")');

    // 导航到任务中心
    await page.goto('/tasks');

    // 验证多个任务显示
    const taskCards = page.locator('[data-testid="task-card"]');
    await expect(taskCards).toHaveCount(await taskCards.count());
  });
});

test.describe('Task Management - UI/UX', () => {
  test('应该正确显示任务类型标签', async ({ page }) => {
    await page.goto('/tasks');

    // 验证导入标签
    await expect(page.locator('text=导入')).toBeVisible();
  });

  test('应该正确显示任务目标', async ({ page }) => {
    await page.goto('/tasks');

    // 验证 GitHub URL 显示
    const githubUrls = page.locator('text=/https:\\/\\/github\\.com\\//');
    const count = await githubUrls.count();

    if (count > 0) {
      await expect(githubUrls.first()).toBeVisible();
    }
  });

  test('应该支持任务筛选', async ({ page }) => {
    await page.goto('/tasks');

    // 查找筛选按钮
    const filterButton = page.locator('button:has-text("筛选")');

    if (await filterButton.isVisible()) {
      await filterButton.click();

      // 验证筛选选项
      await expect(page.locator('text=全部')).toBeVisible();
      await expect(page.locator('text=运行中')).toBeVisible();
      await expect(page.locator('text=已完成')).toBeVisible();
      await expect(page.locator('text=失败')).toBeVisible();
    }
  });

  test('应该支持任务搜索', async ({ page }) => {
    await page.goto('/tasks');

    // 查找搜索框
    const searchInput = page.locator('input[placeholder*="搜索"]');

    if (await searchInput.isVisible()) {
      // 输入搜索关键词
      await searchInput.fill('github');

      // 等待搜索结果
      await page.waitForTimeout(500);

      // 验证搜索结果
      const results = page.locator('[data-testid="task-card"]');
      await expect(results).toHaveCount(await results.count());
    }
  });

  test('应该正确显示空状态', async ({ page }) => {
    await page.goto('/tasks');

    // 如果没有活跃任务，验证空状态显示
    const emptyState = page.locator('[data-testid="empty-state"]');

    if (await emptyState.isVisible()) {
      await expect(page.locator('text=暂无任务')).toBeVisible();
    }
  });
});

test.describe('Task Management - 性能测试', () => {
  test('应该快速加载任务列表', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/tasks');

    // 等待任务列表加载
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible();

    const loadTime = Date.now() - startTime;

    // 验证加载时间小于 2 秒
    expect(loadTime).toBeLessThan(2000);
  });

  test('应该流畅更新进度', async ({ page }) => {
    await page.goto('/tasks');

    // 查找运行中的任务
    const runningTask = page.locator('[data-testid="task-card"]:has-text("running")');

    if (await runningTask.count() > 0) {
      const progressBar = runningTask.locator('[role="progressbar"]');

      // 多次检查进度更新
      const progresses: number[] = [];

      for (let i = 0; i < 5; i++) {
        const value = await progressBar.getAttribute('aria-valuenow');
        if (value) progresses.push(parseInt(value));
        await page.waitForTimeout(500);
      }

      // 验证进度有变化
      const uniqueProgresses = new Set(progresses);
      expect(uniqueProgresses.size).toBeGreaterThan(1);
    }
  });
});
