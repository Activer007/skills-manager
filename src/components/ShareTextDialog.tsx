import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Copy, Check, Twitter, MessageCircle, Link2, Share2 } from 'lucide-react';
import type { InstalledSkill } from '../types';
import { generatePlatformShareText, copyToClipboard } from '../utils/shareTextGenerator';
import { resolveSkillLink } from '../utils/shareLink';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { toast } from '../store/useToastStore';

interface ShareTextDialogProps {
  skill: InstalledSkill;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 分享文本对话框组件
 */
export const ShareTextDialog: React.FC<ShareTextDialogProps> = ({
  skill,
  isOpen,
  onClose,
}) => {
  const { i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'text' | 'social'>('text');
  const [copied, setCopied] = useState(false);
  const [isModified, setIsModified] = useState<boolean | null>(null);
  const shareLink = resolveSkillLink(skill);
  const normalizedStatus =
    skill.status === 'unsafe' ? 'risk' : (skill.status ?? 'unknown');

  useEffect(() => {
    let isMounted = true;
    const origin = (skill.config as Record<string, unknown> | undefined)
      ?.__origin as Record<string, unknown> | undefined;
    const originChecksum =
      typeof origin?.checksum === 'string' ? origin.checksum : undefined;

    if (!originChecksum) {
      setIsModified(null);
      return () => {
        isMounted = false;
      };
    }

    invoke<string>('calculate_skill_checksum', { skillPath: skill.localPath })
      .then((checksum) => {
        if (!isMounted) return;
        setIsModified(checksum !== originChecksum);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsModified(null);
      });

    return () => {
      isMounted = false;
    };
  }, [skill.localPath, skill.config]);

  // 使用 useMemo 缓存生成的分享文本，避免每次渲染都重新计算
  const shareText = useMemo(
    () => generatePlatformShareText(skill, 'generic', i18n.language, { modified: isModified === true }),
    [skill, i18n.language, isModified]
  );
  const twitterText = useMemo(
    () => generatePlatformShareText(skill, 'twitter', i18n.language, { modified: isModified === true }),
    [skill, i18n.language, isModified]
  );
  const weiboText = useMemo(
    () => generatePlatformShareText(skill, 'weibo', i18n.language, { modified: isModified === true }),
    [skill, i18n.language, isModified]
  );
  const markdownText = useMemo(
    () => generatePlatformShareText(skill, 'markdown', i18n.language, { modified: isModified === true }),
    [skill, i18n.language, isModified]
  );

  // 清理 setTimeout 避免内存泄漏
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (copied) {
      timeoutId = setTimeout(() => {
        setCopied(false);
      }, 2000);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [copied]);

  // 复制文本
  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      toast.success(i18n.language === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard');
    } else {
      toast.error(i18n.language === 'zh' ? '复制失败' : 'Copy failed');
    }
  };

  // 社交媒体分享
  const handleSocialShare = (platform: 'twitter' | 'weibo') => {
    const text = platform === 'twitter' ? twitterText : weiboText;
    const url =
      platform === 'twitter'
        ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
        : `https://service.weibo.com/share/share.php?title=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          {i18n.language === 'zh' ? '分享 Skill' : 'Share Skill'}
        </div>
      }
      size="xl"
      data-testid="share-text-dialog"
    >
      {/* Skill 预览 */}
      <div className="bg-base-200 dark:bg-base-300 p-4 rounded-lg mb-4">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="font-semibold text-lg">{skill.name}</h3>
          <span
            className={cn(
              'px-2 py-1 rounded text-xs font-medium',
              normalizedStatus === 'safe' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
              normalizedStatus === 'risk' && 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
              normalizedStatus === 'blocked' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
              normalizedStatus === 'unknown' && 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
            )}
          >
            {i18n.language === 'zh'
              ? (normalizedStatus === 'safe'
                  ? '安全'
                  : normalizedStatus === 'risk'
                    ? '有风险'
                    : normalizedStatus === 'blocked'
                      ? '已阻止'
                      : '未知')
              : normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)}
          </span>
        </div>
        <p className="text-sm text-base-content/70">{skill.description}</p>
        {shareLink && (
          <a
            href={shareLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1 mt-2"
          >
            <Link2 className="w-3 h-3" />
            {shareLink.length > 60
              ? shareLink.substring(0, 60) + '...'
              : shareLink}
          </a>
        )}
        {isModified === true && (
          <div className="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded">
            {i18n.language === 'zh'
              ? '此 Skill 已在本地修改，原始链接不包含修改内容。'
              : 'This skill has local changes; the original link excludes modifications.'}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-base-300 mb-4">
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors relative',
            activeTab === 'text'
              ? 'text-primary'
              : 'text-base-content/60 hover:text-base-content'
          )}
          onClick={() => setActiveTab('text')}
          data-testid="share-text-tab"
        >
          {i18n.language === 'zh' ? '复制文本' : 'Copy Text'}
          {activeTab === 'text' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors relative',
            activeTab === 'social'
              ? 'text-primary'
              : 'text-base-content/60 hover:text-base-content'
          )}
          onClick={() => setActiveTab('social')}
          data-testid="share-social-tab"
        >
          {i18n.language === 'zh' ? '社交媒体' : 'Social Media'}
          {activeTab === 'social' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'text' ? (
        <div className="space-y-4">
          {/* 完整分享文本 */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {i18n.language === 'zh' ? '完整分享文本' : 'Full Share Text'}
            </label>
            <div className="relative">
              <pre className="bg-base-300 dark:bg-base-700 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono max-h-64 overflow-y-auto" data-testid="share-text-content">
                {shareText}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(shareText)}
                data-testid="copy-text"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Markdown 版本 */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-primary select-none">
              {i18n.language === 'zh' ? 'Markdown 版本' : 'Markdown Version'} ▼
            </summary>
            <div className="mt-2 relative">
              <pre className="bg-base-300 dark:bg-base-700 p-4 rounded-lg text-sm overflow-x-auto max-h-64 overflow-y-auto">
                {markdownText}
              </pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(markdownText)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Twitter */}
          <div className="border border-base-300 dark:border-base-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Twitter className="w-5 h-5 text-blue-400" />
                <span className="font-medium">Twitter</span>
                <span className="text-xs text-base-content/50">
                  ({twitterText.length}/280)
                </span>
              </div>
              <Button size="sm" onClick={() => handleSocialShare('twitter')}>
                {i18n.language === 'zh' ? '发推' : 'Tweet'}
              </Button>
            </div>
            <pre className="text-sm bg-base-200 dark:bg-base-800 p-3 rounded whitespace-pre-wrap">
              {twitterText}
            </pre>
          </div>

          {/* 微博 */}
          <div className="border border-base-300 dark:border-base-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-red-500" />
                <span className="font-medium">
                  {i18n.language === 'zh' ? '微博' : 'Weibo'}
                </span>
                <span className="text-xs text-base-content/50">
                  ({weiboText.length}/140)
                </span>
              </div>
              <Button size="sm" onClick={() => handleSocialShare('weibo')}>
                {i18n.language === 'zh' ? '分享' : 'Share'}
              </Button>
            </div>
            <pre className="text-sm bg-base-200 dark:bg-base-800 p-3 rounded whitespace-pre-wrap">
              {weiboText}
            </pre>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-base-300">
        <Button variant="ghost" onClick={onClose}>
          {i18n.language === 'zh' ? '关闭' : 'Close'}
        </Button>
      </div>
    </Modal>
  );
};
