import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateShareText,
  generatePlatformShareText,
  copyToClipboard,
} from './shareTextGenerator';
import type { InstalledSkill } from '../types';

// Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

describe('shareTextGenerator', () => {
  const mockSkill: InstalledSkill = {
    id: 'test-skill-1',
    name: 'Test Skill',
    description: 'This is a test skill for unit testing',
    sourceUrl: 'https://github.com/test/skill',
    installDate: Date.now(),
    localPath: '/path/to/skill',
    status: 'safe',
    type: 'system',
    version: '1.0.0',
    enabled: true,
    qualityScore: 85,
  };

  describe('generateShareText', () => {
    it('should generate share text with all fields for zh locale', () => {
      const text = generateShareText(mockSkill, 'zh');

      expect(text).toContain('Test Skill');
      expect(text).toContain('This is a test skill');
      expect(text).toContain('https://github.com/test/skill');
      expect(text).toContain('✅');
      expect(text).toContain('安全');
      expect(text).toContain('⭐ 质量评分: 85/100');
      expect(text).toContain('来自 Skill Master 分享');
    });

    it('should generate share text for en locale', () => {
      const text = generateShareText(mockSkill, 'en');

      expect(text).toContain('Test Skill');
      expect(text).toContain('Safe');
      expect(text).toContain('来自 Skill Master 分享');
    });

    it('should handle skill without sourceUrl', () => {
      const skillWithoutUrl = { ...mockSkill, sourceUrl: undefined };
      const text = generateShareText(skillWithoutUrl, 'zh');

      expect(text).toContain('本地创建');
    });

    it('should handle skill without qualityScore', () => {
      const skillWithoutScore = { ...mockSkill, qualityScore: undefined };
      const text = generateShareText(skillWithoutScore, 'zh');

      expect(text).not.toContain('质量评分');
    });

    it('should display correct security level emojis', () => {
      const safeSkill = { ...mockSkill, status: 'safe' as const };
      const riskSkill = { ...mockSkill, status: 'unsafe' as const };
      const blockedSkill = { ...mockSkill, status: 'unsafe' as const, securityLevel: 'blocked' as const };
      const unknownSkill = { ...mockSkill, status: 'unknown' as const };

      expect(generateShareText(safeSkill, 'zh')).toContain('✅');
      expect(generateShareText(riskSkill, 'zh')).toContain('⚠️');
      expect(generateShareText(blockedSkill, 'zh')).toContain('🚫');
      expect(generateShareText(unknownSkill, 'zh')).toContain('❓');
    });

    it('should display correct quality grade', () => {
      const sGradeSkill = { ...mockSkill, qualityScore: 92 };
      const aGradeSkill = { ...mockSkill, qualityScore: 85 };
      const bGradeSkill = { ...mockSkill, qualityScore: 75 };
      const cGradeSkill = { ...mockSkill, qualityScore: 65 };
      const dGradeSkill = { ...mockSkill, qualityScore: 50 };

      expect(generateShareText(sGradeSkill, 'zh')).toContain('[S]');
      expect(generateShareText(aGradeSkill, 'zh')).toContain('[A]');
      expect(generateShareText(bGradeSkill, 'zh')).toContain('[B]');
      expect(generateShareText(cGradeSkill, 'zh')).toContain('[C]');
      expect(generateShareText(dGradeSkill, 'zh')).toContain('[D]');
    });
  });

  describe('generatePlatformShareText', () => {
    it('should generate compact text for Twitter', () => {
      const text = generatePlatformShareText(mockSkill, 'twitter', 'zh');

      expect(text).toContain('🤖');
      expect(text.length).toBeLessThanOrEqual(280);
    });

    it('should generate text with hashtags for Twitter', () => {
      const text = generatePlatformShareText(mockSkill, 'twitter', 'zh');

      expect(text).toContain('#Claude');
      expect(text).toContain('#ClaudeSkills');
    });

    it('should generate text for Weibo', () => {
      const text = generatePlatformShareText(mockSkill, 'weibo', 'zh');

      expect(text).toContain('#Claude技能');
      expect(text).toContain('#AI工具');
      expect(text.length).toBeLessThanOrEqual(140);
    });

    it('should generate markdown text for Mastodon', () => {
      const text = generatePlatformShareText(mockSkill, 'mastodon', 'zh');

      expect(text).toContain('### Test Skill');
      expect(text).toContain('- 🔗');
      expect(text).toContain('- ✅');
    });

    it('should generate detailed text for generic platform', () => {
      const text = generatePlatformShareText(mockSkill, 'generic', 'zh');

      expect(text).toContain('╔════');
      expect(text).toContain('═════╝');
    });

    it('should truncate text that exceeds maxLength', () => {
      const longDescriptionSkill = {
        ...mockSkill,
        description: 'a'.repeat(500),
        name: 'b'.repeat(100),
      };
      const text = generatePlatformShareText(longDescriptionSkill, 'twitter', 'zh');

      expect(text.length).toBeLessThanOrEqual(280);
      expect(text).toContain('...');
    });

    it('should not add hashtags for generic platform', () => {
      const text = generatePlatformShareText(mockSkill, 'generic', 'zh');

      expect(text).not.toContain('#');
    });
  });

  describe('copyToClipboard', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should copy text to clipboard successfully', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const result = await copyToClipboard('test text');

      expect(result).toBe(true);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
    });

    it('should return false on clipboard error', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'));

      const result = await copyToClipboard('test text');

      expect(result).toBe(false);
    });

    it('should handle missing clipboard API', async () => {
      const originalClipboard = navigator.clipboard;
      Object.assign(navigator, { clipboard: undefined });

      const result = await copyToClipboard('test text');

      expect(result).toBe(false);

      // Restore clipboard
      Object.assign(navigator, { clipboard: originalClipboard });
    });
  });
});
