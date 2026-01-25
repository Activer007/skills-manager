import { defineConfig, devices } from '@playwright/test';

const slowMoEnv = process.env.E2E_SLOW_MO;
const slowMo = slowMoEnv ? Number(slowMoEnv) : undefined;

/**
 * Playwright 配置文件
 *
 * 用于 Skills Manager E2E 测试
 * 测试框架：Playwright + Tauri WebDriver
 */
export default defineConfig({
  // 测试文件位置
  testDir: './e2e/specs',

  // 测试文件匹配模式
  testMatch: '**/*.spec.ts',

  // 桌面应用建议串行执行，避免端口冲突
  fullyParallel: false,

  // 禁止 only 测试（CI 环境下）
  forbidOnly: !!process.env.CI,

  // 失败重试次数
  retries: process.env.CI ? 2 : 0,

  // 单 worker 避免端口冲突
  workers: 1,

  // 测试超时时间（Tauri 启动较慢）
  timeout: 60 * 1000,

  // 期望超时时间（异步操作）
  expect: {
    timeout: 10 * 1000,
  },

  // 报告器配置
  reporter: [
    ['html', { open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // 全局配置
  use: {
    // 基础 URL（Vite 开发服务器）
    baseURL: 'http://localhost:5175',

    // 失败时保留 trace（用于调试）
    trace: 'on-first-retry',

    // 仅在失败时截图
    screenshot: 'only-on-failure',

    // 失败时保留视频
    video: 'retain-on-failure',

    // 操作超时时间
    actionTimeout: 10 * 1000,

    // 导航超时时间
    navigationTimeout: 30 * 1000,

    // 可选：减速执行（用于可视化调试）
    launchOptions: slowMo ? { slowMo } : undefined,
  },

  // 测试项目配置
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 视口大小
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  // 开发服务器配置
  webServer: {
    // 启动 Vite 开发服务器（不启动 Tauri，使用 Mock 模式）
    command: 'npm run dev',
    // 端口
    port: 5175,
    // 启动超时时间（Vite 启动很快）
    timeout: 30 * 1000,
    // 重用已存在的服务器（本地开发时）
    reuseExistingServer: !process.env.CI,
    // stdout 忽略（避免日志过多）
    stdout: 'pipe',
    stderr: 'pipe',
  },

  // 测试输出目录
  outputDir: 'test-results',

  // 忽略的测试文件
  testIgnore: ['**/*.unit.spec.ts', '**/*.integration.spec.ts'],
});
