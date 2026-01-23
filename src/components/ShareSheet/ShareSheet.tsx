import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Share2, Link2, FileText, ImageIcon, Package, AlertTriangle, Code } from 'lucide-react';
import type { ShareSheetProps, SharePanelType } from '../../types/share';
import { useShare } from '../../hooks/useShare';
import { Modal } from '../ui/Modal';
import { cn } from '../../utils/cn';
import { ShareTextPanel } from './ShareTextPanel';
import { ShareImagePanel } from './ShareImagePanel';
import { SharePackagePanel } from './SharePackagePanel';
import { ShareEmbedPanel } from './ShareEmbedPanel';
import { PublishWizard } from '../PublishWizard';
import { Globe } from 'lucide-react';

/**
 * 统一分享入口组件 (ShareSheet)
 * 整合文本分享、图片分享、包导出等功能
 */
export const ShareSheet: React.FC<ShareSheetProps> = ({
  skill,
  isOpen,
  onClose,
  initialPanel = 'link',
}) => {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const [activePanel, setActivePanel] = useState<SharePanelType>(initialPanel);
  const [showPublishWizard, setShowPublishWizard] = useState(false);

  const {
    shareLink,
    isModified,
    copyLink,
    linkCopied,
    cleanup,
  } = useShare(skill, locale);

  // 重置面板状态
  useEffect(() => {
    if (isOpen) {
      setActivePanel(initialPanel);
      setShowPublishWizard(false);
    } else {
      cleanup();
    }
  }, [isOpen, initialPanel, cleanup]);

  if (showPublishWizard) {
    return (
      <PublishWizard
        isOpen={true}
        onClose={() => {
          setShowPublishWizard(false);
          // Optional: close the entire share sheet when wizard closes
          // onClose();
        }}
        skill={skill}
      />
    );
  }

  const normalizedStatus =
    skill.status === 'unsafe' ? 'risk' : (skill.status ?? 'unknown');

  // 分享选项配置
  const shareOptions: {
    type: SharePanelType | 'publish';
    icon: React.ReactNode;
    label: string;
    description: string;
  }[] = [
    {
      type: 'link',
      icon: <Link2 className="w-5 h-5" />,
      label: locale === 'zh' ? '复制链接' : 'Copy Link',
      description: locale === 'zh' ? '快速分享安装链接' : 'Quick share install link',
    },
    {
      type: 'text',
      icon: <FileText className="w-5 h-5" />,
      label: locale === 'zh' ? '文本分享' : 'Text Share',
      description: locale === 'zh' ? '生成分享文本' : 'Generate share text',
    },
    {
      type: 'image',
      icon: <ImageIcon className="w-5 h-5" />,
      label: locale === 'zh' ? '图片分享' : 'Image Share',
      description: locale === 'zh' ? '生成精美卡片' : 'Generate share card',
    },
    {
      type: 'package',
      icon: <Package className="w-5 h-5" />,
      label: locale === 'zh' ? '导出包' : 'Export Package',
      description: locale === 'zh' ? '打包为 .zip 文件' : 'Export as .zip file',
    },
    {
      type: 'embed',
      icon: <Code className="w-5 h-5" />,
      label: locale === 'zh' ? '嵌入代码' : 'Embed Card',
      description: locale === 'zh' ? '生成嵌入代码' : 'Generate embed code',
    },
    {
      type: 'publish',
      icon: <Globe className="w-5 h-5" />,
      label: locale === 'zh' ? '发布到市场' : 'Publish',
      description: locale === 'zh' ? '提交到官方市场' : 'Submit to Marketplace',
    }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          {locale === 'zh' ? '分享 Skill' : 'Share Skill'}
        </div>
      }
      size="xl"
      data-testid="share-sheet"
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
            {locale === 'zh'
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
        <p className="text-sm text-base-content/70 line-clamp-2">{skill.description}</p>

        {/* 修改警告 */}
        {isModified === true && (
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              {locale === 'zh'
                ? '此 Skill 已在本地修改，原始链接不包含修改内容。'
                : 'This skill has local changes; the original link excludes modifications.'}
            </span>
          </div>
        )}
      </div>

      {/* 分享选项卡片 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {shareOptions.map((option) => (
          <button
            key={option.type}
            className={cn(
              'p-4 rounded-lg border-2 text-left transition-all',
              'hover:border-primary hover:bg-primary/5',
              activePanel === option.type
                ? 'border-primary bg-primary/10'
                : 'border-base-300 dark:border-base-600'
            )}
            onClick={() => {
              if (option.type === 'link') {
                copyLink();
              } else if (option.type === 'publish') {
                setShowPublishWizard(true);
              } else {
                setActivePanel(option.type as SharePanelType);
              }
            }}
            data-testid={`share-option-${option.type}`}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                'p-2 rounded-lg',
                activePanel === option.type
                  ? 'bg-primary text-primary-content'
                  : 'bg-base-300 dark:bg-base-600'
              )}>
                {option.icon}
              </div>
              <div>
                <div className="font-medium flex items-center gap-2">
                  {option.label}
                  {option.type === 'link' && linkCopied && (
                    <span className="text-xs text-success">✓</span>
                  )}
                </div>
                <div className="text-xs text-base-content/60">{option.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 分享链接快速展示 */}
      {shareLink && activePanel === 'link' && (
        <div className="bg-base-200 dark:bg-base-700 p-3 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-base-content/50" />
            <span className="text-sm text-base-content/70 truncate flex-1">
              {shareLink}
            </span>
            <button
              className={cn(
                'text-xs px-2 py-1 rounded',
                linkCopied
                  ? 'bg-success/20 text-success'
                  : 'bg-primary/20 text-primary hover:bg-primary/30'
              )}
              onClick={copyLink}
            >
              {linkCopied
                ? (locale === 'zh' ? '已复制' : 'Copied')
                : (locale === 'zh' ? '复制' : 'Copy')}
            </button>
          </div>
        </div>
      )}

      {/* 面板内容 */}
      {activePanel === 'text' && (
        <ShareTextPanel
          skill={skill}
          shareLink={shareLink}
          isModified={isModified}
          locale={locale}
        />
      )}

      {activePanel === 'image' && (
        <ShareImagePanel
          skill={skill}
          shareLink={shareLink}
          isModified={isModified}
          locale={locale}
        />
      )}

      {activePanel === 'package' && (
        <SharePackagePanel
          skill={skill}
          shareLink={shareLink}
          isModified={isModified}
          locale={locale}
        />
      )}

      {activePanel === 'embed' && (
        <ShareEmbedPanel
          skill={skill}
          shareLink={shareLink}
          locale={locale}
        />
      )}
    </Modal>
  );
};

export default ShareSheet;
