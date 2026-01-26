import type { InstalledSkill } from '../types';

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
 * Share link validation result
 */
export interface ShareLinkValidationResult {
  valid: boolean;
  id?: string;
  error?: string;
  errorCode?: 'EMPTY' | 'INVALID_FORMAT' | 'INVALID_LENGTH' | 'INVALID_CHARACTERS';
}

/**
 * Validate share ID format with strict checks
 * Format: UUID v4 (8-4-4-4-12 hex digits)
 */
const validateShareId = (id: string): ShareLinkValidationResult => {
  // Trim whitespace
  const trimmed = id.trim();

  // Check length (UUID = 36 chars with dashes)
  if (trimmed.length !== 36) {
    return {
      valid: false,
      error: `Invalid share ID length: expected 36 characters, got ${trimmed.length}`,
      errorCode: 'INVALID_LENGTH',
    };
  }

  // Check character set (only hex digits and dashes allowed)
  if (!/^[0-9a-fA-F-]+$/.test(trimmed)) {
    return {
      valid: false,
      error: 'Share ID contains invalid characters (only 0-9, a-f, A-F, and - allowed)',
      errorCode: 'INVALID_CHARACTERS',
    };
  }

  // Validate UUID format (8-4-4-4-12 pattern)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmed)) {
    return {
      valid: false,
      error: 'Invalid share ID format (expected UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)',
      errorCode: 'INVALID_FORMAT',
    };
  }

  return {
    valid: true,
    id: trimmed.toLowerCase(), // Normalize to lowercase
  };
};

/**
 * Parse and validate a share link
 * Supports both full URLs and bare share IDs
 *
 * @example
 * parseShareLink('https://example.com/share/123e4567-e89b-12d3-a456-426614174000')
 * // => { valid: true, id: '123e4567-e89b-12d3-a456-426614174000' }
 *
 * parseShareLink('123e4567-e89b-12d3-a456-426614174000')
 * // => { valid: true, id: '123e4567-e89b-12d3-a456-426614174000' }
 */
export const parseShareLink = (rawLink: string): ShareLinkValidationResult => {
  // Check for empty or undefined
  if (!rawLink || typeof rawLink !== 'string') {
    return {
      valid: false,
      error: 'Share link is empty or invalid',
      errorCode: 'EMPTY',
    };
  }

  const trimmed = rawLink.trim();

  // Check for obviously malicious input (very long strings)
  if (trimmed.length > 2048) {
    return {
      valid: false,
      error: 'Share link is too long (max 2048 characters)',
      errorCode: 'INVALID_LENGTH',
    };
  }

  // Handle full URL format: https://domain.com/share/{shareId}
  let shareId = trimmed;
  if (trimmed.includes('/share/')) {
    try {
      const url = new URL(trimmed);

      // Validate protocol (only allow http/https)
      if (!['http:', 'https:'].includes(url.protocol)) {
        return {
          valid: false,
          error: 'Invalid URL protocol (only http/https allowed)',
          errorCode: 'INVALID_FORMAT',
        };
      }

      // Extract share ID from path
      const pathParts = url.pathname.split('/share/');
      if (pathParts.length < 2) {
        return {
          valid: false,
          error: 'Invalid share link URL (missing /share/ path)',
          errorCode: 'INVALID_FORMAT',
        };
      }

      shareId = pathParts[pathParts.length - 1];
    } catch {
      // If URL parsing fails, try treating it as a bare ID
      shareId = trimmed;
    }
  }

  // Remove query parameters and hash
  shareId = shareId.split('?')[0].split('#')[0];

  // Validate the extracted share ID
  return validateShareId(shareId);
};

/**
 * 验证分享链接是否有效
 *
 * @deprecated Use parseShareLink() instead for detailed error information
 * @param rawLink - The share link or ID to validate
 * @returns true if valid, false otherwise
 */
export const isValidShareLink = (rawLink: string): boolean => {
  const parsed = parseShareLink(rawLink);
  return parsed.valid;
};

/**
 * Get a safe share ID for use in API calls
 * Returns null if the link is invalid
 */
export const getSafeShareId = (rawLink: string): string | null => {
  const parsed = parseShareLink(rawLink);
  return parsed.valid && parsed.id ? parsed.id : null;
};
