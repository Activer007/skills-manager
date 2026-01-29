import { useState, useMemo, useRef, useEffect, useCallback, forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useSkills, useInstallSkill, useUninstallSkill } from '../hooks/useSkills';
import { useMarketplaceLogic } from '../hooks/useMarketplaceLogic';
import type { MarketplaceSkill, InstalledSkill } from '../types';
import { getLocalizedDescription } from '../utils/i18n';
import { SECURITY_SCORE_THRESHOLDS } from '../utils/securityHelpers';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '../store/useToastStore';
import { SkeletonCard } from '../components/SkeletonCard';
import { SkillCard } from '../components/SkillCard';
import { SlideOver } from '../components/ui/SlideOver';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Progress } from '../components/ui/Progress';
import { cn } from '../utils/cn';
import { Star, GitBranch, Github, Shield, CheckCircle, AlertTriangle, XCircle, Search } from 'lucide-react';
import { VirtuosoGrid } from 'react-virtuoso';

import { ImportSkillModal } from '../components/ImportSkillModal';
import ModalDialog from '../components/common/ModalDialog';
import { AddToCollectionModal } from '../components/AddToCollectionModal';
import { TokenConfigBanner } from '../components/TokenConfigBanner';
import { getTokenBannerStatus, setTokenBannerDismissed } from '../utils/tokenBannerStorage';

// New Components
import { MarketplaceHeader } from '../components/Marketplace/MarketplaceHeader';
import { FeaturedBanner } from '../components/Marketplace/FeaturedBanner';

const Marketplace = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  // Use custom hook for logic
  const {
    isLoadingMarketplace,
    isMarketplaceError,
    marketplaceError,
    refetchMarketplace,
    searchTerm,
    setSearchTerm,
    filter,
    setFilter,
    sortOption,
    setSortOption,
    securityFilter,
    setSecurityFilter,
    compatibilityFilter,
    setCompatibilityFilter,
    sourceFilter,
    setSourceFilter,
    isGithubUrl,
    filteredAndSortedSkills,
    marketplaceSkills
  } = useMarketplaceLogic();

  const { data: installedSkills = [] } = useSkills();
  const installMutation = useInstallSkill();
  const uninstallMutation = useUninstallSkill();

  const [selectedSkill, setSelectedSkill] = useState<MarketplaceSkill | null>(null);
  const [skillAddToCollection, setSkillAddToCollection] = useState<MarketplaceSkill | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingInstall, setPendingInstall] = useState<MarketplaceSkill | null>(null);
  const [pendingUninstall, setPendingUninstall] = useState<InstalledSkill | null>(null);
  const installTimerRef = useRef<number | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showTokenBanner, setShowTokenBanner] = useState(false);

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

  // Token Config Banner
  useEffect(() => {
    const status = getTokenBannerStatus();
    setShowTokenBanner(status === 'show');
  }, []);

  const handleDismissBanner = useCallback((type: 'never' | 'later') => {
    setTokenBannerDismissed(type);
    setShowTokenBanner(false);
  }, []);

  const handleInstall = useCallback(async (skill: MarketplaceSkill) => {
    if (installMutation.isPending) return;
    setPendingInstall(skill);
    return Promise.resolve();
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

  const handleUninstall = useCallback(async (skill: MarketplaceSkill) => {
    if (uninstallMutation.isPending) return;
    const installed = resolveInstalledSkill(skill);
    if (!installed) {
      toast.error(i18n.language === 'zh' ? '未找到已安装的 Skill' : 'Installed skill not found');
      return Promise.resolve();
    }
    setPendingUninstall(installed);
    return Promise.resolve();
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

  const selectedInstalled = useMemo(() => {
    if (!selectedSkill) return null;
    return resolveInstalledSkill(selectedSkill);
  }, [selectedSkill, resolveInstalledSkill]);

  // Determine if we should show the Featured Banner
  // Only show on "All" filter and "All" source (Discovery mode)
  // Or explicitly when sourceFilter is 'official' or 'featured' (but might want different logic there)
  const showFeaturedBanner = useMemo(() => {
     return filter === 'all' && sourceFilter === 'all' && searchTerm === '';
  }, [filter, sourceFilter, searchTerm]);

  return (
    <div className="flex h-full overflow-hidden bg-base-100">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <MarketplaceHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onImportClick={() => setShowImportModal(true)}
          isGithubUrl={isGithubUrl}
          sortOption={sortOption}
          onSortChange={setSortOption}
        />

        {/* Token Banner */}
        {showTokenBanner && (
          <div className="px-6 py-2">
            <TokenConfigBanner onDismiss={handleDismissBanner} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 bg-slate-50 dark:bg-base-200/50">
          {isLoadingMarketplace ? (
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
               <SkeletonCard count={8} />
             </div>
          ) : isMarketplaceError ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
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
          ) : filteredAndSortedSkills.length === 0 ? (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                variant="minimal"
                icon={<Search />}
                title={i18n.language === 'zh' ? '未找到相关 Skill' : 'No skills found'}
                description={
                  marketplaceSkills.length === 0
                    ? (i18n.language === 'zh'
                        ? 'Marketplace 数据库为空。请先导入数据，或直接导入 GitHub 仓库。'
                        : 'Marketplace database is empty. Please import data first, or import directly from GitHub.')
                    : (i18n.language === 'zh'
                        ? '尝试使用不同的关键词，或者直接导入 GitHub 仓库。'
                        : 'Try searching with different keywords, or import directly from GitHub.')
                }
                action={
                  marketplaceSkills.length === 0
                    ? {
                        label: i18n.language === 'zh' ? '导入数据' : 'Import Data',
                        onClick: () => navigate('/marketplace/data-management'),
                        variant: 'primary',
                      }
                    : {
                        label: i18n.language === 'zh' ? '从 GitHub 导入' : 'Import from GitHub',
                        onClick: () => setShowImportModal(true),
                        variant: 'primary',
                      }
                }
              />
            </div>
          ) : (
             <VirtuosoGrid
                style={{ height: '100%' }}
                totalCount={filteredAndSortedSkills.length}
                components={{
                    Header: () => (
                        <div className="pb-6">
                           {showFeaturedBanner && <FeaturedBanner />}
                        </div>
                    ),
                    List: forwardRef(({ style, children, ...props }, ref) => (
                        <div
                          ref={ref}
                          {...props}
                          style={style}
                          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6"
                        >
                          {children}
                        </div>
                    )),
                    Item: ({ children, ...props }) => (
                        <div {...props} className="min-w-0">
                            {children}
                        </div>
                    )
                }}
                itemContent={(index) => {
                    const skill = filteredAndSortedSkills[index];
                    return (
                        <SkillCard
                            skill={{...skill, description: getLocalizedDescription(skill, i18n.language)}}
                            viewMode="grid"
                            isInstalled={isMarketplaceSkillInstalled(skill)}
                            onInstall={async () => handleInstall(skill)}
                            onUninstall={isMarketplaceSkillInstalled(skill) ? async () => handleUninstall(skill) : undefined}
                            onViewDetails={() => {
                                setSelectedSkill(skill);
                                setShowDrawer(true);
                            }}
                            onAddToCollection={() => setSkillAddToCollection(skill)}
                        />
                    );
                }}
             />
          )}
        </div>
      </div>

      {/* Drawer and Modals */}
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

                {/* Security Score Display */}
                {selectedSkill.securityScore !== undefined && (
                    <div className="p-4 bg-slate-50 dark:bg-base-200 rounded-xl border border-gray-100 dark:border-base-300">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Shield size={18} className="text-blue-500" />
                                {i18n.language === 'zh' ? '安全评分' : 'Security Score'}
                            </h4>
                            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                {selectedSkill.securityScore}
                            </div>
                        </div>
                        {selectedSkill.securityScore >= SECURITY_SCORE_THRESHOLDS.SAFE ? (
                            <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                                <CheckCircle size={14} />
                                {i18n.language === 'zh' ? '安全' : 'Safe'}
                            </div>
                        ) : selectedSkill.securityScore >= SECURITY_SCORE_THRESHOLDS.WARNING ? (
                            <div className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                <AlertTriangle size={14} />
                                {i18n.language === 'zh' ? '需注意' : 'Caution'}
                            </div>
                        ) : (
                            <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                <XCircle size={14} />
                                {i18n.language === 'zh' ? '有风险' : 'Risky'}
                            </div>
                        )}
                        {selectedSkill.securityIssues && selectedSkill.securityIssues.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="text-xs text-slate-500 mb-1">
                                    {i18n.language === 'zh' ? '发现安全问题' : 'Security Issues'} ({selectedSkill.securityIssues.length})
                                </div>
                                <div className="space-y-1">
                                    {selectedSkill.securityIssues.slice(0, 3).map((issue, index) => (
                                        <div key={index} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                                            <span className={cn(
                                                "font-medium",
                                                issue.severity === 'Critical' && "text-red-600 dark:text-red-400",
                                                issue.severity === 'Error' && "text-red-500 dark:text-red-400",
                                                issue.severity === 'Warning' && "text-yellow-600 dark:text-yellow-400",
                                                issue.severity === 'Info' && "text-blue-600 dark:text-blue-400"
                                            )}>
                                                [{issue.severity}]
                                            </span>
                                            <span className="flex-1">{issue.description}</span>
                                        </div>
                                    ))}
                                    {selectedSkill.securityIssues.length > 3 && (
                                        <div className="text-xs text-slate-500">
                                            +{selectedSkill.securityIssues.length - 3} {i18n.language === 'zh' ? '更多' : 'more'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

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

      {skillAddToCollection && (
        <AddToCollectionModal
          isOpen={!!skillAddToCollection}
          onClose={() => setSkillAddToCollection(null)}
          skill={skillAddToCollection}
        />
      )}
    </div>
  );
};

export default Marketplace;
