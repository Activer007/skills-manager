import { describe, it, expect } from 'vitest';
import { getLocalizedDescription } from './i18n';

describe('getLocalizedDescription', () => {
  const baseSkill = {
    description: 'Default description',
  };

  describe('Chinese language (zh)', () => {
    it('should return description_cn when available', () => {
      const skill = {
        ...baseSkill,
        description_cn: '中文描述',
      };
      expect(getLocalizedDescription(skill, 'zh')).toBe('中文描述');
    });

    it('should return descriptionZh when description_cn not available', () => {
      const skill = {
        ...baseSkill,
        descriptionZh: '中文描述（驼峰命名）',
      };
      expect(getLocalizedDescription(skill, 'zh')).toBe('中文描述（驼峰命名）');
    });

    it('should fallback to description_en when no Chinese description', () => {
      const skill = {
        ...baseSkill,
        description_en: 'English description',
      };
      expect(getLocalizedDescription(skill, 'zh')).toBe('English description');
    });

    it('should fallback to descriptionEn when description_cn and descriptionZh not available', () => {
      const skill = {
        ...baseSkill,
        descriptionEn: 'English description (驼峰命名)',
      };
      expect(getLocalizedDescription(skill, 'zh')).toBe('English description (驼峰命名)');
    });

    it('should return default description when no localized description', () => {
      expect(getLocalizedDescription(baseSkill, 'zh')).toBe('Default description');
    });

    it('should prioritize description_cn over descriptionZh', () => {
      const skill = {
        ...baseSkill,
        description_cn: '中文描述（下划线）',
        descriptionZh: '中文描述（驼峰）',
      };
      expect(getLocalizedDescription(skill, 'zh')).toBe('中文描述（下划线）');
    });

    it('should handle all description fields present', () => {
      const skill = {
        description: 'Default',
        description_cn: '中文',
        descriptionZh: '中文（驼峰）',
        description_en: 'English',
        descriptionEn: 'English (驼峰)',
      };
      expect(getLocalizedDescription(skill, 'zh')).toBe('中文');
    });
  });

  describe('English language (en)', () => {
    it('should return description_en when available', () => {
      const skill = {
        ...baseSkill,
        description_en: 'English description',
      };
      expect(getLocalizedDescription(skill, 'en')).toBe('English description');
    });

    it('should return descriptionEn when description_en not available', () => {
      const skill = {
        ...baseSkill,
        descriptionEn: 'English description (驼峰命名)',
      };
      expect(getLocalizedDescription(skill, 'en')).toBe('English description (驼峰命名)');
    });

    it('should fallback to default description when no English description', () => {
      expect(getLocalizedDescription(baseSkill, 'en')).toBe('Default description');
    });

    it('should prioritize description_en over descriptionEn', () => {
      const skill = {
        ...baseSkill,
        description_en: 'English（下划线）',
        descriptionEn: 'English（驼峰）',
      };
      expect(getLocalizedDescription(skill, 'en')).toBe('English（下划线）');
    });
  });

  describe('Other languages', () => {
    it('should use English logic for non-zh languages', () => {
      const skill = {
        ...baseSkill,
        description_en: 'English description',
      };
      expect(getLocalizedDescription(skill, 'fr')).toBe('English description');
    });

    it('should fallback to default for other languages', () => {
      expect(getLocalizedDescription(baseSkill, 'de')).toBe('Default description');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty description_cn', () => {
      const skill = {
        ...baseSkill,
        description_cn: '',
        description_en: 'English',
      };
      expect(getLocalizedDescription(skill, 'zh')).toBe('English');
    });

    it('should handle empty string description_en', () => {
      const skill = {
        ...baseSkill,
        description_en: '',
      };
      expect(getLocalizedDescription(skill, 'en')).toBe('Default description');
    });

    it('should handle skill with only default description', () => {
      expect(getLocalizedDescription(baseSkill, 'zh')).toBe('Default description');
      expect(getLocalizedDescription(baseSkill, 'en')).toBe('Default description');
    });

    it('should handle null/undefined optional fields', () => {
      const skill = {
        description: 'Default',
        description_cn: null as unknown as string,
        description_en: undefined as unknown as string,
      };
      expect(getLocalizedDescription(skill, 'zh')).toBe('Default');
      expect(getLocalizedDescription(skill, 'en')).toBe('Default');
    });
  });

  describe('Real-world scenarios', () => {
    it('should work with GitHub skill data', () => {
      const githubSkill = {
        description: 'A useful skill for code analysis',
        description_cn: '用于代码分析的有用技能',
        description_en: 'A useful skill for code analysis',
      };

      expect(getLocalizedDescription(githubSkill, 'zh')).toBe('用于代码分析的有用技能');
      expect(getLocalizedDescription(githubSkill, 'en')).toBe('A useful skill for code analysis');
    });

    it('should work with skill only having English description', () => {
      const englishOnlySkill = {
        description: 'An English-only skill',
        description_en: 'An English-only skill',
      };

      expect(getLocalizedDescription(englishOnlySkill, 'zh')).toBe('An English-only skill');
      expect(getLocalizedDescription(englishOnlySkill, 'en')).toBe('An English-only skill');
    });

    it('should work with skill only having Chinese description', () => {
      const chineseOnlySkill = {
        description: '一个只有中文的技能',
        description_cn: '一个只有中文的技能',
      };

      expect(getLocalizedDescription(chineseOnlySkill, 'zh')).toBe('一个只有中文的技能');
      expect(getLocalizedDescription(chineseOnlySkill, 'en')).toBe('一个只有中文的技能');
    });
  });
});
