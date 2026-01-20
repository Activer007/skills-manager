import { describe, it, expect, vi } from 'vitest';
import {
  encodeShareData,
  generateShareData,
  CARD_THEMES,
  type ShareImageData,
} from './shareCardGenerator';
import type { InstalledSkill } from '../types';

// Mock html2canvas and qrcode
vi.mock('html2canvas', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      toBlob: (callback: (blob: Blob) => void) => {
        callback(new Blob(['mock image data'], { type: 'image/png' }));
      },
    })
  ),
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(() => Promise.resolve('data:image/png;base64,mock-qrcode')),
  },
}));

describe('shareCardGenerator', () => {
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

  describe('CARD_THEMES', () => {
    it('should have default theme', () => {
      expect(CARD_THEMES.default).toBeDefined();
      expect(CARD_THEMES.default.theme).toBe('light');
      expect(CARD_THEMES.default.width).toBe(800);
      expect(CARD_THEMES.default.height).toBe(600);
      expect(CARD_THEMES.default.watermark).toBe(true);
    });

    it('should have minimal theme', () => {
      expect(CARD_THEMES.minimal).toBeDefined();
      expect(CARD_THEMES.minimal.width).toBe(600);
      expect(CARD_THEMES.minimal.height).toBe(400);
      expect(CARD_THEMES.minimal.watermark).toBe(false);
    });

    it('should have dark theme', () => {
      expect(CARD_THEMES.dark).toBeDefined();
      expect(CARD_THEMES.dark.theme).toBe('dark');
      expect(CARD_THEMES.dark.watermark).toBe(true);
    });
  });

  describe('encodeShareData', () => {
    it('should encode share data to base64', () => {
      const data: ShareImageData = {
        version: '1.0',
        type: 'skill',
        data: {
          id: 'test-id',
          name: 'Test',
          description: 'Test description',
          installUrl: 'https://example.com',
        },
        timestamp: Date.now(),
      };

      const encoded = encodeShareData(data);

      expect(typeof encoded).toBe('string');
      expect(encoded.length).toBeGreaterThan(0);
      // Base64 encoded string should only contain specific characters
      expect(encoded).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    it('should encode data that can be decoded', () => {
      const data: ShareImageData = {
        version: '1.0',
        type: 'skill',
        data: {
          id: 'test-id',
          name: 'Test',
          description: 'Test description',
          installUrl: 'https://example.com',
        },
        timestamp: 1234567890,
      };

      const encoded = encodeShareData(data);

      // Decode (reverse the encoding process)
      const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
      expect(decoded.version).toBe(data.version);
      expect(decoded.type).toBe(data.type);
      expect(decoded.data.id).toBe(data.data.id);
    });
  });

  describe('generateShareData', () => {
    it('should generate share data from skill', () => {
      const data = generateShareData(mockSkill);

      expect(data.version).toBe('1.0');
      expect(data.type).toBe('skill');
      expect(data.data.id).toBe(mockSkill.id);
      expect(data.data.name).toBe(mockSkill.name);
      expect(data.data.sourceUrl).toBe(mockSkill.sourceUrl);
      expect(data.timestamp).toBeDefined();
      expect(data.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should truncate description to 100 characters', () => {
      const longDescriptionSkill: InstalledSkill = {
        ...mockSkill,
        description: 'a'.repeat(200),
      };

      const data = generateShareData(longDescriptionSkill);

      expect(data.data.description.length).toBeLessThanOrEqual(100);
    });

    it('should generate installUrl when sourceUrl is not available', () => {
      const skillWithoutUrl: InstalledSkill = {
        ...mockSkill,
        sourceUrl: undefined,
      };

      const data = generateShareData(skillWithoutUrl);

      expect(data.data.installUrl).toBe(`skills-manager://install?id=${mockSkill.id}`);
    });

    it('should use sourceUrl as installUrl when available', () => {
      const data = generateShareData(mockSkill);

      expect(data.data.installUrl).toBe(mockSkill.sourceUrl);
    });
  });
});
