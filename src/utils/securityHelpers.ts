import type { TrustLevel } from '../components/TrustShield';
import type { SecurityLevel } from '../types/security';

/**
 * 安全分数阈值配置
 * 用于统一管理前端安全等级判断逻辑
 */
export const SECURITY_SCORE_THRESHOLDS = {
  /** 已验证级别 (90-100分) */
  VERIFIED: 90,
  /** 安全级别 (70-89分) */
  SAFE: 70,
  /** 警告级别 (50-69分) */
  WARNING: 50,
  /** 危险级别 (0-49分) */
  CRITICAL: 0,
} as const;

/**
 * 将安全分数转换为信任等级
 * @param score - 安全分数 (0-100)
 * @returns TrustLevel - 信任等级
 *
 * @example
 * ```ts
 * scoreToTrustLevel(95) // 'verified'
 * scoreToTrustLevel(80) // 'safe'
 * scoreToTrustLevel(60) // 'warning'
 * scoreToTrustLevel(40) // 'critical'
 * scoreToTrustLevel(undefined) // 'unknown'
 * ```
 */
export function scoreToTrustLevel(score?: number): TrustLevel {
  if (score === undefined || score === null) {
    return 'unknown';
  }

  if (score >= SECURITY_SCORE_THRESHOLDS.VERIFIED) {
    return 'verified';
  }

  if (score >= SECURITY_SCORE_THRESHOLDS.SAFE) {
    return 'safe';
  }

  if (score >= SECURITY_SCORE_THRESHOLDS.WARNING) {
    return 'warning';
  }

  return 'critical';
}

/**
 * 将后端 SecurityLevel 转换为前端 TrustLevel
 * @param level - 后端安全等级
 * @returns TrustLevel - 前端信任等级
 *
 * @example
 * ```ts
 * securityLevelToTrustLevel('Safe') // 'safe'
 * securityLevelToTrustLevel('Critical') // 'critical'
 * ```
 */
export function securityLevelToTrustLevel(level?: SecurityLevel): TrustLevel {
  if (!level) {
    return 'unknown';
  }

  const mapping: Record<SecurityLevel, TrustLevel> = {
    'Safe': 'verified',      // Safe 对应最高信任等级
    'Low': 'safe',           // Low risk 对应安全
    'Medium': 'warning',     // Medium risk 对应警告
    'High': 'warning',       // High risk 对应警告
    'Critical': 'critical',  // Critical 对应危险
  };

  return mapping[level] || 'unknown';
}

/**
 * 获取安全等级的描述文本
 * @param level - 信任等级
 * @returns 描述文本
 */
export function getTrustLevelDescription(level: TrustLevel): string {
  const descriptions: Record<TrustLevel, string> = {
    verified: '此 Skill 已通过安全验证，可以安全使用',
    safe: '此 Skill 安全性良好，未发现明显风险',
    warning: '此 Skill 存在潜在安全风险，请谨慎使用',
    critical: '此 Skill 存在严重安全问题，不建议使用',
    unknown: '此 Skill 尚未进行安全扫描',
  };

  return descriptions[level];
}

/**
 * 判断分数是否处于安全范围
 * @param score - 安全分数
 * @returns 是否安全
 */
export function isSafeScore(score?: number): boolean {
  if (score === undefined || score === null) {
    return false;
  }
  return score >= SECURITY_SCORE_THRESHOLDS.SAFE;
}

/**
 * 判断分数是否处于危险范围
 * @param score - 安全分数
 * @returns 是否危险
 */
export function isCriticalScore(score?: number): boolean {
  if (score === undefined || score === null) {
    return false;
  }
  return score < SECURITY_SCORE_THRESHOLDS.WARNING;
}
