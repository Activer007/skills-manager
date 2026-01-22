import { test as base } from '@playwright/test';
import { MySkillsPage } from '../pages/my-skills.page';
import { MarketplacePage } from '../pages/marketplace.page';
import { SettingsPage } from '../pages/settings.page';

/**
 * 测试夹具扩展
 *
 * 添加自定义页面对象到测试上下文
 */
export const test = base.extend<{
  mySkillsPage: MySkillsPage;
  marketplacePage: MarketplacePage;
  settingsPage: SettingsPage;
}>({
  mySkillsPage: async ({ page }, use) => {
    const mySkillsPage = new MySkillsPage(page);
    await use(mySkillsPage);
  },

  marketplacePage: async ({ page }, use) => {
    const marketplacePage = new MarketplacePage(page);
    await use(marketplacePage);
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },
});

export { expect } from '@playwright/test';
