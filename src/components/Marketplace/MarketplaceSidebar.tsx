import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid,
  Shield,
  Globe,
  Star,
  Terminal,
  Zap,
  Database,
  Palette,
  Lock,
  Filter,
  CheckCircle,
  AlertTriangle,
  Github
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { Separator } from '../ui/Separator';
import { useMarketplaceContext, type FilterType, type SecurityFilter, type SourceFilter } from '../../context/MarketplaceContext';

export const MarketplaceSidebar: React.FC<{ className?: string }> = ({ className }) => {
  const { t, i18n } = useTranslation();
  const {
    filter: currentFilter,
    setFilter: onFilterChange,
    securityFilter,
    setSecurityFilter: onSecurityFilterChange,
    sourceFilter,
    setSourceFilter: onSourceFilterChange
  } = useMarketplaceContext();

  const NAV_ITEMS = [
    { id: 'all', label: i18n.language === 'zh' ? '发现' : 'Discover', icon: Globe },
    { id: 'top-rated', label: i18n.language === 'zh' ? '高评分' : 'Top Rated', icon: Star },
  ];

  const CATEGORIES = [
    { id: 'productivity', label: i18n.language === 'zh' ? '生产力' : 'Productivity', icon: Zap },
    { id: 'coding', label: i18n.language === 'zh' ? '编程开发' : 'Coding', icon: Terminal },
    { id: 'data', label: i18n.language === 'zh' ? '数据处理' : 'Data', icon: Database },
    { id: 'security', label: i18n.language === 'zh' ? '安全工具' : 'Security', icon: Lock },
    { id: 'design', label: i18n.language === 'zh' ? '设计' : 'Design', icon: Palette },
  ];

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="px-4 py-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2 mt-4">
          Marketplace
        </h2>

        {/* Main Navigation */}
        <div className="space-y-1 mb-6">
          {/* Special handling for "Official" as a pseudo-nav item that sets source filter */}
          <button
            onClick={() => {
              onSourceFilterChange('official');
              onFilterChange('all');
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
              sourceFilter === 'official'
                ? "bg-primary/10 text-primary"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-base-100"
            )}
          >
            <Shield size={18} />
            {i18n.language === 'zh' ? '官方精选' : 'Official'}
          </button>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                onSourceFilterChange('all'); // Reset source filter when clicking main nav
                onFilterChange(item.id as FilterType);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                currentFilter === item.id && sourceFilter !== 'official'
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-base-100"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        <Separator className="my-4 opacity-50" />

        {/* Categories */}
        <div className="space-y-1 mb-6">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-2">
            {i18n.language === 'zh' ? '分类' : 'Categories'}
          </h3>
          {CATEGORIES.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                 onSourceFilterChange('all');
                 onFilterChange(item.id as FilterType);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors",
                currentFilter === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-base-100"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        <Separator className="my-4 opacity-50" />

        {/* Filters */}
        <div className="space-y-6">
          {/* Security Filter */}
          <div className="px-2 space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              {i18n.language === 'zh' ? '安全等级' : 'Security Level'}
            </label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="security"
                  checked={securityFilter === 'all'}
                  onChange={() => onSecurityFilterChange('all')}
                  className="accent-primary"
                />
                {i18n.language === 'zh' ? '全部' : 'All'}
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="security"
                  checked={securityFilter === 'safe'}
                  onChange={() => onSecurityFilterChange('safe')}
                  className="accent-primary"
                />
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle size={14} />
                  {i18n.language === 'zh' ? '安全' : 'Safe'}
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="security"
                  checked={securityFilter === 'risk'}
                  onChange={() => onSecurityFilterChange('risk')}
                  className="accent-primary"
                />
                <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle size={14} />
                  {i18n.language === 'zh' ? '风险' : 'Risks'}
                </span>
              </label>
            </div>
          </div>

          {/* Source Filter */}
          <div className="px-2 space-y-2">
             <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              {i18n.language === 'zh' ? '来源' : 'Source'}
            </label>
            <div className="flex flex-col gap-2">
               <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="source"
                  checked={sourceFilter === 'all'}
                  onChange={() => onSourceFilterChange('all')}
                  className="accent-primary"
                />
                {i18n.language === 'zh' ? '全部' : 'All'}
              </label>
               <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="source"
                  checked={sourceFilter === 'official'}
                  onChange={() => onSourceFilterChange('official')}
                  className="accent-primary"
                />
                <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                  <Shield size={14} />
                  {i18n.language === 'zh' ? '官方' : 'Official'}
                </span>
              </label>
               <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="source"
                  checked={sourceFilter === 'featured'}
                  onChange={() => onSourceFilterChange('featured')}
                  className="accent-primary"
                />
                <span className="flex items-center gap-1 text-yellow-500">
                  <Star size={14} />
                  {i18n.language === 'zh' ? '精选' : 'Featured'}
                </span>
              </label>
               <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="radio"
                  name="source"
                  checked={sourceFilter === 'user'}
                  onChange={() => onSourceFilterChange('user')}
                  className="accent-primary"
                />
                <span className="flex items-center gap-1">
                  <Github size={14} />
                  {i18n.language === 'zh' ? '社区' : 'Community'}
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
