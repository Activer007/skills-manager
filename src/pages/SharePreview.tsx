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
import type { SharePreviewStatus } from '../types/share';
import { parseShareLink } from '../utils/shareLink';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { cn } from '../utils/cn';
import { toast } from '../store/useToastStore';

/**
 * 分享预览页面
 * 展示 Skill 基本信息，提供一键安装功能
 */
const SharePreview = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const locale = i18n.language;

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
  } | null>(null);

  // 解析分享链接
  useEffect(() => {
    if (!shareId) {
      setStatus('error');
      setError(locale === 'zh' ? '无效的分享链接' : 'Invalid share link');
      return;
    }

    const parsed = parseShareLink(shareId);

    if (!parsed.valid) {
      setStatus(parsed.error?.includes('expired') ? 'expired' : 'error');
      setError(parsed.error || (locale === 'zh' ? '无法解析分享链接' : 'Failed to parse share link'));
      return;
    }

    if (parsed.data) {
      setSkillData({
        name: parsed.data.name,
        description: parsed.data.description,
        author: parsed.data.author,
        version: parsed.data.version,
        sourceUrl: parsed.data.sourceUrl,
        installUrl: parsed.data.installUrl,
        securityLevel: parsed.data.securityLevel,
        qualityScore: parsed.data.qualityScore,
        createdAt: parsed.data.createdAt,
      });
      setStatus('ready');
    }
  }, [shareId, locale]);

  // 处理安装
  const handleInstall = async () => {
    if (!skillData?.installUrl && !skillData?.sourceUrl) {
      toast.error(locale === 'zh' ? '无可用的安装链接' : 'No install URL available');
      return;
    }

    setStatus('installing');

    try {
      const installUrl = skillData.installUrl || skillData.sourceUrl;

      // 调用后端导入命令
      const result = await invoke<{ success: boolean; message?: string }>('import_github_skill', {
        skill: {
          name: skillData.name,
          description: skillData.description,
          githubUrl: installUrl,
          author: skillData.author,
        },
      });

      if (result.success) {
        setStatus('installed');
        toast.success(locale === 'zh' ? '安装成功！' : 'Installation successful!');
      } else {
        throw new Error(result.message || 'Installation failed');
      }
    } catch (err) {
      setStatus('ready');
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`${locale === 'zh' ? '安装失败' : 'Installation failed'}: ${message}`);
    }
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
              onClick={handleInstall}
              disabled={status === 'installing' || skillData?.securityLevel === 'blocked'}
            >
              {status === 'installing' ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {locale === 'zh' ? '安装中...' : 'Installing...'}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  {locale === 'zh' ? '安装 Skill' : 'Install Skill'}
                </>
              )}
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
    </div>
  );
};

export default SharePreview;
