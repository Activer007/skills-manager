import { useState, useMemo, useRef, useEffect, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkills, useMarketplaceSkills, useInstallSkill } from '../hooks/useSkills';
import type { MarketplaceSkill } from '../types';
import { Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { getLocalizedDescription } from '../utils/i18n';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { SkeletonCard } from '../components/SkeletonCard';
import { SkillCard } from '../components/SkillCard';
import { SlideOver } from '../components/ui/SlideOver';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import { Star, GitBranch, Github, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { FixedSizeGrid as Grid } from 'react-window';
import type { GridChildComponentProps } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';

import { ImportSkillModal } from '../components/ImportSkillModal';

// 常量定义
const TOP_RATED_THRESHOLD = 50; // Stars threshold for top-rated filter
const GUTTER_SIZE = 24;
const ROW_HEIGHT = 380;

type FilterType = 'all' | 'top-rated' | 'productivity' | 'coding' | 'security' | 'data' | 'design';

const CATEGORY_KEYWORDS: Record<Exclude<FilterType, 'all' | 'top-rated'>, string[]> = {
    coding: ['code', 'programming', 'dev', 'git', 'react', 'typescript', 'python', 'rust', 'api', 'debug', 'test'],
    security: ['security', 'scan', 'vuln', 'auth', 'token', 'audit', 'secret', 'password'],
    productivity: ['task', 'todo', 'manage', 'organize', 'time', 'workflow', 'automate', 'note'],
    data: ['data', 'sql', 'db', 'database', 'analytics', 'json', 'csv', 'chart', 'visualization'],
    design: ['design', 'ui', 'css', 'color', 'icon', 'figma', 'theme', 'style']
};

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\/tree\/[\w.-]+(\/.*)?)?$/;

// Cell defined outside to prevent re-creation on render
const Cell = memo(({ columnIndex, rowIndex, style, data }: GridChildComponentProps) => {
    const { skills, columnCount, isInstalled, handleInstall, setSelectedSkill, setShowDrawer, language } = data as any;
    const index = rowIndex * columnCount + columnIndex;

    if (index >= skills.length) return null;

    const skill = skills[index];

    // Adjust style to add gaps (gutter)
    const left = parseFloat(style.left?.toString() || '0') + GUTTER_SIZE / 2;
    const top = parseFloat(style.top?.toString() || '0') + GUTTER_SIZE / 2;
    const width = parseFloat(style.width?.toString() || '0') - GUTTER_SIZE;
    const height = parseFloat(style.height?.toString() || '0') - GUTTER_SIZE;

    return (
        <div style={{ ...style, left, top, width, height }}>
            <SkillCard
                skill={{...skill, description: getLocalizedDescription(skill, language)}}
                viewMode="grid"
                isInstalled={isInstalled(skill.id)}
                onInstall={() => handleInstall(skill)}
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
  const { data: marketplaceSkills = [], isLoading: isLoadingMarketplace } = useMarketplaceSkills();
  const { data: installedSkills = [] } = useSkills();
  const installMutation = useInstallSkill();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedSkill, setSelectedSkill] = useState<MarketplaceSkill | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const isGithubUrl = useMemo(() => {
    return GITHUB_URL_REGEX.test(searchTerm);
  }, [searchTerm]);

  const handleInstall = useCallback(async (skill: MarketplaceSkill) => {
    if (installMutation.isPending) return;

    const confirmed = window.confirm(
      i18n.language === 'zh'
        ? `⚠️ 安全提示\n\n当前版本已启用安全检查功能。\n\n安装前会自动扫描 Skill 内容，检测以下危险模式：\n• 破坏性操作（如 rm -rf /）\n• 远程代码执行（如 curl | sh）\n• 命令注入（如 eval()）\n• 数据泄露风险\n\n如检测到硬触发危险代码，将阻止安装。\n\n是否继续安装 ${skill.name}？`
        : `⚠️ Security Notice\n\nSecurity scanning is enabled. The skill will be scanned for:\n• Destructive operations (e.g., rm -rf /)\n• Remote code execution (e.g., curl | sh)\n• Command injection (e.g., eval())\n• Data exfiltration risks\n\nInstallation will be blocked if critical patterns are detected.\n\nContinue installing ${skill.name}?`
    );

    if (!confirmed) return;

    try {
        await installMutation.mutateAsync(skill);
        toast.success(i18n.language === 'zh' ? `${skill.name} 安装成功！` : `${skill.name} installed successfully!`);
    } catch (error: unknown) {
        console.error('Installation error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        toast.error(i18n.language === 'zh' ? `安装失败: ${errorMessage}` : `Installation failed: ${errorMessage}`);
    }
  }, [installMutation, i18n.language]);

  const handleOpenSource = async (url: string) => {
    try {
        await invoke('open_url', { url });
    } catch (error) {
        console.error('Failed to open URL:', error);
        toast.error(i18n.language === 'zh' ? `无法打开链接: ${error}` : `Failed to open URL: ${error}`);
    }
  };

  const isInstalled = useCallback((skillId: string) => {
    // Compare by name or githubUrl as paths (ids) won't match marketplace slugs
    return installedSkills.some(s => s.id === skillId || s.name === skillId || (s.githubUrl && s.githubUrl.includes(skillId)));
  }, [installedSkills]);

  const filteredSkills = useMemo(() => {
    return marketplaceSkills.filter(skill => {
        const matchesSearch = skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            skill.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            skill.author.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filter === 'top-rated') return skill.stars > TOP_RATED_THRESHOLD;

        if (filter !== 'all') {
            const keywords = CATEGORY_KEYWORDS[filter as keyof typeof CATEGORY_KEYWORDS];
            const textToCheck = `${skill.name} ${skill.description} ${skill.tags?.join(' ') || ''}`.toLowerCase();
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
      isInstalled,
      handleInstall,
      setSelectedSkill,
      setShowDrawer,
      language: i18n.language
  }), [isInstalled, handleInstall, i18n.language]); // handleInstall, setSelectedSkill, setShowDrawer are stable

  return (
    <div className="space-y-8 h-full flex flex-col">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 dark:from-primary/5 dark:to-purple-500/5 p-8 md:p-12">
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
                  >
                      {chip.label}
                  </button>
              ))}
              <div className="flex-1" />
              <div className="text-sm text-slate-500 whitespace-nowrap hidden sm:block">
                 {filteredSkills.length} skills
              </div>
          </div>
          {showRightArrow && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-gradient-to-r from-white dark:from-base-100 to-transparent w-16 h-full flex items-center justify-end pointer-events-none pr-2">
                  <ChevronRight size={20} className="text-slate-500 dark:text-slate-400" />
              </div>
          )}
      </div>


      {isLoadingMarketplace ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <SkeletonCard count={8} />
        </div>
      ) : filteredSkills.length === 0 ? (
        // Empty State Component
        <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center"
            >
                <div className="w-24 h-24 bg-slate-100 dark:bg-base-200 rounded-full flex items-center justify-center mb-6">
                    <Search className="text-slate-300 dark:text-slate-600" size={48} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                    {i18n.language === 'zh' ? '未找到相关 Skill' : 'No skills found'}
                </h2>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto">
                    {i18n.language === 'zh'
                        ? '尝试使用不同的关键词，或者直接导入 GitHub 仓库。'
                        : 'Try searching with different keywords, or import directly from GitHub.'}
                    <br />
                    <Button
                        variant="link"
                        className="text-lg font-semibold text-primary mt-2"
                        onClick={() => setShowImportModal(true)}
                    >
                        {i18n.language === 'zh' ? '从 GitHub 导入' : 'Import from GitHub'}
                    </Button>
                </p>
            </motion.div>
        </div>
      ) : (
        <div className="flex-1 min-h-[600px] w-full">
            <AutoSizer>
                {({ height, width }: any) => {
                    if (!height || !width) return null;

                    const columnCount = Math.floor(width / (280 + GUTTER_SIZE)) || 1;
                    const columnWidth = width / columnCount;
                    const rowCount = Math.ceil(filteredSkills.length / columnCount);

                    return (
                        <Grid
                            columnCount={columnCount}
                            columnWidth={columnWidth}
                            height={height}
                            rowCount={rowCount}
                            rowHeight={ROW_HEIGHT}
                            width={width}
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
            </AutoSizer>
        </div>
      )}

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
            <div className="flex justify-end gap-2">
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
                     <Button
                        variant="primary"
                        onClick={() => handleInstall(selectedSkill)}
                        disabled={isInstalled(selectedSkill.id) || installMutation.isPending}
                        isLoading={installMutation.isPending}
                    >
                        {isInstalled(selectedSkill.id) ? (i18n.language === 'zh' ? '已安装' : 'Installed') : (i18n.language === 'zh' ? '安装' : 'Install')}
                    </Button>
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
                </div>

                {selectedSkill.previews && selectedSkill.previews.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-3">Previews</h4>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
                            {selectedSkill.previews.map((preview, index) => (
                                <div key={index} className="flex-shrink-0 w-64 h-40 rounded-lg overflow-hidden border border-gray-100 dark:border-base-300 relative group cursor-pointer">
                                    <img
                                        src={preview}
                                        alt={`Preview ${index + 1}`}
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
    </div>
  );
};

export default Marketplace;
