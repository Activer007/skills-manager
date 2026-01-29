import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Monitor,
  Command,
  Terminal,
  Cpu,
  Filter,
  X,
  Package,
  Sparkles,
  Users
} from 'lucide-react';
import type { AgentType } from '../types';

export type SecurityFilter = 'all' | 'safe' | 'risk' | 'unknown';
export type CompatibilityFilter = 'all' | AgentType;
export type SourceFilter = 'all' | 'featured' | 'user';

interface FilterPanelProps {
  securityFilter: SecurityFilter;
  setSecurityFilter: (filter: SecurityFilter) => void;
  compatibilityFilter: CompatibilityFilter;
  setCompatibilityFilter: (filter: CompatibilityFilter) => void;
  sourceFilter: SourceFilter;
  setSourceFilter: (filter: SourceFilter) => void;
  onReset: () => void;
  className?: string;
}

export const FilterPanel = ({
  securityFilter,
  setSecurityFilter,
  compatibilityFilter,
  setCompatibilityFilter,
  sourceFilter,
  setSourceFilter,
  onReset,
  className
}: FilterPanelProps) => {
  const { i18n } = useTranslation();

  const securityOptions: { value: SecurityFilter; label: string; icon?: React.ReactNode }[] = [
    { value: 'all', label: i18n.language === 'zh' ? '全部等级' : 'All Levels' },
    {
      value: 'safe',
      label: i18n.language === 'zh' ? '安全 (Safe)' : 'Safe',
      icon: <CheckCircle size={14} className="text-green-500" />
    },
    {
      value: 'risk',
      label: i18n.language === 'zh' ? '有风险 (Risk)' : 'Risk',
      icon: <AlertTriangle size={14} className="text-yellow-500" />
    },
    {
      value: 'unknown',
      label: i18n.language === 'zh' ? '未知 (Unknown)' : 'Unknown',
      icon: <Shield size={14} className="text-slate-400" />
    },
  ];

  const compatibilityOptions: { value: CompatibilityFilter; label: string; icon?: React.ReactNode }[] = [
    { value: 'all', label: i18n.language === 'zh' ? '所有平台' : 'All Platforms' },
    {
      value: 'claude-code',
      label: 'Claude Code',
      icon: <Terminal size={14} />
    },
    {
      value: 'cursor',
      label: 'Cursor',
      icon: <Command size={14} />
    },
    {
      value: 'windsurf',
      label: 'Windsurf',
      icon: <Monitor size={14} />
    },
    {
      value: 'v0',
      label: 'v0',
      icon: <Cpu size={14} />
    },
  ];

  const sourceOptions: { value: SourceFilter; label: string; icon?: React.ReactNode }[] = [
    {
      value: 'all',
      label: i18n.language === 'zh' ? '全部来源' : 'All Sources',
      icon: <Package size={14} />
    },
    {
      value: 'featured',
      label: i18n.language === 'zh' ? '官方精选' : 'Featured',
      icon: <Sparkles size={14} className="text-amber-500" />
    },
    {
      value: 'user',
      label: i18n.language === 'zh' ? '用户仓库' : 'User Repos',
      icon: <Users size={14} />
    },
  ];

  const hasActiveFilters = securityFilter !== 'all' || compatibilityFilter !== 'all' || sourceFilter !== 'all';

  return (
    <div className={cn("bg-white dark:bg-base-100 rounded-xl border border-gray-100 dark:border-base-300 p-4 shadow-sm", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-medium">
          <Filter size={16} />
          {i18n.language === 'zh' ? '筛选' : 'Filters'}
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-primary flex items-center gap-1 transition-colors"
            title={i18n.language === 'zh' ? '重置所有筛选' : 'Reset all filters'}
            data-testid="reset-filters-button"
          >
            <X size={12} />
            {i18n.language === 'zh' ? '重置' : 'Reset'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Security Level Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {i18n.language === 'zh' ? '安全等级' : 'Security Level'}
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={i18n.language === 'zh' ? '安全等级筛选' : 'Security level filter'}>
            {securityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSecurityFilter(option.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                  securityFilter === option.value
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-slate-50 dark:bg-base-200 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-base-300"
                )}
                title={option.label}
                aria-pressed={securityFilter === option.value}
                data-testid={`security-filter-${option.value}`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Source Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {i18n.language === 'zh' ? '来源类型' : 'Source Type'}
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={i18n.language === 'zh' ? '来源类型筛选' : 'Source type filter'}>
            {sourceOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSourceFilter(option.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                  sourceFilter === option.value
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-slate-50 dark:bg-base-200 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-base-300"
                )}
                title={option.label}
                aria-pressed={sourceFilter === option.value}
                data-testid={`source-filter-${option.value}`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Compatibility Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {i18n.language === 'zh' ? '兼容性' : 'Compatibility'}
          </label>
          <div className="flex flex-wrap gap-2" role="group" aria-label={i18n.language === 'zh' ? '兼容性筛选' : 'Compatibility filter'}>
            {compatibilityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setCompatibilityFilter(option.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                  compatibilityFilter === option.value
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "bg-slate-50 dark:bg-base-200 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-base-300"
                )}
                title={option.label}
                aria-pressed={compatibilityFilter === option.value}
                data-testid={`compatibility-filter-${option.value}`}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
