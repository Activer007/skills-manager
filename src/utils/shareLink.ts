import type { InstalledSkill } from '../types';
import type { ParsedShareLink } from '../types/share';

const getConfigString = (
  config: Record<string, unknown> | undefined,
  key: string
): string | undefined => {
  const value = config?.[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const resolveSkillLink = (skill: InstalledSkill): string | undefined => {
  const extendedSkill = skill as typeof skill & {
    sourceUrl?: string;
    githubUrl?: string;
  };
  const config = skill.config as Record<string, unknown> | undefined;
  const origin = config?.__origin as Record<string, unknown> | undefined;

  return (
    getConfigString(origin, 'installUrl') ||
    getConfigString(origin, 'originUrl') ||
    getConfigString(origin, 'repoUrl') ||
    getConfigString({ sourceUrl: extendedSkill.sourceUrl }, 'sourceUrl') ||
    getConfigString({ githubUrl: extendedSkill.githubUrl }, 'githubUrl') ||
    getConfigString(config, 'repoUrl') ||
    getConfigString(config, 'githubUrl') ||
    getConfigString(config, 'sourceUrl') ||
    getConfigString(config, 'installUrl')
  );
};

// ============================================
// ShareLink ID Extraction
// ============================================

/**
 * 解析分享链接 ID
 */
export const parseShareLink = (rawLink: string): { valid: boolean; id?: string; error?: string } => {
  if (!rawLink) {
    return { valid: false, error: 'Empty link' };
  }

  // Handle full URL
  let id = rawLink;
  if (rawLink.includes('/share/')) {
    const parts = rawLink.split('/share/');
    id = parts[parts.length - 1];
  }

  // Remove query params or hash
  id = id.split('?')[0].split('#')[0];

  // Validate UUID format (simple check)
  // UUID regex: 8-4-4-4-12 hex digits
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
     return { valid: false, error: 'Invalid share ID format' };
  }

  return {
    valid: true,
    id,
  };
};

/**
 * 验证分享链接是否有效 (Just checks format now)
 */
export const isValidShareLink = (rawLink: string): boolean => {
  const parsed = parseShareLink(rawLink);
  return parsed.valid;
};
