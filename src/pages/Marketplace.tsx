import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkills, useMarketplaceSkills, useInstallSkill } from '../hooks/useSkills';
import type { MarketplaceSkill } from '../types';
import { Search } from 'lucide-react';
import { getLocalizedDescription } from '../utils/i18n';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { SkeletonCard } from '../components/SkeletonCard';
import { SkillCard } from '../components/SkillCard';
import { SlideOver } from '../components/ui/SlideOver';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import { Star, GitBranch, Github } from 'lucide-react';

// 常量定义
const PAGE_SIZE = 12;
const TOP_RATED_THRESHOLD = 50; // Stars threshold for top-rated filter
const MAX_VISIBLE_PAGES = 5;

type FilterType = 'all' | 'top-rated' | 'productivity' | 'coding' | 'security' | 'data' | 'design';

const CATEGORY_KEYWORDS: Record<Exclude<FilterType, 'all' | 'top-rated'>, string[]> = {
    coding: ['code', 'programming', 'dev', 'git', 'react', 'typescript', 'python', 'rust', 'api', 'debug', 'test'],
    security: ['security', 'scan', 'vuln', 'auth', 'token', 'audit', 'secret', 'password'],
    productivity: ['task', 'todo', 'manage', 'organize', 'time', 'workflow', 'automate', 'note'],
    data: ['data', 'sql', 'db', 'database', 'analytics', 'json', 'csv', 'chart', 'visualization'],
    design: ['design', 'ui', 'css', 'color', 'icon', 'figma', 'theme', 'style']
};

const Marketplace = () => {
  const { t, i18n } = useTranslation();
  const { data: marketplaceSkills = [], isLoading: isLoadingMarketplace } = useMarketplaceSkills();
  const { data: installedSkills = [] } = useSkills();
  const installMutation = useInstallSkill();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedSkill, setSelectedSkill] = useState<MarketplaceSkill | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);

  const handleInstall = async (skill: MarketplaceSkill) => {
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
  };

  const handleOpenSource = async (url: string) => {
    try {
        await invoke('open_url', { url });
    } catch (error) {
        console.error('Failed to open URL:', error);
        toast.error(i18n.language === 'zh' ? `无法打开链接: ${error}` : `Failed to open URL: ${error}`);
    }
  };

  const isInstalled = (skillId: string) => {
    return installedSkills.some(s => s.id === skillId);
  };

  const filteredSkills = marketplaceSkills.filter(skill => {
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

  const totalPages = Math.ceil(filteredSkills.length / PAGE_SIZE);
  const currentSkills = filteredSkills.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= MAX_VISIBLE_PAGES) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, page - 2);
      let end = Math.min(totalPages, page + 2);

      if (end - start < MAX_VISIBLE_PAGES - 1) {
        if (start === 1) {
          end = Math.min(totalPages, start + MAX_VISIBLE_PAGES - 1);
        } else {
          start = Math.max(1, end - MAX_VISIBLE_PAGES + 1);
        }
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }

    return pages;
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 dark:from-primary/5 dark:to-purple-500/5 p-8 md:p-12">
          <div className="relative z-10 max-w-2xl">
              <h1 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-slate-100">
                  {i18n.language === 'zh' ? '发现强大的 Skills' : 'Discover Powerful Skills'}
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
                  {i18n.language === 'zh' 
                    ? '通过社区构建的能力增强您的 Claude 体验。' 
                    : 'Supercharge your Claude experience with community-built capabilities.'}
              </p>
              
              {/* Search Bar inside Hero */}
              <div className="relative max-w-lg group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                  <input
                      type="text"
                      placeholder={t('searchSkills')}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-base-100 border-0 shadow-lg shadow-black/5 ring-1 ring-black/5 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
                      value={searchTerm}
                      onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setPage(1);
                      }}
                  />
              </div>
          </div>
          
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl opacity-50 pointer-events-none" />
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
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
                      setPage(1);
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
          <div className="text-sm text-slate-500 whitespace-nowrap">
             {filteredSkills.length} skills
          </div>
      </div>

      {isLoadingMarketplace ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <SkeletonCard count={8} />
        </div>
      ) : (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {currentSkills.map((skill) => (
                    <SkillCard
                        key={skill.id}
                        skill={{...skill, description: getLocalizedDescription(skill, i18n.language)}}
                        viewMode="grid"
                        isInstalled={isInstalled(skill.id)}
                        onInstall={() => handleInstall(skill)}
                        onViewDetails={() => {
                            setSelectedSkill(skill);
                            setShowDrawer(true);
                        }}
                    />
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-8 pb-8">
                    <div className="flex items-center gap-2 bg-white dark:bg-base-100 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-base-200">
                        <button
                            className="btn btn-sm btn-ghost"
                            disabled={page === 1}
                            onClick={() => {
                                setPage(1);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            ««
                        </button>
                        <button
                            className="btn btn-sm btn-ghost"
                            disabled={page === 1}
                            onClick={() => {
                                setPage(p => Math.max(1, p - 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            «
                        </button>

                        {getPageNumbers().map((pageNum) => (
                            <button
                                key={pageNum}
                                className={cn(
                                    "btn btn-sm min-w-[2rem]",
                                    pageNum === page ? "btn-primary text-white" : "btn-ghost font-normal"
                                )}
                                onClick={() => {
                                    setPage(pageNum);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                            >
                                {pageNum}
                            </button>
                        ))}

                        <button
                            className="btn btn-sm btn-ghost"
                            disabled={page === totalPages}
                            onClick={() => {
                                setPage(p => Math.min(totalPages, p + 1));
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            »
                        </button>
                        <button
                            className="btn btn-sm btn-ghost"
                            disabled={page === totalPages}
                            onClick={() => {
                                setPage(totalPages);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        >
                            »»
                        </button>
                    </div>
                </div>
            )}
        </>
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
    </div>
  );
};

export default Marketplace;