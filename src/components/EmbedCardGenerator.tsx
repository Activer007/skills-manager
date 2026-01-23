/**
 * 嵌入卡片生成器组件
 *
 * 用于生成和预览 Skill 的嵌入卡片代码
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { InstalledSkill } from '../types';
import type {
  EmbedCardData,
  EmbedCardOptions,
  EmbedFormat,
  EmbedTheme,
  EmbedSize,
} from '../types/embed';
import { generateEmbedCard } from '../utils/embedCardGenerator';

interface EmbedCardGeneratorProps {
  skill: InstalledSkill;
  onClose?: () => void;
}

export function EmbedCardGenerator({ skill, onClose }: EmbedCardGeneratorProps) {
  const { t } = useTranslation();

  // 嵌入卡片选项
  const [format, setFormat] = useState<EmbedFormat>('markdown');
  const [theme, setTheme] = useState<EmbedTheme>('light');
  const [size, setSize] = useState<EmbedSize>('normal');
  const [showAuthor, setShowAuthor] = useState(true);
  const [showVersion, setShowVersion] = useState(true);
  const [showSecurity, setShowSecurity] = useState(true);
  const [showRating, setShowRating] = useState(true);
  const [showInstallButton, setShowInstallButton] = useState(true);

  // 当前选中的标签页
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  // 复制状态
  const [copied, setCopied] = useState(false);

  // 准备嵌入卡片数据
  const embedData: EmbedCardData = useMemo(
    () => ({
      name: skill.name,
      description: skill.description || '',
      author: skill.author,
      version: skill.version,
      securityLevel: skill.securityLevel,
      rating: skill.qualityScore,
      tags: skill.tags || [],
      installUrl: skill.githubUrl,
      repoUrl: skill.githubUrl,
    }),
    [skill]
  );

  // 嵌入卡片选项
  const embedOptions: EmbedCardOptions = useMemo(
    () => ({
      format,
      theme,
      size,
      showAuthor,
      showVersion,
      showSecurity,
      showRating,
      showInstallButton,
    }),
    [format, theme, size, showAuthor, showVersion, showSecurity, showRating, showInstallButton]
  );

  // 生成嵌入卡片
  const embedResult = useMemo(() => {
    try {
      return generateEmbedCard(embedData, embedOptions);
    } catch (error) {
      console.error('Failed to generate embed card:', error);
      return null;
    }
  }, [embedData, embedOptions]);

  // 复制代码到剪贴板
  const handleCopy = useCallback(async () => {
    if (!embedResult) return;

    try {
      await navigator.clipboard.writeText(embedResult.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [embedResult]);

  if (!embedResult) {
    return (
      <div className="p-4 text-center text-error">
        {t('share.embedCard.generationError')}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h2 className="text-xl font-semibold">{t('share.embedCard.title')}</h2>
        {onClose && (
          <button onClick={onClose} className="btn btn-sm btn-ghost btn-circle">
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧：配置面板 */}
        <div className="w-80 border-r p-6 overflow-y-auto bg-base-200">
          <div className="space-y-6">
            {/* 格式选择 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  {t('share.embedCard.format')}
                </span>
              </label>
              <select
                className="select select-bordered"
                value={format}
                onChange={(e) => setFormat(e.target.value as EmbedFormat)}
              >
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
                <option value="bbcode">BBCode</option>
              </select>
            </div>

            {/* 主题选择 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  {t('share.embedCard.theme')}
                </span>
              </label>
              <select
                className="select select-bordered"
                value={theme}
                onChange={(e) => setTheme(e.target.value as EmbedTheme)}
              >
                <option value="light">{t('share.embedCard.themeLight')}</option>
                <option value="dark">{t('share.embedCard.themeDark')}</option>
                <option value="auto">{t('share.embedCard.themeAuto')}</option>
              </select>
            </div>

            {/* 尺寸选择 */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">
                  {t('share.embedCard.size')}
                </span>
              </label>
              <select
                className="select select-bordered"
                value={size}
                onChange={(e) => setSize(e.target.value as EmbedSize)}
              >
                <option value="compact">{t('share.embedCard.sizeCompact')}</option>
                <option value="normal">{t('share.embedCard.sizeNormal')}</option>
                <option value="full">{t('share.embedCard.sizeFull')}</option>
              </select>
            </div>

            <div className="divider">{t('share.embedCard.displayOptions')}</div>

            {/* 显示选项 */}
            <div className="space-y-3">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={showAuthor}
                  onChange={(e) => setShowAuthor(e.target.checked)}
                />
                <span className="label-text">{t('share.embedCard.showAuthor')}</span>
              </label>

              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={showVersion}
                  onChange={(e) => setShowVersion(e.target.checked)}
                />
                <span className="label-text">{t('share.embedCard.showVersion')}</span>
              </label>

              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={showSecurity}
                  onChange={(e) => setShowSecurity(e.target.checked)}
                />
                <span className="label-text">{t('share.embedCard.showSecurity')}</span>
              </label>

              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={showRating}
                  onChange={(e) => setShowRating(e.target.checked)}
                />
                <span className="label-text">{t('share.embedCard.showRating')}</span>
              </label>

              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={showInstallButton}
                  onChange={(e) => setShowInstallButton(e.target.checked)}
                />
                <span className="label-text">{t('share.embedCard.showInstallButton')}</span>
              </label>
            </div>
          </div>
        </div>

        {/* 右侧：预览和代码 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 标签页切换 */}
          <div className="tabs tabs-boxed m-4">
            <button
              className={`tab ${activeTab === 'preview' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              👀 {t('share.embedCard.preview')}
            </button>
            <button
              className={`tab ${activeTab === 'code' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('code')}
            >
              💻 {t('share.embedCard.code')}
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-auto px-6 pb-6">
            {activeTab === 'preview' ? (
              // 预览面板
              <div
                className="p-6 rounded-lg border bg-base-100"
                dangerouslySetInnerHTML={{ __html: embedResult.previewHtml }}
              />
            ) : (
              // 代码面板
              <div className="relative">
                <pre className="p-4 rounded-lg bg-base-300 overflow-x-auto">
                  <code className="text-sm">{embedResult.code}</code>
                </pre>
                <button
                  onClick={handleCopy}
                  className={`btn btn-sm absolute top-2 right-2 ${
                    copied ? 'btn-success' : 'btn-primary'
                  }`}
                >
                  {copied ? '✓ ' + t('share.embedCard.copied') : '📋 ' + t('share.embedCard.copy')}
                </button>
              </div>
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="border-t p-4 flex justify-between items-center bg-base-200">
            <div className="text-sm text-base-content/60">
              {t('share.embedCard.formatInfo', { format: format.toUpperCase() })}
            </div>
            <button onClick={handleCopy} className="btn btn-primary">
              📋 {t('share.embedCard.copyCode')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
