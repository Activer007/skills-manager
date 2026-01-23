import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

/**
 * My Skills 页面对象
 *
 * 封装 My Skills 页面的所有交互元素
 */
export class MySkillsPage extends BasePage {
  // 页面元素
  readonly scanButton: Locator;
  readonly skillList: Locator;
  readonly skillCards: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);

    // 主要按钮
    this.scanButton = page.locator('[data-testid="scan-button"], button:has-text("Scan")');
    this.skillList = page.locator('[data-testid="skill-list"]');
    this.skillCards = page.locator('[data-testid="skill-card"]');
    this.emptyState = page.locator('[data-testid="empty-state"], .empty-state');
  }

  /**
   * 导航到 My Skills 页面
   */
  async goto() {
    await super.goto('/my-skills');
  }

  /**
   * 点击扫描按钮
   */
  async scanSkills() {
    await this.scanButton.click();
    await this.waitForLoading();
  }

  /**
   * 获取 Skill 卡片数量
   */
  async getSkillCount(): Promise<number> {
    return await this.skillCards.count();
  }

  /**
   * 获取指定索引的 Skill 卡片
   */
  getSkillCard(index: number): Locator {
    return this.skillCards.nth(index);
  }

  /**
   * 点击指定索引的 Skill 卡片查看详情
   */
  async viewSkillDetails(index: number) {
    const card = this.getSkillCard(index);
    await card.click();
  }

  /**
   * 切换 Skill 启用状态
   */
  async toggleSkill(index: number) {
    const card = this.getSkillCard(index);
    const toggle = card.locator('[data-testid="skill-switch"]');
    await toggle.click();
  }

  /**
   * 卸载 Skill
   */
  async uninstallSkill(index: number) {
    const card = this.getSkillCard(index);
    const uninstallBtn = card.locator('[data-testid="uninstall-button"]');
    await uninstallBtn.click();

    // 确认卸载（如果有对话框）
    const confirmBtn = this.page.locator('[data-testid="confirm-uninstall"], button:has-text("Confirm")');
    if (await this.isPresent(confirmBtn)) {
      await confirmBtn.click();
    }

    await this.waitForLoading();
  }

  /**
   * 点击分享按钮
   */
  async shareSkill(index: number) {
    const card = this.getSkillCard(index);
    const shareBtn = card.locator('[data-testid="share-button"]');
    await shareBtn.click();
  }

  /**
   * 检查是否有 Skills
   */
  async hasSkills(): Promise<boolean> {
    return await this.isPresent(this.skillCards.first());
  }

  /**
   * 等待 Skills 加载完成
   */
  async waitForSkills() {
    await this.waitForVisible(this.skillList);
    await this.waitForLoading();
  }

  /**
   * 获取 Skill 质量评分
   */
  async getSkillQualityScore(index: number): Promise<string> {
    const card = this.getSkillCard(index);
    const badge = card.locator('[data-testid="quality-badge"]');
    return await this.getText(badge);
  }

  /**
   * 获取 Skill 安全状态
   */
  async getSkillSecurityStatus(index: number): Promise<string> {
    const card = this.getSkillCard(index);
    const shield = card.locator('[data-testid="security-shield"]');
    return await this.getText(shield);
  }
}
