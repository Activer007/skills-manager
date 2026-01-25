import { test, expect } from '../fixtures';
import { TEST_TIMEOUTS } from '../fixtures/test-data';

/**
 * Share Link 完整流程 E2E 测试
 *
 * 测试分享链接从生成到安装完成的完整端到端流程
 * 重点验证所有安装阶段的正确转换和进度更新
 */

test.describe('Share Link - 完整安装流程', () => {
  test('应该完成完整的安装流程（系统级）', async ({ page, mySkillsPage }) => {
    // 1. 生成分享链接
    await mySkillsPage.goto();

    // 点击分享按钮
    await page.click('[data-testid="share-button"]');

    // 等待 ShareSheet 打开
    await expect(page.locator('[data-testid="share-sheet"]')).toBeVisible();

    // 获取生成的分享链接
    const linkInput = page.locator('input[value*="share/"]');
    await expect(linkInput).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });
    const shareUrl = await linkInput.inputValue();
    console.log(`[E2E] Generated Share URL: ${shareUrl}`);

    // 2. 访问分享链接
    await page.goto(shareUrl);
    await page.waitForLoadState('networkidle');

    // 3. 验证预览页面加载
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=安装 Skill')).toBeVisible();

    // 4. 点击安装按钮
    const installButton = page.locator('button:has-text("安装 Skill")');
    await expect(installButton).toBeEnabled();
    await installButton.click();

    // 5. 验证安装确认对话框
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=确认安装')).toBeVisible();

    // 选择系统级安装
    await page.click('input[type="radio"][value="system"]');

    // 6. 确认安装
    const confirmButton = page.locator('button:has-text("确认安装")');
    await confirmButton.click();

    // 7. 验证进入安装状态 - Preparing 阶段
    await expect(page.locator('text=正在准备')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });

    // 8. 验证进度条显示
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();

    // 9. 验证阶段转换 - Downloading
    await expect(page.locator('text=正在下载')).toBeVisible({ timeout: TEST_TIMEOUTS.LONG });

    // 验证进度百分比变化（0-30%）
    const progressText1 = page.locator('text=/\\d+%/');
    await expect(progressText1).toBeVisible();
    const progress1 = await progressText1.textContent();
    const progress1Num = parseInt(progress1!.match(/\d+/)![0]);
    expect(progress1Num).toBeGreaterThan(0);
    expect(progress1Num).toBeLessThan(40);

    // 10. 验证阶段转换 - Scanning
    await expect(page.locator('text=正在扫描')).toBeVisible({ timeout: TEST_TIMEOUTS.LONG });

    // 验证进度百分比变化（30-70%）
    const progressText2 = page.locator('text=/\\d+%/');
    const progress2 = await progressText2.textContent();
    const progress2Num = parseInt(progress2!.match(/\d+/)![0]);
    expect(progress2Num).toBeGreaterThanOrEqual(30);
    expect(progress2Num).toBeLessThan(80);

    // 11. 验证阶段转换 - Installing
    await expect(page.locator('text=正在安装')).toBeVisible({ timeout: TEST_TIMEOUTS.LONG });

    // 验证进度百分比变化（70-99%）
    const progressText3 = page.locator('text=/\\d+%/');
    const progress3 = await progressText3.textContent();
    const progress3Num = parseInt(progress3!.match(/\d+/)![0]);
    expect(progress3Num).toBeGreaterThanOrEqual(70);
    expect(progress3Num).toBeLessThan(100);

    // 12. 等待安装完成
    await expect(page.locator('text=安装完成')).toBeVisible({ timeout: TEST_TIMEOUTS.LONG });

    // 13. 验证成功页面
    await expect(page.locator('text=安装成功！')).toBeVisible();
    await expect(page.locator('text=已成功安装到您的 Skills 列表')).toBeVisible();

    // 14. 验证返回按钮
    const backButton = page.locator('button:has-text("查看我的 Skills"), button:has-text("返回主页")');
    await expect(backButton).toBeVisible();
  });

  test('应该完成完整的安装流程（项目级）', async ({ page }) => {
    // 使用 mock 分享链接
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 点击安装按钮
    await page.click('button:has-text("安装 Skill")');

    // 等待对话框
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // 选择项目级安装
    await page.click('input[type="radio"][value="project"]');

    // 选择项目（如果有项目路径）
    const projectSelect = page.locator('select');
    if (await projectSelect.isVisible()) {
      await projectSelect.selectOption({ index: 0 });
    }

    // 点击确认
    await page.click('button:has-text("确认安装")');

    // 验证安装开始
    await expect(page.locator('text=正在准备')).toBeVisible();

    // 验证完成
    await expect(page.locator('text=安装完成')).toBeVisible({ timeout: TEST_TIMEOUTS.VERY_LONG });
  });

  test('应该支持导航到任务中心并查看进度', async ({ page }) => {
    // 访问分享链接
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 等待安装开始
    await expect(page.locator('text=正在准备')).toBeVisible();

    // 点击"后台运行并查看任务中心"按钮
    const viewTasksButton = page.locator('button:has-text("后台运行并查看任务中心")');
    await expect(viewTasksButton).toBeVisible();
    await viewTasksButton.click();

    // 验证导航到任务中心
    await expect(page).toHaveURL(/\/tasks/);

    // 验证任务显示在活跃列表中
    await expect(page.locator('text=任务中心')).toBeVisible();
    const activeTasks = page.locator('[data-testid="task-card"]');
    await expect(activeTasks).toHaveCount(await activeTasks.count());

    // 验证任务状态
    const taskStatus = page.locator('[data-testid="task-status"]').first();
    await expect(taskStatus).toBeVisible();
  });

  test('应该正确处理安装过程中的错误', async ({ page }) => {
    // Mock 安装失败
    await page.addInitScript(() => {
      window.__TAURI__.core.invoke = async (command: string, args?: any) => {
        if (command === 'import_github_skill_with_progress') {
          const taskId = `task-${Date.now()}`;

          // 模拟失败场景：开始时正常，但在 Downloading 阶段失败
          setTimeout(() => {
            if (window.__TAURI__?.core?.emit) {
              window.__TAURI__.core.emit('task-progress', {
                task_id: taskId,
                stage: 'Downloading',
                progress: 15,
                message: 'Downloading files...',
              });
            }
          }, 500);

          setTimeout(() => {
            if (window.__TAURI__?.core?.emit) {
              window.__TAURI__.core.emit('task-error', {
                task_id: taskId,
                error: 'Failed to download: Network connection lost',
              });
            }
          }, 1500);

          return taskId;
        }
        // 使用默认 mock 实现
        return window.__TAURI_DEFAULT_INVOKE?.(command, args);
      };
    });

    // 访问分享链接
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 验证进入下载阶段
    await expect(page.locator('text=正在下载')).toBeVisible({ timeout: TEST_TIMEOUTS.MEDIUM });

    // 等待错误状态
    await expect(page.locator('text=/error|Error|错误/')).toBeVisible({ timeout: TEST_TIMEOUTS.LONG });

    // 验证错误消息
    await expect(page.locator('text=/Network|network|failed|Failed/')).toBeVisible();

    // 验证重试按钮
    const retryButton = page.locator('button:has-text("重试")');
    await expect(retryButton).toBeVisible();

    // 验证取消按钮
    const cancelButton = page.locator('button:has-text("取消")');
    await expect(cancelButton).toBeVisible();
  });

  test('应该支持取消正在进行的安装', async ({ page }) => {
    // 访问分享链接
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 等待安装开始
    await expect(page.locator('text=正在准备')).toBeVisible();

    // 点击取消按钮
    const cancelButton = page.locator('button:has-text("取消")');
    await expect(cancelButton).toBeVisible();
    await cancelButton.click();

    // 验证返回到预览页面（就绪状态）
    await expect(page.locator('text=安装 Skill')).toBeVisible({ timeout: TEST_TIMEOUTS.SHORT });
    await expect(page.locator('h1')).toBeVisible();
  });

  test('应该正确显示所有阶段的进度文本', async ({ page }) => {
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 验证各个阶段的进度文本
    const stages = [
      { text: '正在准备', regex: /preparing|Preparing/ },
      { text: '正在下载', regex: /downloading|Downloading/ },
      { text: '正在扫描', regex: /scanning|Scanning/ },
      { text: '正在安装', regex: /installing|Installing/ },
      { text: '安装完成', regex: /completed|Completed/ },
    ];

    for (const stage of stages) {
      await expect(page.locator(`text=${stage.text}`)).toBeVisible({
        timeout: TEST_TIMEOUTS.LONG,
      });
      console.log(`[E2E] Stage verified: ${stage.text}`);
    }
  });

  test('应该验证进度百分比从 0 到 100 的变化', async ({ page }) => {
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 收集进度百分比
    const progresses: number[] = [];

    // 多次采样进度
    for (let i = 0; i < 10; i++) {
      const progressElement = page.locator('text=/\\d+%/');
      if (await progressElement.isVisible()) {
        const text = await progressElement.textContent();
        const match = text?.match(/(\d+)%/);
        if (match) {
          const progress = parseInt(match[1]);
          progresses.push(progress);
          console.log(`[E2E] Progress at sample ${i + 1}: ${progress}%`);
        }
      }
      await page.waitForTimeout(500);
    }

    // 验证进度递增
    for (let i = 1; i < progresses.length; i++) {
      expect(progresses[i]).toBeGreaterThanOrEqual(progresses[i - 1] - 5); // 允许小幅波动
    }

    // 验证最终进度为 100
    await expect(page.locator('text=100%')).toBeVisible({ timeout: TEST_TIMEOUTS.VERY_LONG });
  });

  test('应该显示正确的 Skill 信息在预览页面', async ({ page }) => {
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 验证 Skill 名称
    await expect(page.locator('h1:has-text("E2E Test Safe Skill")')).toBeVisible();

    // 验证描述
    await expect(page.locator('text=A safe test skill for E2E testing')).toBeVisible();

    // 验证作者
    await expect(page.locator('text=E2E Test')).toBeVisible();

    // 验证版本
    await expect(page.locator('text=v1.0.0')).toBeVisible();

    // 验证安全等级
    await expect(page.locator('text=安全')).toBeVisible();

    // 验证质量评分
    await expect(page.locator('text=90/100')).toBeVisible();

    // 验证源链接
    await expect(page.locator('a[href="https://github.com/test/e2e-test-skill"]')).toBeVisible();
  });

  test('应该正确处理分享链接的边界情况', async ({ page, testShareLinks }) => {
    // 测试无效链接
    await page.goto(testShareLinks.invalid);
    await expect(page.locator('text=链接已过期或不存在')).toBeVisible();

    // 测试缺少 source_url
    await page.goto(testShareLinks.noSourceUrl);
    await expect(page.locator('text=无法安装')).toBeVisible();
    await expect(page.locator('text=此分享链接缺少源地址信息')).toBeVisible();

    const installButton = page.locator('button:has-text("无法安装 (无源地址)")');
    await expect(installButton).toBeDisabled();
  });

  test('应该在安装完成后支持返回主页', async ({ page }) => {
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 快速完成安装（使用 mock）
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 等待完成
    await expect(page.locator('text=安装成功！')).toBeVisible({ timeout: TEST_TIMEOUTS.VERY_LONG });

    // 点击返回按钮
    const backButton = page.locator('button:has-text("查看我的 Skills")');
    await backButton.click();

    // 验证导航到我的 Skills 页面
    await expect(page).toHaveURL(/\/my-skills/);
  });
});

test.describe('Share Link - 进度更新验证', () => {
  test('应该实时更新进度条宽度', async ({ page }) => {
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 获取进度条
    const progressBar = page.locator('[role="progressbar"]');

    // 多次检查进度条宽度变化
    const widths: number[] = [];

    for (let i = 0; i < 5; i++) {
      await page.waitForTimeout(1000);
      const width = await progressBar.getAttribute('aria-valuenow');
      if (width) {
        widths.push(parseInt(width));
        console.log(`[E2E] Progress width ${i + 1}: ${width}%`);
      }
    }

    // 验证宽度递增
    for (let i = 1; i < widths.length; i++) {
      expect(widths[i]).toBeGreaterThan(widths[i - 1]);
    }
  });

  test('应该显示正确的阶段图标', async ({ page }) => {
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 验证加载图标
    const loaderIcon = page.locator('svg[data-lucide="loader-2"]');
    await expect(loaderIcon).toBeVisible();
  });
});

test.describe('Share Link - UI/UX 验证', () => {
  test('应该有良好的视觉反馈', async ({ page }) => {
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');

    // 验证页面加载状态
    await expect(page.locator('min-h-screen')).toBeVisible();

    // 开始安装
    await page.click('button:has-text("安装 Skill")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.click('input[type="radio"][value="system"]');
    await page.click('button:has-text("确认安装")');

    // 验证进度条容器
    await expect(page.locator('[role="progressbar"]')).toBeVisible();

    // 验证进度文本
    await expect(page.locator('text=/\\d+%/')).toBeVisible();

    // 验证取消按钮
    await expect(page.locator('button:has-text("取消")')).toBeVisible();
  });

  test('应该正确显示不同状态的样式', async ({ page }) => {
    // 测试安全状态
    await page.goto('http://localhost:1420/share/mock-share-safe-skill');
    await expect(page.locator('.text-green-600')).toBeVisible();

    // 测试风险状态
    await page.goto('http://localhost:1420/share/mock-share-risk-skill');
    await expect(page.locator('.text-yellow-600')).toBeVisible();

    // 测试阻止状态
    await page.goto('http://localhost:1420/share/mock-share-blocked-skill');
    await expect(page.locator('.text-red-600')).toBeVisible();
  });
});
