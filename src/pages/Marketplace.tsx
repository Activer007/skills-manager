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
import { cn } from '../utils/cn';

// 常量定义
const PAGE_SIZE = 12;
const TOP_RATED_THRESHOLD = 50; // Stars threshold for top-rated filter
const MAX_VISIBLE_PAGES = 5;

type FilterType = 'all' | 'top-rated';

const Marketplace = () => {
  const { t, i18n } = useTranslation();
  const { data: marketplaceSkills = [], isLoading: isLoadingMarketplace } = useMarketplaceSkills();
  const { data: installedSkills = [] } = useSkills();
  const installMutation = useInstallSkill();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('all');

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
              { id: 'top-rated' as const, label: i18n.language === 'zh' ? '高评分' : 'Top Rated' }
          ].map((chip) => (
              <button
                  key={chip.id}
                  onClick={() => setFilter(chip.id)}
                  className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                      filter === chip.id
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-md"
                          : "bg-white dark:bg-base-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-base-100"
                  )}
              >
                  {chip.label}
              </button>
          ))}
          <div className="flex-1" />
          <div className="text-sm text-slate-500">
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
                        onViewDetails={() => handleOpenSource(skill.githubUrl)}
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
    </div>
  );
};

export default Marketplace;