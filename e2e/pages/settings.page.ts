import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Settings 页面对象
 *
 * 封装 Settings 页面的所有交互元素
 */
export class SettingsPage extends BasePage {
  // 页面元素
  readonly addProjectPathButton: Locator;
  readonly projectPathsList: Locator;
  readonly pathInput: Locator;
  readonly savePathButton: Locator;
  readonly securityModeSelect: Locator;
  readonly systemInstallPath: Locator;

  constructor(page: Page) {
    super(page);

    // 项目路径相关
    this.addProjectPathButton = page.locator(
      '[data-testid="add-project-path"], button:has-text("Add Path")'
    );
    this.projectPathsList = page.locator('[data-testid="project-paths-list"]');
    this.pathInput = page.locator('[data-testid="path-input"]');
    this.savePathButton = page.locator('[data-testid="save-path"]');

    // 安全配置相关
    this.securityModeSelect = page.locator('[data-testid="security-mode-select"]');

    // 系统信息相关
    this.systemInstallPath = page.locator('[data-testid="system-install-path"]');
  }

  /**
   * 导航到 Settings 页面
   */
  async goto() {
    await super.goto('/settings');
  }

  /**
   * 打开添加项目路径对话框
   */
  async openAddPathDialog() {
    await this.addProjectPathButton.click();
    await this.waitForVisible(this.pathInput);
  }

  /**
   * 添加项目路径
   */
  async addProjectPath(path: string) {
    await this.openAddPathDialog();
    await this.pathInput.fill(path);
    await this.savePathButton.click();
    await this.waitForLoading();
  }

  /**
   * 删除项目路径
   */
  async removeProjectPath(index: number) {
    const paths = this.projectPathsList.locator('[data-testid="project-path-item"]');
    const path = paths.nth(index);
    const deleteBtn = path.locator('[data-testid="delete-path"], button:has-text("Delete")');
    await deleteBtn.click();
    await this.waitForLoading();
  }

  /**
   * 获取项目路径数量
   */
  async getProjectPathCount(): Promise<number> {
    const paths = this.projectPathsList.locator('[data-testid="project-path-item"]');
    return await paths.count();
  }

  /**
   * 选择安全扫描模式
   */
  async selectSecurityMode(mode: 'strict' | 'standard' | 'relaxed') {
    await this.securityModeSelect.selectOption(mode);
    await this.waitForLoading();
  }

  /**
   * 获取当前安全扫描模式
   */
  async getSecurityMode(): Promise<string> {
    return await this.securityModeSelect.inputValue();
  }

  /**
   * 获取系统安装路径
   */
  async getSystemInstallPath(): Promise<string> {
    return await this.getText(this.systemInstallPath);
  }
}
