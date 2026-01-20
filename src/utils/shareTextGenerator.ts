import type { InstalledSkill } from '../types';
import type { PlatformConfig, SharePlatform } from '../types/share';

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

/**
 * 获取安全等级标签
 */
const getSecurityLabel = (level: string, locale: string): string => {
  const labels = locale === 'zh' ? SECURITY_LABELS_ZH : SECURITY_LABELS_EN;
  return labels[level] || level;
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
  const securityEmoji = SECURITY_EMOJIS[skill.status] || '❓';
  const securityLabel = getSecurityLabel(skill.status, locale);
  const qualityLine = skill.qualityScore
    ? `\n⭐ 质量评分: ${skill.qualityScore}/100 [${getQualityGrade(skill.qualityScore)}]`
    : '';

  // 生成文本
  const text = `
╔════════════════════════════════════════╗
║${skill.name.padEnd(32)}║
╚════════════════════════════════════════╝

📝 ${skill.description}

🔗 链接: ${skill.sourceUrl || '本地创建'}

${securityEmoji} 安全等级: ${securityLabel}${qualityLine}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
来自 Skill Manager 分享
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
  const securityEmoji = SECURITY_EMOJIS[skill.status] || '❓';
  const securityLabel = getSecurityLabel(skill.status, locale);
  const qualityText = skill.qualityScore
    ? ` ⭐ ${skill.qualityScore}/100`
    : '';

  const description =
    skill.description.length > 100
      ? skill.description.substring(0, 100) + '...'
      : skill.description;

  return `🤖 ${skill.name}\n\n${description}\n\n${securityEmoji} ${securityLabel}:${qualityText}\n🔗 ${skill.sourceUrl || '本地创建'}`;
};

/**
 * 生成 Markdown 格式分享文本
 */
const generateMarkdownText = (
  skill: InstalledSkill,
  locale: string = 'zh'
): string => {
  const securityLabel = getSecurityLabel(skill.status, locale);
  const qualityText = skill.qualityScore
    ? `- ⭐ 质量评分: ${skill.qualityScore}/100 [${getQualityGrade(skill.qualityScore)}]\n`
    : '';

  return `### ${skill.name}

${skill.description}

- 🔗 链接: ${skill.sourceUrl || '本地创建'}
- ✅ 安全等级: ${securityLabel}
${qualityText}
---
来自 Skill Manager 分享`;
};

/**
 * 生成平台特定的分享文本
 */
export const generatePlatformShareText = (
  skill: InstalledSkill,
  platform: SharePlatform = 'generic',
  locale: string = 'zh'
): string => {
  const config = PLATFORM_CONFIGS[platform];

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
