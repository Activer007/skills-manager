import { ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { cn } from '../utils/cn';

export type TrustLevel = 'verified' | 'safe' | 'warning' | 'critical' | 'unknown';

/**
 * TrustShield - 安全信任等级徽章组件
 *
 * 用于可视化展示 Skill 的安全等级和评分，支持多种尺寸和显示模式。
 *
 * @example
 * ```tsx
 * // 完整显示（带标签和评分）
 * <TrustShield level="safe" score={85} size="md" showLabel={true} />
 *
 * // 紧凑显示（仅图标）
 * <TrustShield level="verified" score={95} size="sm" showLabel={false} />
 *
 * // 未知状态
 * <TrustShield level="unknown" />
 * ```
 */

interface TrustShieldProps {
  /** 安全信任等级 */
  level: TrustLevel;
  /** 安全评分 (0-100) */
  score?: number;
  /** 徽章尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示文字标签 */
  showLabel?: boolean;
  /** 自定义 CSS 类名 */
  className?: string;
}

const levelConfig = {
  verified: {
    icon: ShieldCheck,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    label: 'Verified',
  },
  safe: {
    icon: ShieldCheck,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    label: 'Safe',
  },
  warning: {
    icon: ShieldAlert,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    label: 'Warning',
  },
  critical: {
    icon: ShieldAlert,
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    label: 'Critical',
  },
  unknown: {
    icon: ShieldQuestion,
    color: 'text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    label: 'Unknown',
  },
};

const sizeConfig = {
  sm: { icon: 14, text: 'text-xs', p: 'px-2 py-0.5' },
  md: { icon: 18, text: 'text-sm', p: 'px-3 py-1' },
  lg: { icon: 24, text: 'text-base', p: 'px-4 py-2' },
};

export const TrustShield = ({
  level,
  score,
  size = 'md',
  showLabel = true,
  className
}: TrustShieldProps) => {
  const config = levelConfig[level] || levelConfig.unknown;
  const sizeClass = sizeConfig[size];
  const Icon = config.icon;

  const ariaLabel = `Security level: ${config.label}. Score: ${score ?? 'N/A'}`;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
        config.color,
        config.bg,
        config.border,
        sizeClass.p,
        className
      )}
      role="status"
      aria-label={ariaLabel}
      title={`Security Score: ${score ?? 'N/A'}`}
    >
      <Icon size={sizeClass.icon} aria-hidden="true" />
      {showLabel && (
        <span className={sizeClass.text}>
          {config.label}
          {score !== undefined && <span className="opacity-75 ml-1">({score})</span>}
        </span>
      )}
    </div>
  );
};
