import { Page } from '@playwright/test';

/**
 * Tauri 辅助函数
 *
 * 用于模拟 Tauri API 和处理桌面应用特定功能
 */

/**
 * 模拟文件对话框
 *
 * @param page Playwright Page 对象
 * @param mockPath 模拟返回的文件路径
 */
export async function mockFileDialog(page: Page, mockPath: string) {
  await page.addInitScript((path) => {
    // 模拟 Tauri dialog API
    const tauri = (window as any).__TAURI__ ?? {};
    tauri.dialog = tauri.dialog ?? {};
    tauri.dialog.open = async () => path;
    tauri.dialog.save = async () => path;
    (window as any).__TAURI__ = tauri;
  }, mockPath);
}

/**
 * 模拟多个文件选择对话框
 *
 * @param page Playwright Page 对象
 * @param mockPaths 模拟返回的文件路径数组
 */
export async function mockMultipleFilesDialog(page: Page, mockPaths: string[]) {
  await page.addInitScript((paths) => {
    const tauri = (window as any).__TAURI__ ?? {};
    tauri.dialog = tauri.dialog ?? {};
    tauri.dialog.open = async () => paths;
    (window as any).__TAURI__ = tauri;
  }, mockPaths);
}

/**
 * 模拟 Tauri invoke 命令
 *
 * @param page Playwright Page 对象
 * @param command 命令名称
 * @param returnValue 模拟返回值
 */
export async function mockTauriInvoke(page: Page, command: string, returnValue: any) {
  await page.addInitScript(({ commandName, retVal }) => {
    const tauri = (window as any).__TAURI__ ?? {};
    tauri.core = tauri.core ?? {};
    tauri.core.invoke = async (cmd: string) => {
      if (cmd === commandName) {
        return retVal;
      }
      throw new Error(`Unknown command: ${cmd}`);
    };
    (window as any).__TAURI__ = tauri;
  }, { commandName: command, retVal: returnValue });
}

/**
 * 等待 Tauri 命令执行完成
 *
 * @param page Playwright Page 对象
 * @param timeout 超时时间（毫秒）
 */
export async function waitForTauriCommand(page: Page, timeout = 5000) {
  // 等待网络空闲和加载完成
  await page.waitForLoadState('networkidle', { timeout });
  await page.waitForLoadState('domcontentloaded', { timeout });
}

/**
 * 模拟剪贴板操作
 *
 * @param page Playwright Page 对象
 * @param text 剪贴板文本
 */
export async function mockClipboard(page: Page, text: string) {
  await page.addInitScript((clipText) => {
    const tauri = (window as any).__TAURI__ ?? {};
    tauri.clipboard = tauri.clipboard ?? {};
    tauri.clipboard.writeText = async () => {};
    tauri.clipboard.readText = async () => clipText;
    (window as any).__TAURI__ = tauri;
  }, text);
}

/**
 * 模拟 Shell 操作（打开 URL）
 *
 * @param page Playwright Page 对象
 */
export async function mockShellOpen(page: Page) {
  await page.addInitScript(() => {
    const tauri = (window as any).__TAURI__ ?? {};
    tauri.shell = tauri.shell ?? {};
    tauri.shell.open = async (url: string) => {
      console.log(`Opening URL: ${url}`);
      return true;
    };
    (window as any).__TAURI__ = tauri;
  });
}

/**
 * 创建测试用的 Skill 目录结构
 *
 * @returns Skill 目录的模拟路径
 */
export function createTestSkillPath(): string {
  // 在测试环境中返回模拟路径
  if (process.platform === 'win32') {
    return 'C:\\test\\skills\\test-skill';
  } else {
    return '/test/skills/test-skill';
  }
}

/**
 * 创建测试用的 GitHub URL
 *
 * @param repo 仓库名称
 * @returns GitHub URL
 */
export function createTestGithubUrl(repo = 'test/skill-repo'): string {
  return `https://github.com/${repo}`;
}

/**
 * 等待应用完全加载
 *
 * @param page Playwright Page 对象
 */
export async function waitForAppReady(page: Page) {
  console.log('[e2e] waitForAppReady: start');
  // 等待 body 可见
  await page.waitForSelector('body', { state: 'attached' });

  // 等待加载动画消失
  const loading = page.locator('.loading, [data-testid="loading"]');
  if (await loading.count() > 0) {
    await loading.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {
      // 如果加载器一直存在，继续执行
      console.log('[e2e] waitForAppReady: loading still visible after timeout');
    });
  }

  // 等待网络空闲
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
    // 网络可能一直有活动，继续执行
    console.log('[e2e] waitForAppReady: network idle timeout');
  });

  console.log('[e2e] waitForAppReady: done');
}

/**
 * 截图并保存（用于调试）
 *
 * @param page Playwright Page 对象
 * @param name 截图名称
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true,
  });
}

/**
 * 获取控制台日志
 *
 * @param page Playwright Page 对象
 * @returns 控制台日志数组
 */
export async function getConsoleLogs(page: Page): Promise<any[]> {
  const logs: any[] = [];

  page.on('console', (msg) => {
    logs.push({
      type: msg.type(),
      text: msg.text(),
    });
  });

  return logs;
}
