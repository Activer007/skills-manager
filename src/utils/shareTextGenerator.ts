import type { InstalledSkill } from '../types';
import type { PlatformConfig, SharePlatform } from '../types/share';
import { resolveSkillLink } from './shareLink';
import { getQualityScore } from './skillNormalizers';

/**
 * 平台配置
 */
const PLATFORM_CONFIGS: Record<SharePlatform, PlatformConfig> = {
  twitter: {
    maxLength: 280,
    hashtags: ['Claude', 'ClaudeSkills', 'AI'],
    template: 'compact',
  },
  weibo: {
    maxLength: 140,
    hashtags: ['Claude技能', 'AI工具'],
    template: 'compact', // 改为 compact 避免文本过长
  },
  mastodon: {
    maxLength: 500,
    hashtags: ['Claude', 'Skills'],
    template: 'markdown',
  },
  markdown: {
    maxLength: Infinity,
    hashtags: [],
    template: 'markdown',
  },
  generic: {
    maxLength: Infinity,
    hashtags: [],
    template: 'detailed',
  },
};

/**
 * 安全等级 Emoji 映射
 */
const SECURITY_EMOJIS: Record<string, string> = {
  safe: '✅',
  risk: '⚠️',
  blocked: '🚫',
  unknown: '❓',
};

/**
 * 安全等级文本映射（中文）
 */
const SECURITY_LABELS_ZH: Record<string, string> = {
  safe: '安全',
  risk: '有风险',
  blocked: '已阻止',
  unknown: '未知',
};

/**
 * 安全等级文本映射（英文）
 */
const SECURITY_LABELS_EN: Record<string, string> = {
  safe: 'Safe',
  risk: 'Risk',
  blocked: 'Blocked',
  unknown: 'Unknown',
};

type ShareTextOptions = {
  modified?: boolean;
};

/**
 * 获取安全等级标签
 */
const getSecurityLabel = (level: string, locale: string): string => {
  const labels = locale === 'zh' ? SECURITY_LABELS_ZH : SECURITY_LABELS_EN;
  return labels[level] || level;
};

const normalizeShareStatus = (
  status?: string
): 'safe' | 'risk' | 'blocked' | 'unknown' => {
  if (!status) return 'unknown';

  switch (status) {
    case 'safe':
      return 'safe';
    case 'risk':
      return 'risk';
    case 'blocked':
      return 'blocked';
    case 'unsafe':
      return 'risk';
    default:
      return 'unknown';
  }
};

/**
 * 生成质量等级字母
 */
const getQualityGrade = (score: number): string => {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
};

/**
 * 生成完整分享文本（详细格式）
 */
export const generateShareText = (
  skill: InstalledSkill,
  locale: string = 'zh'
): string => {
  const sourceUrl = resolveSkillLink(skill) || '本地创建';
  const status = normalizeShareStatus(skill.status);
  const qualityScore = getQualityScore(skill);

  const securityEmoji = SECURITY_EMOJIS[status] || '❓';
  const securityLabel = getSecurityLabel(status, locale);
  const qualityLine = qualityScore
    ? `\n⭐ 质量评分: ${qualityScore}/100 [${getQualityGrade(qualityScore)}]`
    : '';

  // 生成文本
  const text = `
╔════════════════════════════════════════╗
║${skill.name.padEnd(32)}║
╚════════════════════════════════════════╝

📝 ${skill.description}

🔗 链接: ${sourceUrl}

${securityEmoji} 安全等级: ${securityLabel}${qualityLine}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
来自 Skill Master 分享
https://github.com/activer007/skills-manager
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();

  return text;
};

/**
 * 生成紧凑格式分享文本
 */
const generateCompactText = (
  skill: InstalledSkill,
  locale: string = 'zh'
): string => {
  const sourceUrl = resolveSkillLink(skill) || '本地创建';
  const status = normalizeShareStatus(skill.status);
  const qualityScore = getQualityScore(skill);

  const securityEmoji = SECURITY_EMOJIS[status] || '❓';
  const securityLabel = getSecurityLabel(status, locale);
  const qualityText = qualityScore
    ? ` ⭐ ${qualityScore}/100`
    : '';

  const description =
    skill.description.length > 100
      ? skill.description.substring(0, 100) + '...'
      : skill.description;

  return `🤖 ${skill.name}\n\n${description}\n\n${securityEmoji} ${securityLabel}:${qualityText}\n🔗 ${sourceUrl}`;
};

/**
 * 生成 Markdown 格式分享文本
 */
const generateMarkdownText = (
  skill: InstalledSkill,
  locale: string = 'zh'
): string => {
  const sourceUrl = resolveSkillLink(skill) || '本地创建';
  const status = normalizeShareStatus(skill.status);
  const qualityScore = getQualityScore(skill);

  const securityLabel = getSecurityLabel(status, locale);
  const qualityText = qualityScore
    ? `- ⭐ 质量评分: ${qualityScore}/100 [${getQualityGrade(qualityScore)}]\n`
    : '';

  return `### ${skill.name}

${skill.description}

- 🔗 链接: ${sourceUrl}
- ✅ 安全等级: ${securityLabel}
${qualityText}
---
来自 Skill Master 分享`;
};

/**
 * 生成平台特定的分享文本
 */
export const generatePlatformShareText = (
  skill: InstalledSkill,
  platform: SharePlatform = 'generic',
  locale: string = 'zh',
  options?: ShareTextOptions
): string => {
  const config = PLATFORM_CONFIGS[platform] ?? PLATFORM_CONFIGS.generic;

  let text: string;

  switch (config.template) {
    case 'compact':
      text = generateCompactText(skill, locale);
      break;
    case 'markdown':
      text = generateMarkdownText(skill, locale);
      break;
    case 'detailed':
    default:
      text = generateShareText(skill, locale);
      break;
  }

  if (options?.modified) {
    const notice =
      locale === 'zh'
        ? '⚠️ 本地已修改，原始链接不包含修改内容'
        : '⚠️ Locally modified; original link excludes changes';
    text = `${text}\n\n${notice}`;
  }

  // 添加标签
  if (config.hashtags.length > 0) {
    text += '\n\n' + config.hashtags.map((tag) => `#${tag}`).join(' ');
  }

  // 截断超长文本
  if (text.length > config.maxLength && config.maxLength !== Infinity) {
    text = text.substring(0, config.maxLength - 3) + '...';
  }

  return text;
};

/**
 * 复制文本到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};
