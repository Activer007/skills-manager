import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseQRCodeData,
  extractSkillImportInfo,
  getErrorMessage,
} from './qrCodeImporter';
import type { ShareImageData } from '../types/share';

describe('qrCodeImporter', () => {
  describe('parseQRCodeData', () => {
    const validShareData: ShareImageData = {
      version: '1.0',
      type: 'skill',
      data: {
        id: 'test-skill-id',
        name: 'Test Skill',
        sourceUrl: 'https://github.com/test/skill',
        installUrl: 'https://github.com/test/skill',
        description: 'A test skill for QR code import',
        author: 'Test Author',
      },
      timestamp: Date.now(),
    };

    it('should parse valid QR code data', () => {
      // 编码流程：JSON.stringify → encodeURIComponent → btoa
      const json = JSON.stringify(validShareData);
      const encoded = encodeURIComponent(json);
      const qrData = btoa(encoded);

      const result = parseQRCodeData(qrData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validShareData);
      }
    });

    it('should reject data with invalid version', () => {
      const invalidData = { ...validShareData, version: '2.0' };
      const json = JSON.stringify(invalidData);
      const encoded = encodeURIComponent(json);
      const qrData = btoa(encoded);

      const result = parseQRCodeData(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('version_mismatch');
      }
    });

    it('should reject data with invalid type', () => {
      const invalidData = { ...validShareData, type: 'invalid' };
      const json = JSON.stringify(invalidData);
      const encoded = encodeURIComponent(json);
      const qrData = btoa(encoded);

      const result = parseQRCodeData(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('invalid_share_format');
      }
    });

    it('should reject malformed JSON', () => {
      const result = parseQRCodeData('invalid-base64-data');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('invalid_qr_data');
      }
    });

    it('should reject data missing required fields', () => {
      const invalidData = {
        version: '1.0',
        type: 'skill',
        data: {
          // missing id, name, description
        },
        timestamp: Date.now(),
      };
      const json = JSON.stringify(invalidData);
      const encoded = encodeURIComponent(json);
      const qrData = btoa(encoded);

      const result = parseQRCodeData(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('invalid_share_format');
      }
    });

    it('should reject data without version field', () => {
      const invalidData = { ...validShareData, version: undefined };
      const json = JSON.stringify(invalidData);
      const encoded = encodeURIComponent(json);
      const qrData = btoa(encoded);

      const result = parseQRCodeData(qrData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('invalid_share_format');
      }
    });
  });

  describe('extractSkillImportInfo', () => {
    const shareData: ShareImageData = {
      version: '1.0',
      type: 'skill',
      data: {
        id: 'skill-123',
        name: 'Awesome Skill',
        sourceUrl: 'https://github.com/awesome/skill',
        installUrl: 'https://github.com/awesome/skill',
        description: 'An awesome skill description',
        author: 'Awesome Developer',
      },
      timestamp: Date.now(),
    };

    it('should extract all fields correctly', () => {
      const result = extractSkillImportInfo(shareData);

      expect(result).toEqual({
        skillId: 'skill-123',
        skillName: 'Awesome Skill',
        sourceUrl: 'https://github.com/awesome/skill',
        installUrl: 'https://github.com/awesome/skill',
        description: 'An awesome skill description',
      });
    });

    it('should handle missing optional fields', () => {
      const minimalData: ShareImageData = {
        version: '1.0',
        type: 'skill',
        data: {
          id: 'skill-456',
          name: 'Minimal Skill',
          description: 'Minimal description',
        },
        timestamp: Date.now(),
      };

      const result = extractSkillImportInfo(minimalData);

      expect(result).toEqual({
        skillId: 'skill-456',
        skillName: 'Minimal Skill',
        sourceUrl: undefined,
        installUrl: undefined,
        description: 'Minimal description',
      });
    });

    it('should handle sourceUrl only', () => {
      const dataWithSource: ShareImageData = {
        version: '1.0',
        type: 'skill',
        data: {
          id: 'skill-789',
          name: 'Source Skill',
          sourceUrl: 'https://github.com/source/skill',
          description: 'Source URL skill',
        },
        timestamp: Date.now(),
      };

      const result = extractSkillImportInfo(dataWithSource);

      expect(result).toEqual({
        skillId: 'skill-789',
        skillName: 'Source Skill',
        sourceUrl: 'https://github.com/source/skill',
        installUrl: undefined,
        description: 'Source URL skill',
      });
    });

    it('should handle installUrl only', () => {
      const dataWithInstall: ShareImageData = {
        version: '1.0',
        type: 'skill',
        data: {
          id: 'skill-101',
          name: 'Install Skill',
          installUrl: 'https://github.com/install/skill',
          description: 'Install URL skill',
        },
        timestamp: Date.now(),
      };

      const result = extractSkillImportInfo(dataWithInstall);

      expect(result).toEqual({
        skillId: 'skill-101',
        skillName: 'Install Skill',
        sourceUrl: undefined,
        installUrl: 'https://github.com/install/skill',
        description: 'Install URL skill',
      });
    });
  });

  describe('getErrorMessage', () => {
    it('should return Chinese error messages', () => {
      expect(getErrorMessage('no_qrcode_found', 'zh')).toBe('未在图片中识别到二维码');
      expect(getErrorMessage('invalid_qr_data', 'zh')).toBe('二维码数据格式错误');
      expect(getErrorMessage('invalid_share_format', 'zh')).toBe('分享数据格式无效');
      expect(getErrorMessage('version_mismatch', 'zh')).toBe('分享数据版本不匹配');
      expect(getErrorMessage('network_error', 'zh')).toBe('网络连接失败');
      expect(getErrorMessage('import_failed', 'zh')).toBe('导入失败');
      expect(getErrorMessage('unknown_error', 'zh')).toBe('未知错误');
    });

    it('should return English error messages', () => {
      expect(getErrorMessage('no_qrcode_found', 'en')).toBe('No QR code found in the image');
      expect(getErrorMessage('invalid_qr_data', 'en')).toBe('Invalid QR code data format');
      expect(getErrorMessage('invalid_share_format', 'en')).toBe('Invalid share data format');
      expect(getErrorMessage('version_mismatch', 'en')).toBe('Share data version mismatch');
      expect(getErrorMessage('network_error', 'en')).toBe('Network connection failed');
      expect(getErrorMessage('import_failed', 'en')).toBe('Import failed');
      expect(getErrorMessage('unknown_error', 'en')).toBe('Unknown error');
    });

    it('should return unknown error for invalid error type', () => {
      const invalidError = 'invalid_error' as any;
      expect(getErrorMessage(invalidError, 'zh')).toBe('未知错误');
      expect(getErrorMessage(invalidError, 'en')).toBe('Unknown error');
    });
  });
});
