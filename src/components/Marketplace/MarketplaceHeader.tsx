import React from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Download } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { SortDropdown, type SortOption } from '../SortDropdown';

interface MarketplaceHeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onImportClick: () => void;
  isGithubUrl: boolean;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
  className?: string;
}

export const MarketplaceHeader: React.FC<MarketplaceHeaderProps> = ({
  searchTerm,
  onSearchChange,
  onImportClick,
  isGithubUrl,
  sortOption,
  onSortChange,
  className
}) => {
  const { t, i18n } = useTranslation();

  return (
    <div className={cn("sticky top-0 z-20 bg-white/80 dark:bg-base-100/80 backdrop-blur-md border-b border-gray-200 dark:border-base-300 px-6 py-4", className)}>
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder={t('searchSkills')}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-base-200 border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <SortDropdown value={sortOption} onChange={onSortChange} />

          <Button
            variant="primary"
            size="md"
            onClick={onImportClick}
            className="shadow-sm"
          >
            <Download size={18} className="mr-2" />
            {isGithubUrl
              ? (i18n.language === 'zh' ? '导入此链接' : 'Import URL')
              : (i18n.language === 'zh' ? '从 GitHub 导入' : 'Import from GitHub')}
          </Button>
        </div>
      </div>
    </div>
  );
};
