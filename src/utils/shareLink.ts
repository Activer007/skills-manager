import type { InstalledSkill } from '../types';
import type { ShareLink, ParsedShareLink, ShareLinkType } from '../types/share';

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
// ShareLink 生成和解析 (T3-2)
// ============================================

/**
 * 生成唯一 ID
 */
const generateId = (): string => {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${randomPart}`;
};

/**
 * 检测链接类型
 */
const detectLinkType = (sourceUrl?: string): ShareLinkType => {
  if (!sourceUrl) return 'local';
  if (sourceUrl.includes('github.com')) return 'github';
  if (sourceUrl.startsWith('skills-manager://')) return 'deep';
  return 'local';
};

/**
 * 规范化安全等级
 */
const normalizeSecurityLevel = (
  status?: string
): 'safe' | 'risk' | 'blocked' | 'unknown' => {
  switch (status) {
    case 'safe':
      return 'safe';
    case 'risk':
    case 'unsafe':
      return 'risk';
    case 'blocked':
      return 'blocked';
    default:
      return 'unknown';
  }
};

/**
 * 从 Skill 生成分享链接数据
 */
export const generateShareLink = (skill: InstalledSkill): ShareLink => {
  const sourceUrl = resolveSkillLink(skill);
  const linkType = detectLinkType(sourceUrl);

  return {
    id: generateId(),
    type: linkType,
    objectId: skill.id,
    name: skill.name,
    description: skill.description,
    author: skill.author,
    version: skill.version,
    sourceUrl,
    installUrl: sourceUrl || `skills-manager://install?id=${skill.id}`,
    securityLevel: normalizeSecurityLevel(skill.status),
    qualityScore: skill.qualityScore,
    visibility: 'public',
    createdAt: Date.now(),
    metadata: {
      localPath: skill.localPath,
      type: skill.type,
    },
  };
};

/**
 * 编码分享链接为 URL 安全的字符串
 */
export const encodeShareLink = (link: ShareLink): string => {
  const json = JSON.stringify(link);
  return btoa(encodeURIComponent(json));
};

/**
 * 解码分享链接字符串
 */
export const decodeShareLink = (encoded: string): ShareLink | null => {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json) as ShareLink;
  } catch {
    return null;
  }
};

/**
 * 生成完整的分享 URL
 */
export const generateShareUrl = (skill: InstalledSkill): string => {
  const link = generateShareLink(skill);
  const encoded = encodeShareLink(link);
  // 使用应用内路由格式
  return `/share/${encoded}`;
};

/**
 * 解析分享链接
 */
export const parseShareLink = (rawLink: string): ParsedShareLink => {
  // 处理完整 URL 或仅编码部分
  let encoded = rawLink;

  // 如果是完整路径，提取编码部分
  if (rawLink.includes('/share/')) {
    const parts = rawLink.split('/share/');
    encoded = parts[parts.length - 1];
  }

  // 移除可能的查询参数
  if (encoded.includes('?')) {
    encoded = encoded.split('?')[0];
  }

  // 移除可能的 hash
  if (encoded.includes('#')) {
    encoded = encoded.split('#')[0];
  }

  const data = decodeShareLink(encoded);

  if (!data) {
    return {
      valid: false,
      error: 'Invalid share link format',
      rawLink,
    };
  }

  // 检查是否过期
  if (data.expiresAt && data.expiresAt < Date.now()) {
    return {
      valid: false,
      data,
      error: 'Share link has expired',
      rawLink,
    };
  }

  return {
    valid: true,
    data,
    rawLink,
  };
};

/**
 * 验证分享链接是否有效
 */
export const isValidShareLink = (rawLink: string): boolean => {
  const parsed = parseShareLink(rawLink);
  return parsed.valid;
};

/**
 * 从分享链接获取安装 URL
 */
export const getInstallUrlFromShareLink = (
  rawLink: string
): string | undefined => {
  const parsed = parseShareLink(rawLink);
  if (!parsed.valid || !parsed.data) return undefined;
  return parsed.data.installUrl || parsed.data.sourceUrl;
};
