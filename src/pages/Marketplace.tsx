import { useState, useMemo, useRef, useEffect, useLayoutEffect, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkills, useMarketplaceSkills, useInstallSkill, useUninstallSkill } from '../hooks/useSkills';
import type { MarketplaceSkill, InstalledSkill } from '../types';
import { Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { getLocalizedDescription } from '../utils/i18n';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '../store/useToastStore';
import { SkeletonCard } from '../components/SkeletonCard';
import { SkillCard } from '../components/SkillCard';
import { SlideOver } from '../components/ui/SlideOver';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Progress } from '../components/ui/Progress';
import { cn } from '../utils/cn';
import { Star, GitBranch, Github, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { FixedSizeGrid as Grid } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import type { CSSProperties } from 'react';

import { ImportSkillModal } from '../components/ImportSkillModal';
import ModalDialog from '../components/common/ModalDialog';
import { SortDropdown, type SortOption } from '../components/SortDropdown';
import { FilterPanel, type SecurityFilter, type CompatibilityFilter } from '../components/FilterPanel';
import { Filter as FilterIcon } from 'lucide-react';

// 常量定义
const TOP_RATED_THRESHOLD = 50; // Stars threshold for top-rated filter
const GUTTER_SIZE = 24;
const ROW_HEIGHT = 330;
const HERO_BG_CANDIDATES = [
  '/marketplace/hero-bg.webp',
  '/marketplace/hero-bg.jpg',
  '/marketplace/hero-bg.png'
];

type FilterType = 'all' | 'top-rated' | 'productivity' | 'coding' | 'security' | 'data' | 'design';

const CATEGORY_KEYWORDS: Record<Exclude<FilterType, 'all' | 'top-rated'>, string[]> = {
    coding: ['code', 'programming', 'dev', 'git', 'react', 'typescript', 'python', 'rust', 'api', 'debug', 'test'],
    security: ['security', 'scan', 'vuln', 'auth', 'token', 'audit', 'secret', 'password'],
    productivity: ['task', 'todo', 'manage', 'organize', 'time', 'workflow', 'automate', 'note'],
    data: ['data', 'sql', 'db', 'database', 'analytics', 'json', 'csv', 'chart', 'visualization'],
    design: ['design', 'ui', 'css', 'color', 'icon', 'figma', 'theme', 'style']
};

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\/tree\/[\w.-]+(\/.*)?)?$/;

// Manual definition for react-window cell props
interface CellProps {
  columnIndex: number;
  rowIndex: number;
  style: CSSProperties;
  data: any;
}

// Cell defined outside to prevent re-creation on render
const Cell = memo(({ columnIndex, rowIndex, style, data }: CellProps) => {
    const { skills, columnCount, isInstalled, handleInstall, handleUninstall, setSelectedSkill, setShowDrawer, language } = data;
    const index = rowIndex * columnCount + columnIndex;

    if (index >= skills.length) return null;

    const skill = skills[index];

    // Adjust style to add gaps (gutter) - simplified to avoid overflow
    const left = parseFloat(style.left?.toString() || '0') + GUTTER_SIZE / 2;
    const top = parseFloat(style.top?.toString() || '0') + GUTTER_SIZE / 2;
    const width = parseFloat(style.width?.toString() || '0') - GUTTER_SIZE;
    const height = parseFloat(style.height?.toString() || '0') - GUTTER_SIZE;

    return (
        <div style={{ position: 'absolute', left, top, width, height }}>
            <SkillCard
                skill={{...skill, description: getLocalizedDescription(skill, language)}}
                viewMode="grid"
                isInstalled={isInstalled(skill)}
                onInstall={() => handleInstall(skill)}
                onUninstall={isInstalled(skill) ? () => handleUninstall(skill) : undefined}
                onViewDetails={() => {
                    setSelectedSkill(skill);
                    setShowDrawer(true);
                }}
            />
        </div>
    );
});

const Marketplace = () => {
  const { t, i18n } = useTranslation();
  const {
    data: marketplaceSkills = [],
    isLoading: isLoadingMarketplace,
    isError: isMarketplaceError,
    error: marketplaceError,
    refetch: refetchMarketplace,
  } = useMarketplaceSkills();
  const { data: installedSkills = [] } = useSkills();
  const installMutation = useInstallSkill();
  const uninstallMutation = useUninstallSkill();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('stars');
  const [securityFilter, setSecurityFilter] = useState<SecurityFilter>('all');
  const [compatibilityFilter, setCompatibilityFilter] = useState<CompatibilityFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedSkill, setSelectedSkill] = useState<MarketplaceSkill | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingInstall, setPendingInstall] = useState<MarketplaceSkill | null>(null);
  const [pendingUninstall, setPendingUninstall] = useState<InstalledSkill | null>(null);
  const [gridSize, setGridSize] = useState({ width: 0, height: 0 });
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const installTimerRef = useRef<number | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [heroBackgroundUrl, setHeroBackgroundUrl] = useState<string | null>(null);

  const formatUpdatedAt = useCallback((value?: number) => {
    if (!value) return i18n.language === 'zh' ? '未知' : 'Unknown';
    return new Date(value).toLocaleDateString(
      i18n.language === 'zh' ? 'zh-CN' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );
  }, [i18n.language]);

  useEffect(() => {
    return () => {
      if (installTimerRef.current) {
        window.clearInterval(installTimerRef.current);
        installTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadHeroBackground = async () => {
      for (const url of HERO_BG_CANDIDATES) {
        const loaded = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });

        if (cancelled) return;
        if (loaded) {
          setHeroBackgroundUrl(url);
          return;
        }
      }

      setHeroBackgroundUrl(null);
    };

    loadHeroBackground();
    return () => {
      cancelled = true;
    };
  }, []);

  const isGithubUrl = useMemo(() => {
    return GITHUB_URL_REGEX.test(searchTerm);
  }, [searchTerm]);

  const handleInstall = useCallback(async (skill: MarketplaceSkill) => {
    if (installMutation.isPending) return;
    setPendingInstall(skill);
  }, [installMutation.isPending]);

  const startInstallProgress = useCallback(() => {
    if (installTimerRef.current) {
      window.clearInterval(installTimerRef.current);
    }
    let current = 0;
    setInstallProgress(0);
    setIsInstalling(true);
    installTimerRef.current = window.setInterval(() => {
      const delta = Math.max(2, Math.round(Math.random() * 8));
      current = Math.min(current + delta, 90);
      setInstallProgress(current);
    }, 320);
  }, []);

  const stopInstallProgress = useCallback(() => {
    if (installTimerRef.current) {
      window.clearInterval(installTimerRef.current);
      installTimerRef.current = null;
    }
  }, []);

  const resolveInstalledSkill = useCallback((skill: MarketplaceSkill) => {
    return installedSkills.find(s => s.githubUrl && skill.githubUrl && s.githubUrl === skill.githubUrl)
      ?? installedSkills.find(s => s.name === skill.name)
      ?? installedSkills.find(s => s.id === skill.id)
      ?? installedSkills.find(s => s.githubUrl && (s.githubUrl.includes(skill.id) || skill.githubUrl.includes(s.id)));
  }, [installedSkills]);

  const isMarketplaceSkillInstalled = useCallback((skill: MarketplaceSkill) => {
    return !!resolveInstalledSkill(skill);
  }, [resolveInstalledSkill]);

  const handleUninstall = useCallback((skill: MarketplaceSkill) => {
    if (uninstallMutation.isPending) return;
    const installed = resolveInstalledSkill(skill);
    if (!installed) {
      toast.error(i18n.language === 'zh' ? '未找到已安装的 Skill' : 'Installed skill not found');
      return;
    }
    setPendingUninstall(installed);
  }, [resolveInstalledSkill, uninstallMutation.isPending, i18n.language]);

  const confirmInstall = async () => {
    if (!pendingInstall) return;
    try {
      startInstallProgress();
      await installMutation.mutateAsync(pendingInstall);
      setInstallProgress(100);
      toast.success(i18n.language === 'zh' ? `${pendingInstall.name} 安装成功！` : `${pendingInstall.name} installed successfully!`);
    } catch (error: unknown) {
      console.error('Installation error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(i18n.language === 'zh' ? `安装失败: ${errorMessage}` : `Installation failed: ${errorMessage}`);
    } finally {
      stopInstallProgress();
      setTimeout(() => {
        setPendingInstall(null);
        setIsInstalling(false);
        setInstallProgress(0);
      }, 300);
    }
  };

  const confirmUninstall = async () => {
    if (!pendingUninstall) return;
    try {
      await uninstallMutation.mutateAsync(pendingUninstall.localPath);
      toast.success(i18n.language === 'zh' ? `${pendingUninstall.name} 已卸载` : `${pendingUninstall.name} uninstalled`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error(i18n.language === 'zh' ? `卸载失败: ${errorMessage}` : `Uninstall failed: ${errorMessage}`);
    } finally {
      setPendingUninstall(null);
    }
  };

  const handleOpenSource = async (url: string) => {
    try {
        await invoke('open_url', { url });
    } catch (error) {
        console.error('Failed to open URL:', error);
        toast.error(i18n.language === 'zh' ? `无法打开链接: ${error}` : `Failed to open URL: ${error}`);
    }
  };

  const filteredSkills = useMemo(() => {
    return marketplaceSkills.filter(skill => {
        const name = skill.name ?? '';
        const description = skill.description ?? '';
        const author = skill.author ?? '';
        const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            author.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filter === 'top-rated') return skill.stars > TOP_RATED_THRESHOLD;

        if (filter !== 'all') {
            const keywords = CATEGORY_KEYWORDS[filter as keyof typeof CATEGORY_KEYWORDS];
            const textToCheck = `${name} ${description} ${skill.tags?.join(' ') || ''}`.toLowerCase();
            return keywords.some(k => textToCheck.includes(k));
        }

        return true;
    });
  }, [marketplaceSkills, searchTerm, filter]);

  // State for scroll indicators
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const filterChipsRef = useRef<HTMLDivElement>(null);

  // Update arrow visibility based on scroll position
  const handleScroll = () => {
      if (filterChipsRef.current) {
          setShowLeftArrow(filterChipsRef.current.scrollLeft > 0);
          setShowRightArrow(
              filterChipsRef.current.scrollWidth >
              filterChipsRef.current.clientWidth + filterChipsRef.current.scrollLeft + 1
          );
      }
  };

  // Add event listener for scroll
  useEffect(() => {
      const currentRef = filterChipsRef.current;
      if (currentRef) {
          currentRef.addEventListener('scroll', handleScroll);
          handleScroll(); // Initial check

          // Re-check on window resize
          window.addEventListener('resize', handleScroll);
      }
      return () => {
          if (currentRef) {
              currentRef.removeEventListener('scroll', handleScroll);
          }
          window.removeEventListener('resize', handleScroll);
      };
  }, []);

  // Memoize stable parts of itemData
  const baseItemData = useMemo(() => ({
      isInstalled: isMarketplaceSkillInstalled,
      handleInstall,
      handleUninstall,
      setSelectedSkill,
      setShowDrawer,
      language: i18n.language
  }), [isMarketplaceSkillInstalled, handleInstall, handleUninstall, i18n.language]); // handleInstall, setSelectedSkill, setShowDrawer are stable

  const selectedInstalled = useMemo(() => {
    if (!selectedSkill) return null;
    return resolveInstalledSkill(selectedSkill);
  }, [selectedSkill, resolveInstalledSkill]);

  useLayoutEffect(() => {
    const updateSize = () => {
      const el = gridContainerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);
      if (width && height) {
        setGridSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
      }
    };

    updateSize();
    const handleResize = () => requestAnimationFrame(updateSize);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 dark:from-primary/5 dark:to-purple-500/5 pl-8 pr-0 pb-6 pt-6">
          {heroBackgroundUrl && (
            <div
              aria-hidden="true"
              className="absolute inset-0 z-0 bg-cover bg-top opacity-40 rounded-r-2xl"
              style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
            />
          )}
          <div className="relative z-10 max-w-2xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-slate-100"
              >
                  {i18n.language === 'zh' ? '发现强大的 Skills' : 'Discover Powerful Skills'}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-lg text-slate-600 dark:text-slate-400 mb-8"
              >
                  {i18n.language === 'zh'
                    ? '通过社区构建的能力增强您的 Claude 体验。'
                    : 'Supercharge your Claude experience with community-built capabilities.'}
              </motion.p>

              {/* Search Bar inside Hero */}
              <div className="flex gap-4">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="relative max-w-lg flex-1 group"
                  >
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                      <input
                          type="text"
                          placeholder={t('searchSkills')}
                          className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-base-100 border-0 shadow-lg shadow-black/5 ring-1 ring-black/5 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
                          value={searchTerm}
                          onChange={(e) => {
                              setSearchTerm(e.target.value);
                          }}
                          data-testid="search-input"
                      />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                     <Button
                        size="lg"
                        variant="primary"
                        className="h-full rounded-xl shadow-lg shadow-primary/20"
                        onClick={() => setShowImportModal(true)}
                        data-testid="import-button"
                     >
                        <Download size={20} className="mr-2" />
                        {isGithubUrl
                            ? (i18n.language === 'zh' ? '导入此链接' : 'Import URL')
                            : (i18n.language === 'zh' ? '导入' : 'Import')}
                     </Button>
                  </motion.div>
              </div>
          </div>

          {/* Decorative Background Elements */}
          <motion.div
            animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.5, 0.3],
                rotate: [0, 90, 0]
            }}
            transition={{
                duration: 20,
                repeat: Infinity,
                ease: "linear"
            }}
            className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"
          />
          <motion.div
            animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.5, 0.3],
                x: [0, 50, 0]
            }}
            transition={{
                duration: 15,
                repeat: Infinity,
                ease: "easeInOut"
            }}
            className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"
          />
      </div>

      {/* Filter Chips with Scroll Indicators */}
      <div className="relative">
          {showLeftArrow && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-l from-white dark:from-base-100 to-transparent w-16 h-full flex items-center pointer-events-none pl-2">
                  <ChevronLeft size={20} className="text-slate-500 dark:text-slate-400" />
              </div>
          )}
          <div
              ref={filterChipsRef}
              className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide px-2"
              onScroll={handleScroll}
          >
              <Button
                variant="outline"
                size="sm"
                className={cn(
                    "flex-shrink-0 rounded-full h-9",
                    (securityFilter !== 'all' || compatibilityFilter !== 'all' || showFilters) && "border-primary text-primary bg-primary/5"
                )}
                onClick={() => setShowFilters(!showFilters)}
              >
                <FilterIcon size={16} className="mr-1" />
                {i18n.language === 'zh' ? '筛选' : 'Filters'}
                {(securityFilter !== 'all' || compatibilityFilter !== 'all') && (
                    <span className="ml-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </Button>
              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 flex-shrink-0" />
              {[
                  { id: 'all' as const, label: i18n.language === 'zh' ? '全部' : 'All Skills' },
                  { id: 'top-rated' as const, label: i18n.language === 'zh' ? '高评分' : 'Top Rated' },
                  { id: 'coding' as const, label: i18n.language === 'zh' ? '编程开发' : 'Coding' },
                  { id: 'security' as const, label: i18n.language === 'zh' ? '安全相关' : 'Security' },
                  { id: 'productivity' as const, label: i18n.language === 'zh' ? '生产力' : 'Productivity' },
                  { id: 'data' as const, label: i18n.language === 'zh' ? '数据处理' : 'Data' },
                  { id: 'design' as const, label: i18n.language === 'zh' ? '设计' : 'Design' }
              ].map((chip) => (
                  <button
                      key={chip.id}
                      onClick={() => {
                          setFilter(chip.id);
                      }}
                      className={cn(
                          "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                          filter === chip.id
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md"
                              : "bg-white dark:bg-base-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-base-100 border border-gray-100 dark:border-base-300"
                      )}
                      data-testid={`filter-${chip.id}`}
                  >
                      {chip.label}
                  </button>
              ))}
              <div className="flex-1" />

              <SortDropdown value={sortOption} onChange={setSortOption} />
          </div>
          {showRightArrow && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-white dark:from-base-100 to-transparent w-16 h-full flex items-center justify-end pointer-events-none pr-2">
                  <ChevronRight size={20} className="text-slate-500 dark:text-slate-400" />
              </div>
          )}
      </div>

      {showFilters && (
        <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-2"
        >
            <FilterPanel
                securityFilter={securityFilter}
                setSecurityFilter={setSecurityFilter}
                compatibilityFilter={compatibilityFilter}
                setCompatibilityFilter={setCompatibilityFilter}
                onReset={() => {
                    setSecurityFilter('all');
                    setCompatibilityFilter('all');
                }}
            />
        </motion.div>
      )}


      <div className="flex-1 min-h-0">
        {isLoadingMarketplace ? (
          <div className="h-full overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <SkeletonCard count={8} />
            </div>
          </div>
        ) : isMarketplaceError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="max-w-lg space-y-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {i18n.language === 'zh' ? '市场数据加载失败' : 'Failed to load marketplace data'}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {marketplaceError instanceof Error ? marketplaceError.message : String(marketplaceError)}
              </p>
              <Button variant="primary" onClick={() => refetchMarketplace()}>
                {i18n.language === 'zh' ? '重试加载' : 'Retry'}
              </Button>
            </div>
          </div>
        ) : filteredSkills.length === 0 ? (
          // Empty State Component - Using new EmptyState
          <div className="flex h-full items-center justify-center">
            <EmptyState
              variant="minimal"
              icon={<Search />}
              title={i18n.language === 'zh' ? '未找到相关 Skill' : 'No skills found'}
              description={i18n.language === 'zh'
                ? '尝试使用不同的关键词，或者直接导入 GitHub 仓库。'
                : 'Try searching with different keywords, or import directly from GitHub.'
              }
              action={{
                label: i18n.language === 'zh' ? '从 GitHub 导入' : 'Import from GitHub',
                onClick: () => setShowImportModal(true),
                variant: 'primary',
              }}
              data-testid="empty-state"
            />
          </div>
        ) : (
          <div className="w-full h-full overflow-x-hidden overflow-y-auto" ref={gridContainerRef}>
              <AutoSizer
              renderProp={({ height, width }) => {
                  const resolvedHeight = height || gridSize.height;
                  const resolvedWidth = width || gridSize.width;
                  if (!resolvedHeight || !resolvedWidth) return null;

                  const columnCount = Math.floor(resolvedWidth / (280 + GUTTER_SIZE)) || 1;
                  const columnWidth = resolvedWidth / columnCount;
                  const rowCount = Math.ceil(filteredSkills.length / columnCount);

                  return (
                      <Grid
                          columnCount={columnCount}
                          columnWidth={columnWidth}
                          height={resolvedHeight}
                          rowCount={rowCount}
                          rowHeight={ROW_HEIGHT}
                          width={resolvedWidth}
                          itemData={{
                              ...baseItemData,
                              skills: filteredSkills,
                              columnCount
                          }}
                      >
                          {Cell}
                      </Grid>
                  );
              }}
              />
          </div>
        )}
      </div>

      <SlideOver
        isOpen={showDrawer}
        onClose={() => {
            setShowDrawer(false);
            setSelectedSkill(null);
        }}
        title={selectedSkill?.name}
        description={selectedSkill?.description}
        width="lg"
        footer={
            <div className="flex justify-end gap-4">
                <Button
                    variant="ghost"
                    onClick={() => {
                        setShowDrawer(false);
                        setSelectedSkill(null);
                    }}
                >
                    {i18n.language === 'zh' ? '关闭' : 'Close'}
                </Button>
                {selectedSkill && (
                    selectedInstalled ? (
                        <Button
                            variant="ghost"
                            className="px-6 py-2 border border-error text-error hover:bg-error/10"
                            onClick={() => handleUninstall(selectedSkill)}
                            disabled={uninstallMutation.isPending}
                            isLoading={uninstallMutation.isPending}
                        >
                            {i18n.language === 'zh' ? '卸载' : 'Uninstall'}
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            onClick={() => handleInstall(selectedSkill)}
                            disabled={installMutation.isPending || isInstalling}
                            isLoading={installMutation.isPending || isInstalling}
                        >
                            {i18n.language === 'zh' ? '安装' : 'Install'}
                        </Button>
                    )
                )}
            </div>
        }
      >
        {selectedSkill && (
            <div className="space-y-6">
                {/* Hero / Header info */}
                <div className="flex items-center gap-4">
                     <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                        {selectedSkill.name.charAt(0).toUpperCase()}
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedSkill.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-2">
                            by {selectedSkill.author}
                        </p>
                     </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-50 dark:bg-base-200 rounded-xl border border-gray-100 dark:border-base-300">
                         <div className="text-slate-500 text-xs mb-1">Stars</div>
                         <div className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Star className="text-yellow-400 fill-yellow-400" size={18} />
                            {selectedSkill.stars}
                         </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-base-200 rounded-xl border border-gray-100 dark:border-base-300">
                         <div className="text-slate-500 text-xs mb-1">Forks</div>
                         <div className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <GitBranch className="text-slate-400" size={18} />
                            {selectedSkill.forks}
                         </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-base-200 rounded-xl border border-gray-100 dark:border-base-300">
                         <div className="text-slate-500 text-xs mb-1">
                           {i18n.language === 'zh' ? '更新日期' : 'Updated'}
                         </div>
                         <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                           {formatUpdatedAt(selectedSkill.updatedAt)}
                         </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-base-200 rounded-xl border border-gray-100 dark:border-base-300">
                         <div className="text-slate-500 text-xs mb-1">
                           {i18n.language === 'zh' ? '分支' : 'Branch'}
                         </div>
                         <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                           {selectedSkill.branch || (i18n.language === 'zh' ? '默认' : 'Default')}
                         </div>
                    </div>
                </div>

                {selectedSkill.tags && selectedSkill.tags.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
                          {i18n.language === 'zh' ? '标签' : 'Tags'}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedSkill.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 dark:bg-base-200 text-slate-600 dark:text-slate-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                    </div>
                )}

                {selectedSkill.previews && selectedSkill.previews.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Previews</h4>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                            {selectedSkill.previews.map((preview, index) => (
                                <div key={index} className="flex-shrink-0 w-64 h-40 rounded-lg overflow-hidden border border-gray-100 dark:border-base-300 relative group cursor-pointer">
                                    <img
                                        src={preview}
                                        alt={`Preview ${index + 1}`}
                                        loading="lazy"
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Description</h4>
                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {getLocalizedDescription(selectedSkill, i18n.language)}
                    </p>
                </div>

                <div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Links</h4>
                    <Button
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => handleOpenSource(selectedSkill.githubUrl)}
                    >
                        <Github size={18} className="mr-2" />
                        View on GitHub
                    </Button>
                </div>
            </div>
        )}
      </SlideOver>

      <ImportSkillModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        initialUrl={isGithubUrl ? searchTerm : undefined}
      />

      <ModalDialog
        isOpen={!!pendingInstall}
        title={isInstalling ? (i18n.language === 'zh' ? '正在安装' : 'Installing') : (i18n.language === 'zh' ? '安全提示' : 'Security Notice')}
        message={
          isInstalling ? (
            <div className="space-y-3 text-left text-sm text-slate-600 dark:text-slate-400">
              <p>
                {i18n.language === 'zh'
                  ? `正在安装 ${pendingInstall?.name ?? ''}，请稍候…`
                  : `Installing ${pendingInstall?.name ?? ''}, please wait…`}
              </p>
              <Progress
                value={installProgress}
                showPercentage
                size="sm"
                colorScheme="blue"
                label={i18n.language === 'zh' ? '安装进度' : 'Install progress'}
              />
              <p className="text-xs text-slate-500">
                {i18n.language === 'zh'
                  ? '进度为模拟值，完成后会自动刷新'
                  : 'Progress is simulated and will complete automatically.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-left text-sm text-slate-600 dark:text-slate-400">
              <p>
                {i18n.language === 'zh'
                  ? '当前版本已启用安全检查功能。安装前会自动扫描 Skill 内容，检测以下危险模式：'
                  : 'Security scanning is enabled. The skill will be scanned for:'}
              </p>
              <ul className="list-disc pl-4 space-y-1">
                <li>{i18n.language === 'zh' ? '破坏性操作（如 rm -rf /）' : 'Destructive operations (e.g., rm -rf /)'}</li>
                <li>{i18n.language === 'zh' ? '远程代码执行（如 curl | sh）' : 'Remote code execution (e.g., curl | sh)'}</li>
                <li>{i18n.language === 'zh' ? '命令注入（如 eval()）' : 'Command injection (e.g., eval())'}</li>
                <li>{i18n.language === 'zh' ? '数据泄露风险' : 'Data exfiltration risks'}</li>
              </ul>
              <p className="font-medium text-slate-700 dark:text-slate-300">
                {i18n.language === 'zh'
                  ? `是否继续安装 ${pendingInstall?.name ?? ''}？`
                  : `Continue installing ${pendingInstall?.name ?? ''}?`}
              </p>
            </div>
          )
        }
        confirmText={i18n.language === 'zh' ? '继续安装' : 'Continue Install'}
        cancelText={i18n.language === 'zh' ? '取消' : 'Cancel'}
        onConfirm={isInstalling ? undefined : confirmInstall}
        onCancel={isInstalling ? undefined : () => setPendingInstall(null)}
        type={isInstalling ? 'info' : 'confirm'}
        isLoading={isInstalling}
      />

      <ModalDialog
        isOpen={!!pendingUninstall}
        title={i18n.language === 'zh' ? '确认卸载' : 'Confirm Uninstall'}
        message={
          <div className="space-y-3 text-left text-sm text-slate-600 dark:text-slate-400">
            <p>
              {i18n.language === 'zh'
                ? `确定要卸载 ${pendingUninstall?.name ?? ''} 吗？`
                : `Are you sure you want to uninstall ${pendingUninstall?.name ?? ''}?`}
            </p>
            <p className="font-medium text-error">
              {i18n.language === 'zh' ? '此操作无法撤销！' : 'This action cannot be undone!'}
            </p>
          </div>
        }
        confirmText={i18n.language === 'zh' ? '卸载' : 'Uninstall'}
        cancelText={i18n.language === 'zh' ? '取消' : 'Cancel'}
        onConfirm={confirmUninstall}
        onCancel={() => setPendingUninstall(null)}
        type="confirm"
        isDestructive
        isLoading={uninstallMutation.isPending}
      />
    </div>
  );
};

export default Marketplace;
