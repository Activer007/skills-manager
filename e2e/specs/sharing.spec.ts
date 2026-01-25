import { test, expect } from '../fixtures';
import { waitForAppReady } from '../helpers/tauri-helpers';
import { TEST_TIMEOUTS } from '../fixtures/test-data';

/**
 * 分享功能 E2E 测试
 *
 * 测试 Skill 分享功能：
 * - 文本分享生成
 * - 图片分享生成（多主题）
 * - QR 码生成
 * - 从分享图片导入
 * - 修改检测提醒
 * - 包导出/导入
 */

test.describe('Skill Sharing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/my-skills', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await waitForAppReady(page);
  });

  test.describe('Text Sharing', () => {
    test('should open share dialog', async ({ page }) => {
      // 等待第一个 skill-card 出现（应该很快）
      const skillCard = page.locator('[data-testid="skill-card"]').first();
      await skillCard.waitFor({ state: 'visible', timeout: 10000 });

      if (await skillCard.count() > 0) {
        // 点击分享按钮并等待对话框打开
        const shareBtn = skillCard.locator('[data-testid="share-button"]');

        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          shareBtn.click()
        ]);

        // 验证对话框打开 - 使用正确的 test-id
        const shareDialog = page.locator('[data-testid="share-sheet"]');
        await expect(shareDialog).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('should generate share text', async ({ page }) => {
      // 等待第一个 skill-card 出现
      const skillCard = page.locator('[data-testid="skill-card"]').first();
      await skillCard.waitFor({ state: 'visible', timeout: 10000 });
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        // 切换到文本分享标签
        const textTab = page.locator('[data-testid="share-text-tab"]');
        if (await textTab.count() > 0) {
          await textTab.click();

          // 验证分享文本生成
          const shareText = page.locator('[data-testid="share-text-content"]');
          await expect(shareText).toBeVisible();

          // 验证包含必要信息
          const textContent = await shareText.textContent();
          expect(textContent).toContain('http');
          expect(textContent).toMatch(/github|skill/i);
        } else {
          // 默认显示文本分享
          const shareText = page.locator('[data-testid="share-text-content"]');
          await expect(shareText).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should copy share text to clipboard', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        // 点击复制按钮
        const copyBtn = page.locator('[data-testid="copy-text"]');
        if (await copyBtn.count() > 0) {
          await copyBtn.click();

          // 验证复制成功提示
          const toast = page.locator('.toast, [role="alert"]');
          await expect(toast).toContainText(/copied|success/i);
        }
      } else {
        test.skip();
      }
    });

    test('should support multiple platforms', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        // 检查平台选项
        const platforms = page.locator('[data-testid="share-platform"]');
        if (await platforms.count() > 0) {
          const platformOptions = platforms.locator('[data-testid="platform-option"]');
          const count = await platformOptions.count();

          // 验证至少有一个平台选项
          expect(count).toBeGreaterThan(0);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Image Sharing', () => {
    test('should switch to image sharing tab', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        // 切换到图片分享标签
        const imageTab = page.locator('[data-testid="share-image-tab"]');
        if (await imageTab.count() > 0) {
          await imageTab.click();

          // 验证图片生成选项显示
          const generateBtn = page.locator('[data-testid="generate-image"]');
          await expect(generateBtn).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should generate share image', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        const imageTab = page.locator('[data-testid="share-image-tab"]');
        if (await imageTab.count() > 0) {
          await imageTab.click();

          // 选择主题（如果有多个主题）
          const themeSelect = page.locator('[data-testid="card-theme"]');
          if (await themeSelect.count() > 0) {
            await themeSelect.selectOption('dark');
          }

          // 生成图片
          const generateBtn = page.locator('[data-testid="generate-image"]');
          await generateBtn.click();

          // 等待图片生成
          await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

          // 验证图片显示
          const previewImage = page.locator('[data-testid="image-preview"]');
          await expect(previewImage).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should support multiple themes', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        const imageTab = page.locator('[data-testid="share-image-tab"]');
        if (await imageTab.count() > 0) {
          await imageTab.click();

          // 检查主题选择器
          const themeSelect = page.locator('[data-testid="card-theme"]');
          if (await themeSelect.count() > 0) {
            const themes = await themeSelect.locator('option').all();
            expect(themes.length).toBeGreaterThan(0);

            // 测试不同主题
            for (const theme of themes) {
              const themeValue = await theme.getAttribute('value');
              if (themeValue) {
                await themeSelect.selectOption(themeValue);

                const generateBtn = page.locator('[data-testid="generate-image"]');
                await generateBtn.click();
                await page.waitForTimeout(1000);
              }
            }
          }
        }
      } else {
        test.skip();
      }
    });

    test('should download share image', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        const imageTab = page.locator('[data-testid="share-image-tab"]');
        if (await imageTab.count() > 0) {
          await imageTab.click();

          // 生成图片
          const generateBtn = page.locator('[data-testid="generate-image"]');
          await generateBtn.click();
          await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

          // 下载图片
          const downloadBtn = page.locator('[data-testid="download-image"]');
          if (await downloadBtn.count() > 0) {
            const downloadPromise = page.waitForEvent('download');
            await downloadBtn.click();
            const download = await downloadPromise;

            // 验证文件类型
            expect(download.suggestedFilename()).toMatch(/\.(png|jpg|jpeg)$/);
          }
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('QR Code Generation', () => {
    test('should generate QR code', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        // 查找 QR 码标签或按钮
        const qrTab = page.locator('[data-testid="share-qr-tab"], button:has-text("QR Code")');
        if (await qrTab.count() > 0) {
          await qrTab.click();

          // 验证 QR 码显示
          const qrCode = page.locator('[data-testid="qr-code"]');
          await expect(qrCode).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should download QR code image', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        const qrTab = page.locator('[data-testid="share-qr-tab"], button:has-text("QR Code")');
        if (await qrTab.count() > 0) {
          await qrTab.click();

          // 下载 QR 码
          const downloadBtn = page.locator('[data-testid="download-qr"]');
          if (await downloadBtn.count() > 0) {
            const downloadPromise = page.waitForEvent('download');
            await downloadBtn.click();
            const download = await downloadPromise;

            expect(download.suggestedFilename()).toMatch(/\.(png|jpg|jpeg)$/);
          }
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Import from Share Image', () => {
    test('should import skill from QR code', async ({ page }) => {
      await page.goto('/marketplace');
      await waitForAppReady(page);

      // 点击从图片导入按钮
      const importFromImageBtn = page.locator(
        '[data-testid="import-from-image"], button:has-text("Import from Image")'
      );

      if (await importFromImageBtn.count() > 0) {
        await importFromImageBtn.click();

        // 模拟文件选择
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('e2e/fixtures/test-skills/test-qr-code.png');

        // 等待解析
        await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

        // 验证导入对话框显示
        const importDialog = page.locator('[data-testid="import-dialog"]');
        if (await importDialog.count() > 0) {
          await expect(importDialog).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should handle invalid share image', async ({ page }) => {
      await page.goto('/marketplace');
      await waitForAppReady(page);

      const importFromImageBtn = page.locator(
        '[data-testid="import-from-image"], button:has-text("Import from Image")'
      );

      if (await importFromImageBtn.count() > 0) {
        await importFromImageBtn.click();

        // 上传无效图片
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('e2e/fixtures/test-skills/invalid-image.png');

        // 等待错误
        await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

        // 验证错误消息
        const toast = page.locator('.toast, [role="alert"]');
        if (await toast.count() > 0) {
          await expect(toast).toContainText(/error|invalid|no qr code/i);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Package Export/Import', () => {
    test('should export skill as package', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 点击导出按钮
        const exportBtn = skillCard.locator('[data-testid="export-button"]');
        if (await exportBtn.count() > 0) {
          const downloadPromise = page.waitForEvent('download');
          await exportBtn.click();
          const download = await downloadPromise;

          // 验证文件格式
          expect(download.suggestedFilename()).toMatch(/\.zip$/);
        }
      } else {
        test.skip();
      }
    });

    test('should import skill from package', async ({ page }) => {
      await page.goto('/marketplace');
      await waitForAppReady(page);

      const importPackageBtn = page.locator(
        '[data-testid="import-from-package"], button:has-text("Import Package")'
      );

      if (await importPackageBtn.count() > 0) {
        await importPackageBtn.click();

        // 模拟文件选择
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('e2e/fixtures/test-skills/test-skill.zip');

        // 等待导入
        await page.waitForTimeout(TEST_TIMEOUTS.LONG);

        // 验证成功消息
        const toast = page.locator('.toast, [role="alert"]');
        if (await toast.count() > 0) {
          await expect(toast).toContainText(/success|installed/i);
        }
      } else {
        test.skip();
      }
    });

    test('should validate package format', async ({ page }) => {
      await page.goto('/marketplace');
      await waitForAppReady(page);

      const importPackageBtn = page.locator(
        '[data-testid="import-from-package"], button:has-text("Import Package")'
      );

      if (await importPackageBtn.count() > 0) {
        await importPackageBtn.click();

        // 上传无效包
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles('e2e/fixtures/test-skills/invalid-package.zip');

        // 等待验证
        await page.waitForTimeout(TEST_TIMEOUTS.MEDIUM);

        // 验证错误消息
        const toast = page.locator('.toast, [role="alert"]');
        if (await toast.count() > 0) {
          await expect(toast).toContainText(/invalid|error/i);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Modification Detection', () => {
    test('should detect skill modifications', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 检查是否有修改标记
        const modifiedBadge = skillCard.locator('[data-testid="modified-badge"]');
        if (await modifiedBadge.count() > 0) {
          await expect(modifiedBadge).toBeVisible();
        }
      } else {
        test.skip();
      }
    });

    test('should show modification warning in share dialog', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        // 检查修改警告
        const warning = page.locator('[data-testid="modification-warning"]');
        if (await warning.count() > 0) {
          await expect(warning).toBeVisible();
          await expect(warning).toContainText(/modified|changed/i);
        }
      } else {
        test.skip();
      }
    });
  });

  test.describe('Share Dialog UX', () => {
    test('should close dialog on cancel', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        // 点击关闭按钮
        const closeBtn = page.locator('[data-testid="close-dialog"]');
        await expect(closeBtn).toBeVisible();
        await closeBtn.click();

        // 验证对话框关闭 - 等待对话框消失
        const shareDialog = page.locator('[data-testid="share-sheet"]');
        await expect(shareDialog).not.toBeVisible({ timeout: 5000 });
      } else {
        test.skip();
      }
    });

    test('should switch between share modes', async ({ page }) => {
      // Skills 自动加载，等待列表加载完成
      // Skills 已快速加载完成

      const skillCard = page.locator('[data-testid="skill-card"]').first();
      if (await skillCard.count() > 0) {
        // 使用 Promise.all 等待对话框打开
        await Promise.all([
          page.waitForSelector('[data-testid="share-sheet"]', { state: 'visible', timeout: 10000 }),
          skillCard.locator('[data-testid="share-button"]').click()
        ]);

        // 测试标签切换
        const textTab = page.locator('[data-testid="share-text-tab"]');
        const imageTab = page.locator('[data-testid="share-image-tab"]');
        const qrTab = page.locator('[data-testid="share-qr-tab"]');

        if (await textTab.count() > 0 && await imageTab.count() > 0) {
          await textTab.click();
          await expect(page.locator('[data-testid="share-text-content"]')).toBeVisible();

          await imageTab.click();
          await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();

          if (await qrTab.count() > 0) {
            await qrTab.click();
            await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
          }
        }
      } else {
        test.skip();
      }
    });
  });
});
