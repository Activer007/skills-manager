import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * Marketplace 页面对象
 *
 * 封装 Skill Marketplace 页面的所有交互元素
 */
export class MarketplacePage extends BasePage {
  // 页面元素
  readonly importFromGithubButton: Locator;
  readonly searchInput: Locator;
  readonly filterChips: Locator;
  readonly skillCards: Locator;
  readonly githubUrlInput: Locator;
  readonly importConfirmButton: Locator;
  readonly scanProgress: Locator;
  readonly securityBlocked: Locator;

  constructor(page: Page) {
    super(page);

    // 主要按钮和输入
    this.importFromGithubButton = page.locator(
      '[data-testid="import-from-github"], button:has-text("Import from GitHub")'
    );
    this.searchInput = page.locator('[data-testid="search-input"], input[type="search"]');
    this.filterChips = page.locator('[data-testid="filter-chip"]');
    this.skillCards = page.locator('[data-testid="skill-card"], .skill-card');

    // 导入对话框元素
    this.githubUrlInput = page.locator('[data-testid="github-url-input"]');
    this.importConfirmButton = page.locator('[data-testid="import-confirm"]');
    this.scanProgress = page.locator('[data-testid="scan-progress"]');
    this.securityBlocked = page.locator('[data-testid="security-blocked"]');
  }

  /**
   * 导航到 Marketplace 页面
   */
  async goto() {
    await super.goto('/marketplace');
  }

  /**
   * 打开 GitHub 导入对话框
   */
  async openImportDialog() {
    await this.importFromGithubButton.click();
    await this.waitForVisible(this.githubUrlInput);
  }

  /**
   * 从 GitHub 导入 Skill
   */
  async importFromGithub(url: string) {
    await this.openImportDialog();
    await this.githubUrlInput.fill(url);
    await this.importConfirmButton.click();
  }

  /**
   * 等待导入完成
   */
  async waitForImport(timeout = 30000) {
    // 等待扫描进度出现并消失
    if (await this.isPresent(this.scanProgress)) {
      await this.waitForHidden(this.scanProgress, timeout);
    }

    await this.waitForLoading();
  }

  /**
   * 检查是否被安全阻断
   */
  async isBlockedBySecurity(): Promise<boolean> {
    return await this.isPresent(this.securityBlocked);
  }

  /**
   * 搜索 Skills
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // 等待搜索防抖
  }

  /**
   * 选择过滤器
   */
  async selectFilter(filterName: string) {
    const filter = this.filterChips.filter({ hasText: filterName });
    await filter.click();
  }

  /**
   * 获取 Skill 卡片数量
   */
  async getSkillCount(): Promise<number> {
    return await this.skillCards.count();
  }

  /**
   * 点击安装按钮
   */
  async installSkill(index: number) {
    const card = this.skillCards.nth(index);
    const installBtn = card.locator('[data-testid="install-button"], button:has-text("Install")');
    await installBtn.click();
    await this.waitForLoading();
  }

  /**
   * 查看 Skill 详情
   */
  async viewSkillDetails(index: number) {
    const card = this.skillCards.nth(index);
    await card.click();
  }
}
