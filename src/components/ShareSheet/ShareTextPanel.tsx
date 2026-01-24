import { useState, useMemo } from 'react';
import { Copy, Check, Twitter, MessageCircle } from 'lucide-react';
import type { SharePanelProps } from '../../types/share';
import { generatePlatformShareText, copyToClipboard } from '../../utils/shareTextGenerator';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { toast } from '../../store/useToastStore';

/**
 * 文本分享面板
 */
export const ShareTextPanel: React.FC<SharePanelProps> = ({
  skill,
  isModified,
  locale,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'social'>('text');
  const [copied, setCopied] = useState(false);

  // 使用 useMemo 缓存生成的分享文本
  const shareText = useMemo(
    () => generatePlatformShareText(skill, 'generic', locale, { modified: isModified === true }),
    [skill, locale, isModified]
  );
  const twitterText = useMemo(
    () => generatePlatformShareText(skill, 'twitter', locale, { modified: isModified === true }),
    [skill, locale, isModified]
  );
  const weiboText = useMemo(
    () => generatePlatformShareText(skill, 'weibo', locale, { modified: isModified === true }),
    [skill, locale, isModified]
  );
  const markdownText = useMemo(
    () => generatePlatformShareText(skill, 'markdown', locale, { modified: isModified === true }),
    [skill, locale, isModified]
  );

  // 复制文本
  const handleCopy = async (text: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(locale === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard');
    } else {
      toast.error(locale === 'zh' ? '复制失败' : 'Copy failed');
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
    <div className="border border-base-300 dark:border-base-600 rounded-lg p-4" data-testid="share-text-panel">
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
          {locale === 'zh' ? '复制文本' : 'Copy Text'}
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
          {locale === 'zh' ? '社交媒体' : 'Social Media'}
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
              {locale === 'zh' ? '完整分享文本' : 'Full Share Text'}
            </label>
            <div className="relative">
              <pre
                className="bg-base-300 dark:bg-base-700 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono max-h-48 overflow-y-auto"
                data-testid="share-text-content"
              >
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
              {locale === 'zh' ? 'Markdown 版本' : 'Markdown Version'} ▼
            </summary>
            <div className="mt-2 relative">
              <pre className="bg-base-300 dark:bg-base-700 p-4 rounded-lg text-sm overflow-x-auto max-h-48 overflow-y-auto">
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
                {locale === 'zh' ? '发推' : 'Tweet'}
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
                  {locale === 'zh' ? '微博' : 'Weibo'}
                </span>
                <span className="text-xs text-base-content/50">
                  ({weiboText.length}/140)
                </span>
              </div>
              <Button size="sm" onClick={() => handleSocialShare('weibo')}>
                {locale === 'zh' ? '分享' : 'Share'}
              </Button>
            </div>
            <pre className="text-sm bg-base-200 dark:bg-base-800 p-3 rounded whitespace-pre-wrap">
              {weiboText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareTextPanel;
