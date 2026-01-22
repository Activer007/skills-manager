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
  async goto(path: string) {
    await this.page.goto(path);
  }

  /**
   * 等待元素可见
   */
  async waitForVisible(locator: Locator, timeout?: number) {
    await locator.waitFor({ state: 'visible', timeout });
  }

  /**
   * 等待元素隐藏
   */
  async waitForHidden(locator: Locator, timeout?: number) {
    await locator.waitFor({ state: 'hidden', timeout });
  }

  /**
   * 点击元素并等待导航
   */
  async clickAndWaitForNavigation(locator: Locator) {
    await Promise.all([
      this.page.waitForLoadState('networkidle'),
      locator.click(),
    ]);
  }

  /**
   * 填写输入框
   */
  async fillInput(locator: Locator, value: string) {
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
      await this.waitForHidden(loading);
    }
  }

  /**
   * 截图
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `test-results/${name}.png` });
  }
}
