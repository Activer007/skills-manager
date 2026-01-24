import React, { useState, useMemo } from 'react';
import { Copy, Check, FileCode, Layout, MessageSquare } from 'lucide-react';
import type { InstalledSkill } from '../../types';
import type { EmbedFormat, EmbedTheme, EmbedSize, EmbedCardData, EmbedCardOptions } from '../../types/embed';
import { generateEmbedCard } from '../../utils/embedCardGenerator';
import { normalizeSecurityLevel, getQualityScore } from '../../utils/skillNormalizers';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { toast } from '../../store/useToastStore';

interface ShareEmbedPanelProps {
  skill: InstalledSkill;
  shareLink: string | undefined;
  locale: string;
}

export const ShareEmbedPanel: React.FC<ShareEmbedPanelProps> = ({
  skill,
  shareLink,
  locale
}) => {
  const [embedFormat, setEmbedFormat] = useState<EmbedFormat>('markdown');
  const [theme, setTheme] = useState<EmbedTheme>('light');
  const [size, setSize] = useState<EmbedSize>('normal');
  const [showAuthor, setShowAuthor] = useState(true);
  const [showVersion, setShowVersion] = useState(true);
  const [showSecurity, setShowSecurity] = useState(true);
  const [showRating, setShowRating] = useState(true);
  const [showInstallButton, setShowInstallButton] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  // 准备嵌入卡片数据
  const embedData: EmbedCardData = useMemo(() => {
    const normalizedLevel = normalizeSecurityLevel(skill);
    return {
      name: skill.name,
      description: skill.description || '',
      author: skill.author,
      version: skill.version,
      securityLevel: normalizedLevel === 'safe' ? 'safe' : normalizedLevel === 'blocked' ? 'danger' : 'warning',
      rating: getQualityScore(skill),
      tags: skill.tags || [],
      installUrl: shareLink,
      repoUrl: skill.githubUrl,
    };
  }, [skill, shareLink]);

  // 嵌入卡片选项
  const embedOptions: EmbedCardOptions = useMemo(() => ({
    format: embedFormat,
    theme,
    size,
    showAuthor,
    showVersion,
    showSecurity,
    showRating,
    showInstallButton,
  }), [embedFormat, theme, size, showAuthor, showVersion, showSecurity, showRating, showInstallButton]);

  // 生成嵌入卡片
  const embedResult = useMemo(() => {
    try {
      return generateEmbedCard(embedData, embedOptions);
    } catch (error) {
      console.error('Failed to generate embed card:', error);
      return null;
    }
  }, [embedData, embedOptions]);

  const handleCopy = async () => {
    if (!embedResult) return;

    try {
      await navigator.clipboard.writeText(embedResult.code);
      setCopied(true);
      toast.success(locale === 'zh' ? '代码已复制' : 'Code copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(locale === 'zh' ? '复制失败' : 'Failed to copy');
    }
  };

  const formatTabs: { id: EmbedFormat; label: string; icon: React.ReactNode }[] = [
    {
      id: 'markdown',
      label: 'Markdown',
      icon: <FileCode className="w-4 h-4" />
    },
    {
      id: 'html',
      label: 'HTML',
      icon: <Layout className="w-4 h-4" />
    },
    {
      id: 'bbcode',
      label: 'BBCode',
      icon: <MessageSquare className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-4">
      {/* 格式选择标签 */}
      <div className="flex p-1 bg-base-300 rounded-lg">
        {formatTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setEmbedFormat(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors",
              embedFormat === tab.id
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-base-content/60 hover:text-base-content"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 配置选项（紧凑版） */}
      <div className="grid grid-cols-2 gap-4">
        {/* 主题 */}
        <div className="form-control">
          <label className="label py-1">
            <span className="label-text text-xs">
              {locale === 'zh' ? '主题' : 'Theme'}
            </span>
          </label>
          <select
            className="select select-sm select-bordered"
            value={theme}
            onChange={(e) => setTheme(e.target.value as EmbedTheme)}
          >
            <option value="light">{locale === 'zh' ? '浅色' : 'Light'}</option>
            <option value="dark">{locale === 'zh' ? '深色' : 'Dark'}</option>
            <option value="auto">{locale === 'zh' ? '自动' : 'Auto'}</option>
          </select>
        </div>

        {/* 尺寸 */}
        <div className="form-control">
          <label className="label py-1">
            <span className="label-text text-xs">
              {locale === 'zh' ? '尺寸' : 'Size'}
            </span>
          </label>
          <select
            className="select select-sm select-bordered"
            value={size}
            onChange={(e) => setSize(e.target.value as EmbedSize)}
          >
            <option value="compact">{locale === 'zh' ? '紧凑' : 'Compact'}</option>
            <option value="normal">{locale === 'zh' ? '标准' : 'Normal'}</option>
            <option value="full">{locale === 'zh' ? '全宽' : 'Full'}</option>
          </select>
        </div>
      </div>

      {/* 显示选项 */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'author', label: locale === 'zh' ? '作者' : 'Author', value: showAuthor, setter: setShowAuthor },
          { key: 'version', label: locale === 'zh' ? '版本' : 'Version', value: showVersion, setter: setShowVersion },
          { key: 'security', label: locale === 'zh' ? '安全' : 'Security', value: showSecurity, setter: setShowSecurity },
          { key: 'rating', label: locale === 'zh' ? '评分' : 'Rating', value: showRating, setter: setShowRating },
          { key: 'install', label: locale === 'zh' ? '安装' : 'Install', value: showInstallButton, setter: setShowInstallButton },
        ].map((option) => (
          <label
            key={option.key}
            className="label cursor-pointer gap-2 bg-base-200 px-3 py-1.5 rounded-lg hover:bg-base-300 transition-colors"
          >
            <input
              type="checkbox"
              className="checkbox checkbox-xs checkbox-primary"
              checked={option.value}
              onChange={(e) => option.setter(e.target.checked)}
            />
            <span className="label-text text-xs">{option.label}</span>
          </label>
        ))}
      </div>

      {/* 预览/代码切换 */}
      <div className="tabs tabs-boxed">
        <button
          className={cn('tab', activeTab === 'preview' && 'tab-active')}
          onClick={() => setActiveTab('preview')}
        >
          👀 {locale === 'zh' ? '预览' : 'Preview'}
        </button>
        <button
          className={cn('tab', activeTab === 'code' && 'tab-active')}
          onClick={() => setActiveTab('code')}
        >
          💻 {locale === 'zh' ? '代码' : 'Code'}
        </button>
      </div>

      {/* 预览区域 */}
      {activeTab === 'preview' && embedResult && (
        <div
          className="p-6 border border-base-300 rounded-lg bg-base-100 min-h-[200px] overflow-auto"
          dangerouslySetInnerHTML={{ __html: embedResult.previewHtml }}
        />
      )}

      {/* 代码区域 */}
      {activeTab === 'code' && embedResult && (
        <div className="relative">
          <textarea
            readOnly
            value={embedResult.code}
            className="w-full h-40 p-3 pr-12 font-mono text-xs bg-base-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      )}

      {/* 复制按钮 */}
      <div className="flex justify-between items-center pt-2">
        <p className="text-xs text-base-content/50">
          {embedFormat === 'markdown' && (locale === 'zh' ? '适用于 GitHub README' : 'For GitHub READMEs')}
          {embedFormat === 'html' && (locale === 'zh' ? '适用于网页/博客' : 'For websites/blogs')}
          {embedFormat === 'bbcode' && (locale === 'zh' ? '适用于论坛' : 'For forums')}
        </p>
        <Button
          onClick={handleCopy}
          variant="primary"
          size="sm"
          className="gap-2"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied
            ? (locale === 'zh' ? '已复制' : 'Copied')
            : (locale === 'zh' ? '复制代码' : 'Copy Code')
          }
        </Button>
      </div>
    </div>
  );
};
