import type { InstalledSkill } from '../types';

/**
 * 规范化安全等级
 * 将 status ('safe'|'unsafe'|'unknown') 转换为 securityLevel ('safe'|'risk'|'blocked'|'unknown')
 */
export function normalizeSecurityLevel(
  skill: InstalledSkill
): 'safe' | 'risk' | 'blocked' | 'unknown' {
  // 优先使用已存在的 securityLevel
  if (skill.securityLevel) {
    return skill.securityLevel;
  }

  // 从 status 映射
  switch (skill.status) {
    case 'safe':
      return 'safe';
    case 'unsafe':
      return 'risk';  // unsafe -> risk
    case 'unknown':
    default:
      return 'unknown';
  }
}

/**
 * 获取 Skill 的质量评分
 */
export function getQualityScore(
  skill: InstalledSkill
): number | undefined {
  return skill.qualityScore;
}

/**
 * 获取 Skill 的来源 URL
 * 优先级: sourceUrl > githubUrl > localPath
 */
export function getSourceUrl(
  skill: InstalledSkill
): string | undefined {
  return skill.sourceUrl || skill.githubUrl || skill.localPath;
}
