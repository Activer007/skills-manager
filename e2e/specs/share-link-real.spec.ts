import { test, expect } from '../fixtures';
import { MySkillsPage } from '../pages/my-skills.page';

/**
 * Share Link Real Integration Test
 *
 * This test file does NOT use the mock fixtures. It is designed to run against
 * the real application backend (e.g. via tauri-driver or a fully integrated environment).
 *
 * Purpose: Verify the true contract between Frontend and Backend without mocks.
 *
 * Note: This test requires a running environment where window.__TAURI__ is available
 * natively (like tauri-driver) or via a bridge. If run in a standard browser against
 * localhost:5173 without the Tauri context, it will likely fail.
 */

test.describe('Share Link - Integration Flow (No Mocks)', () => {
  test('should generate and resolve a real share link', async ({ page }) => {
    // 1. Initialize Page Objects
    const mySkillsPage = new MySkillsPage(page);

    // 2. Go to My Skills page
    // Using explicit navigation
    await mySkillsPage.goto();

    // 3. Verify we have skills (Pre-requisite: The environment must have skills installed)
    // The user mentioned "we have installed multiple skills", so we assume this is true.
    const hasSkills = await mySkillsPage.hasSkills();
    expect(hasSkills, 'Environment must have at least one skill installed').toBe(true);

    // 4. Generate Link
    // Open the first skill's share dialog
    await mySkillsPage.shareSkill(0);

    // Wait for share sheet
    const shareSheet = page.locator('[data-testid="share-sheet"]');
    await expect(shareSheet).toBeVisible();

    // Get the generated link
    const linkInput = page.locator('input[value*="share/"]');
    await expect(linkInput).toBeVisible({ timeout: 10000 }); // Wait for backend to generate
    const shareUrl = await linkInput.inputValue();

    console.log(`[Integration] Generated Share URL: ${shareUrl}`);
    expect(shareUrl).toContain('/share/');

    // 5. Visit the Link (Resolve Flow)
    await page.goto(shareUrl);

    // 6. Verify Preview Page
    // Title should be visible
    await expect(page.locator('h1')).toBeVisible();

    // Install button should be present
    const installButton = page.locator('button:has-text("安装 Skill"), button:has-text("Install Skill")');
    await expect(installButton).toBeVisible();

    // Verify source_url fallback worked (Button should be enabled if source_url is present)
    // If backend metadata was missing source_url, this might be disabled or show warning
    // We expect it to be enabled for a valid skill
    await expect(installButton).toBeEnabled();

    // Optional: Verify specific metadata if we knew what skill 0 was
    // But generalized verification is enough for "Contract" testing
  });
});
