import { Page, Locator } from '@playwright/test';

/**
 * 基础页面对象类
 *
 * 所有页面对象的基类，提供通用方法
 */
export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * 导航到指定路径
   */
  async goto(path: string, options?: { timeout?: number }) {
    // 默认使用 60s 超时时间（Tauri 应用需要更长的启动时间）
    const timeout = options?.timeout || 60000;
    console.log(`[e2e] goto ${path} (timeout ${timeout}ms)`);
    await this.page.goto(path, { timeout, waitUntil: 'domcontentloaded' });
  }

  /**
   * 等待元素可见
   */
  async waitForVisible(locator: Locator, timeout?: number) {
    console.log(`[e2e] waitForVisible ${locator.toString()}`);
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * 等待元素隐藏
   */
  async waitForHidden(locator: Locator, timeout?: number) {
    console.log(`[e2e] waitForHidden ${locator.toString()}`);
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * 点击元素并等待导航
   */
  async clickAndWaitForNavigation(locator: Locator) {
    console.log('[e2e] clickAndWaitForNavigation');
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      locator.click(),
    ]);
  }

  /**
   * 填写输入框
   */
  async fillInput(locator: Locator, value: string) {
    console.log(`[e2e] fillInput value length=${value.length}`);
    await locator.fill(value);
  }

  /**
   * 获取元素文本
   */
  async getText(locator: Locator): Promise<string> {
    return await locator.textContent() || '';
  }

  /**
   * 检查元素是否存在
   */
  async isPresent(locator: Locator): Promise<boolean> {
    return await locator.count() > 0;
  }

  /**
   * 等待 Toast 消息出现
   */
  async waitForToast(message?: string, timeout = 5000) {
    const toast = this.page.locator('.toast, [role="alert"], .notification');
    console.log(`[e2e] waitForToast ${message ? `"${message}"` : ''} (timeout ${timeout}ms)`);
    await this.waitForVisible(toast, timeout);

    if (message) {
      await expect(toast).toContainText(message);
    }

    return toast;
  }

  /**
   * 等待加载完成
   */
  async waitForLoading() {
    const loading = this.page.locator('.loading, [data-testid="loading"]');
    if (await this.isPresent(loading)) {
      console.log('[e2e] waitForLoading: loading present, waiting to hide');
      await this.waitForHidden(loading);
    }
  }

  /**
   * 截图
   */
  async screenshot(name: string) {
    console.log(`[e2e] screenshot ${name}`);
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }
}
