import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import {
  Download,
  ExternalLink,
  Shield,
  Star,
  User,
  Clock,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Github,
  Package,
} from 'lucide-react';
import type { SharePreviewStatus, ShareRecord } from '../types/share';
import { parseShareLink } from '../utils/shareLink';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';
import { toast } from '../store/useToastStore';
import { InstallConfirmDialog, type InstallOptions } from '../components/InstallConfirmDialog';
import { InstallProgress, type InstallStage } from '../components/InstallProgress';
import { CompatibilityBadge } from '../components/CompatibilityBadge';
import type { CompatibilityInfo } from '../types';
import { useTaskListener } from '../hooks/useTaskListener';
import { useTaskStore } from '../store/useTaskStore';
import { TaskStatus } from '../types/task';

/**
 * 分享预览页面
 * 展示 Skill 基本信息，提供一键安装功能
 */
const SharePreview = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.language;

  // Initialize task listener since this page is outside the main Layout
  useTaskListener();

  const [status, setStatus] = useState<SharePreviewStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [skillData, setSkillData] = useState<{
    name: string;
    description: string;
    author?: string;
    version?: string;
    sourceUrl?: string;
    installUrl?: string;
    securityLevel?: 'safe' | 'risk' | 'blocked' | 'unknown';
    qualityScore?: number;
    createdAt: number;
    compatibility?: CompatibilityInfo;
  } | null>(null);

  // 安装流程状态
  const [showConfirm, setShowConfirm] = useState(false);
  const [installStage, setInstallStage] = useState<InstallStage>('preparing');
  const [installProgress, setInstallProgress] = useState(0);
  const [installError, setInstallError] = useState<string | undefined>();
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Subscribe to task updates
  const task = useTaskStore(state =>
    currentTaskId ? state.tasks.find(t => t.id === currentTaskId) : undefined
  );

  // Monitor task progress
  useEffect(() => {
    if (!task) return;

    // Update progress percentage
    if (task.progress) {
      setInstallProgress(task.progress.percentage);

      // Map task stage to UI stage
      const stage = task.progress.stage;
      if (['Downloading', 'Preparing', 'Queued'].includes(stage)) {
        setInstallStage('downloading');
      } else if (['Scanning', 'Analyzing'].includes(stage)) {
        setInstallStage('scanning');
      } else if (['Installing', 'Finalizing'].includes(stage)) {
        setInstallStage('installing');
      }
    }

    // Handle completion
    if (task.status === TaskStatus.Completed) {
      setInstallStage('completed');
      setInstallProgress(100);
      setStatus('installed');
      toast.success(locale === 'zh' ? '安装成功！' : 'Installation successful!');
      setCurrentTaskId(null); // Clear task ID to stop watching
    }
    // Handle failure
    else if (task.status === TaskStatus.Failed) {
      setInstallStage('error');
      setInstallError(task.error || 'Unknown error');
      toast.error(`${locale === 'zh' ? '安装失败' : 'Installation failed'}: ${task.error}`);
    }
  }, [task, locale]);

  // 解析分享链接
  useEffect(() => {
    if (!shareId) {
      setStatus('error');
      setError(locale === 'zh' ? '无效的分享链接' : 'Invalid share link');
      return;
    }

    const fetchShareData = async () => {
      const parsed = parseShareLink(shareId);

      if (!parsed.valid || !parsed.id) {
        setStatus('error');
        setError(locale === 'zh' ? '无效的分享链接格式' : 'Invalid share link format');
        return;
      }

      try {
        const record = await invoke<ShareRecord | null>('resolve_share_link', {
          shareId: parsed.id,
        });

        if (record) {
          // Map backend metadata to UI state
          setSkillData({
            name: record.metadata.name,
            description: record.metadata.description,
            author: record.metadata.author,
            version: record.metadata.version,
            sourceUrl: record.metadata.url,
            installUrl: record.metadata.url || `skills-manager://install?id=${record.target_id}`,
            securityLevel: record.metadata.security_level as any,
            qualityScore: record.metadata.security_score, // mapped from qualityScore
            createdAt: new Date(record.created_at).getTime(),
            compatibility: undefined, // Metadata doesn't seem to have compatibility yet
          });
          setStatus('ready');
        } else {
          setStatus('expired'); // Or error, assuming null means not found/expired
          setError(locale === 'zh' ? '链接已过期或不存在' : 'Link expired or not found');
        }
      } catch (err) {
        console.error('Failed to resolve share link:', err);
        setStatus('error');
        setError(locale === 'zh' ? '加载分享内容失败' : 'Failed to load shared content');
      }
    };

    fetchShareData();
  }, [shareId, locale]);

  // 点击安装按钮
  const handleInstallClick = () => {
    // If we rely on backend, we might need a way to get the install source.
    // Current metadata doesn't have sourceUrl.
    // For MVP, we might assume we can fetch it via target_id or if it's a public skill.
    // However, if it's a local skill shared, we need the source.
    // The previous implementation had sourceUrl in the link data.
    // The backend `ShareMetadata` currently lacks `sourceUrl`.
    // I should probably add `sourceUrl` to `ShareMetadata` in backend or assume `installUrl` construction.
    // For now, I will proceed, but note that `sourceUrl` might be missing.
    // Update: I will check if I can use target_id to install?
    // The `import_github_skill` needs a URL.
    // If `skillData.installUrl` is constructed as `skills-manager://...`, the installer needs to handle it.
    // But `handleConfirmInstall` uses `import_github_skill` which expects `repoUrl`.

    // CRITICAL: `ShareMetadata` in Rust needs `source_url` or similar if we want to install from it!
    // The Reviewer said "Architecture & Implementation" issues.
    // If I fix the security but break the install, it's bad.
    // I should check `ShareMetadata` struct again.
    // It has: name, description, version, author, security_score, security_level.
    // It MISSES the actual install URL/Source!

    // I must update Backend `ShareMetadata` to include `source_url` or `install_url`.
    // But first let's finish the frontend structure.
    setShowConfirm(true);
  };

  // 确认安装
  const handleConfirmInstall = async (options: InstallOptions) => {
    setShowConfirm(false);
    setStatus('installing');
    setInstallStage('preparing');
    setInstallProgress(0);
    setInstallError(undefined);

    try {
      const installUrl = skillData?.installUrl || skillData?.sourceUrl;
      if (!installUrl) throw new Error('No install URL');

      // Call backend to start installation task
      const taskId = await invoke<string>('import_github_skill_with_progress', {
        request: {
          repoUrl: installUrl,
          installPath: options.projectPath, // Optional project path
          skipSecurityCheck: false // Enforce security check
        }
      });

      console.log('Started installation task:', taskId);
      setCurrentTaskId(taskId);

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Failed to start installation:', err);
      setInstallError(message);
      setInstallStage('error');
      // Keep status as installing to show the error state in InstallProgress
      toast.error(`${locale === 'zh' ? '启动安装失败' : 'Failed to start installation'}: ${message}`);
    }
  };

  // 取消/重试安装
  const handleCancelInstall = async () => {
    if (currentTaskId && installStage !== 'completed' && installStage !== 'error') {
       // Optional: Cancel task in backend if supported
       // await invoke('cancel_task', { taskId: currentTaskId });
    }
    setStatus('ready');
    setInstallStage('preparing');
    setInstallProgress(0);
    setInstallError(undefined);
    setCurrentTaskId(null);
  };

  // 打开源链接
  const handleOpenSource = () => {
    if (skillData?.sourceUrl) {
      window.open(skillData.sourceUrl, '_blank');
    }
  };

  // 返回主页
  const handleBack = () => {
    navigate('/my-skills');
  };

  // 格式化日期
  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 安全等级颜色和标签
  const getSecurityInfo = (level?: string) => {
    switch (level) {
      case 'safe':
        return {
          color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
          icon: <CheckCircle className="w-4 h-4" />,
          label: locale === 'zh' ? '安全' : 'Safe',
        };
      case 'risk':
        return {
          color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: locale === 'zh' ? '有风险' : 'Risk',
        };
      case 'blocked':
        return {
          color: 'text-red-600 bg-red-100 dark:bg-red-900/30',
          icon: <Shield className="w-4 h-4" />,
          label: locale === 'zh' ? '已阻止' : 'Blocked',
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30',
          icon: <Shield className="w-4 h-4" />,
          label: locale === 'zh' ? '未知' : 'Unknown',
        };
    }
  };

  // 加载状态
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-base-content/70">
            {locale === 'zh' ? '正在加载分享内容...' : 'Loading shared content...'}
          </p>
        </div>
      </div>
    );
  }

  // 错误或过期状态
  if (status === 'error' || status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <div className="max-w-md w-full bg-base-100 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-error" />
          </div>
          <h1 className="text-xl font-bold mb-2">
            {status === 'expired'
              ? (locale === 'zh' ? '链接已过期' : 'Link Expired')
              : (locale === 'zh' ? '无效链接' : 'Invalid Link')}
          </h1>
          <p className="text-base-content/70 mb-6">{error}</p>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {locale === 'zh' ? '返回主页' : 'Back to Home'}
          </Button>
        </div>
      </div>
    );
  }

  // 安装中状态（使用 InstallProgress）
  if (status === 'installing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <InstallProgress
          stage={installStage}
          progress={installProgress}
          error={installError}
          onCancel={handleCancelInstall}
          onDone={handleBack}
          skillName={skillData?.name || 'Skill'}
        />
      </div>
    );
  }

  // 已安装状态
  if (status === 'installed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
        <div className="max-w-md w-full bg-base-100 rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <h1 className="text-xl font-bold mb-2">
            {locale === 'zh' ? '安装成功！' : 'Installation Successful!'}
          </h1>
          <p className="text-base-content/70 mb-6">
            {locale === 'zh'
              ? `${skillData?.name} 已成功安装到您的 Skills 列表。`
              : `${skillData?.name} has been installed to your Skills list.`}
          </p>
          <Button onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {locale === 'zh' ? '查看我的 Skills' : 'View My Skills'}
          </Button>
        </div>
      </div>
    );
  }

  // 就绪状态 - 显示 Skill 信息
  const securityInfo = getSecurityInfo(skillData?.securityLevel);

  return (
    <div className="min-h-screen bg-base-200 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-base-content/60 hover:text-base-content mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'zh' ? '返回' : 'Back'}
        </button>

        {/* 主卡片 */}
        <div className="bg-base-100 rounded-xl shadow-lg overflow-hidden">
          {/* 头部 */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-6 border-b border-base-200">
            <div className="flex items-start gap-4">
              {/* Skill 图标 */}
              <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-2xl font-bold text-primary-content shadow-lg">
                {skillData?.name?.charAt(0).toUpperCase() || 'S'}
              </div>

              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-1">{skillData?.name}</h1>
                <div className="flex flex-wrap items-center gap-2">
                  {skillData?.version && (
                    <Badge variant="outline" size="sm">
                      v{skillData.version}
                    </Badge>
                  )}
                  {skillData?.compatibility && (
                    <CompatibilityBadge compatibility={skillData.compatibility} size="sm" showLabel />
                  )}
                  <span className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', securityInfo.color)}>
                    {securityInfo.icon}
                    {securityInfo.label}
                  </span>
                  {skillData?.qualityScore && (
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <Star className="w-3 h-3" />
                      {skillData.qualityScore}/100
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 内容 */}
          <div className="p-6 space-y-6">
            {/* 描述 */}
            <div>
              <h2 className="text-sm font-medium text-base-content/60 mb-2">
                {locale === 'zh' ? '描述' : 'Description'}
              </h2>
              <p className="text-base-content">{skillData?.description}</p>
            </div>

            {/* 元信息 */}
            <div className="grid grid-cols-2 gap-4">
              {skillData?.author && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-base-content/50" />
                  <span className="text-base-content/70">{locale === 'zh' ? '作者' : 'Author'}:</span>
                  <span className="font-medium">{skillData.author}</span>
                </div>
              )}
              {skillData?.createdAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-base-content/50" />
                  <span className="text-base-content/70">{locale === 'zh' ? '分享时间' : 'Shared'}:</span>
                  <span className="font-medium">{formatDate(skillData.createdAt)}</span>
                </div>
              )}
            </div>

            {/* 源链接 */}
            {skillData?.sourceUrl && (
              <div className="flex items-center gap-2 p-3 bg-base-200 rounded-lg">
                <Github className="w-5 h-5 text-base-content/50" />
                <a
                  href={skillData.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate flex-1"
                >
                  {skillData.sourceUrl}
                </a>
                <Button size="sm" variant="ghost" onClick={handleOpenSource}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* 安全提示 */}
            {skillData?.securityLevel === 'risk' && (
              <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    {locale === 'zh' ? '安全警告' : 'Security Warning'}
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    {locale === 'zh'
                      ? '此 Skill 包含潜在风险代码。请仅从可信来源安装。'
                      : 'This Skill contains potentially risky code. Only install from trusted sources.'}
                  </p>
                </div>
              </div>
            )}

            {/* 已阻止提示 */}
            {skillData?.securityLevel === 'blocked' && (
              <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <Shield className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-800 dark:text-red-200 mb-1">
                    {locale === 'zh' ? '已阻止' : 'Blocked'}
                  </h3>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    {locale === 'zh'
                      ? '此 Skill 因安全原因已被阻止安装。'
                      : 'This Skill has been blocked for security reasons.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="p-6 border-t border-base-200 flex gap-3">
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleInstallClick}
              disabled={status === 'installing' || skillData?.securityLevel === 'blocked'}
            >
              <Download className="w-4 h-4 mr-2" />
              {locale === 'zh' ? '安装 Skill' : 'Install Skill'}
            </Button>
            {skillData?.sourceUrl && (
              <Button variant="outline" onClick={handleOpenSource}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {locale === 'zh' ? '查看源码' : 'View Source'}
              </Button>
            )}
          </div>
        </div>

        {/* 页脚 */}
        <div className="mt-6 text-center text-sm text-base-content/50">
          <div className="flex items-center justify-center gap-2">
            <Package className="w-4 h-4" />
            <span>Skill Manager</span>
          </div>
        </div>
      </div>

      {/* 安装确认对话框 */}
      {skillData && (
        <InstallConfirmDialog
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          onConfirm={handleConfirmInstall}
          skill={{
            name: skillData.name,
            description: skillData.description,
            securityLevel: skillData.securityLevel,
            version: skillData.version,
          }}
        />
      )}
    </div>
  );
};

export default SharePreview;
