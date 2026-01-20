import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Eye, Palette, ImageIcon, Loader2 } from 'lucide-react';
import type { InstalledSkill } from '../types';
import type { ShareCardTheme } from '../types/share';
import { generateShareCard } from '../utils/shareCardGenerator';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import { toast } from '../store/useToastStore';

interface ShareImageDialogProps {
  skill: InstalledSkill;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 分享图片对话框组件
 */
export const ShareImageDialog: React.FC<ShareImageDialogProps> = ({
  skill,
  isOpen,
  onClose,
}) => {
  const { i18n } = useTranslation();
  const [theme, setTheme] = useState<ShareCardTheme>('default');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 生成预览
  useEffect(() => {
    let isMounted = true;

    const generate = async () => {
      if (!isMounted) return;
      setIsGenerating(true);
      try {
        const blob = await generateShareCard(skill, theme);
        if (!isMounted) return;
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (error) {
        console.error('Failed to generate share card:', error);
        if (!isMounted) return;
        toast.error(
          i18n.language === 'zh' ? '生成失败' : 'Failed to generate image'
        );
      } finally {
        if (isMounted) {
          setIsGenerating(false);
        }
      }
    };

    if (isOpen) {
      generate();
    }

    return () => {
      isMounted = false;
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [isOpen, theme]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async () => {
    if (!previewUrl) return;

    try {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = `${skill.name}-share.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(
        i18n.language === 'zh' ? '图片已保存' : 'Image saved'
      );
    } catch (error) {
      console.error('Failed to download image:', error);
      toast.error(
        i18n.language === 'zh' ? '下载失败' : 'Failed to download'
      );
    }
  };

  const handleRegenerate = () => {
    // Force re-render by changing theme to same value
    setTheme((prev) => {
      // Trigger useEffect by briefly toggling
      const next = prev;
      setTimeout(() => setTheme(prev), 0);
      return next;
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          {i18n.language === 'zh' ? '分享图片' : 'Share Image'}
        </div>
      }
      size="xl"
    >
      {/* 主题选择 */}
      <div className="flex items-center gap-2 mb-4">
        <Palette className="w-4 h-4" />
        <span className="text-sm font-medium">
          {i18n.language === 'zh' ? '主题:' : 'Theme:'}
        </span>
        <div className="flex gap-2">
          {(['default', 'minimal', 'dark'] as ShareCardTheme[]).map((t) => (
            <Button
              key={t}
              size="sm"
              variant={theme === t ? 'default' : 'outline'}
              onClick={() => setTheme(t)}
            >
              {i18n.language === 'zh'
                ? (t === 'default'
                    ? '默认'
                    : t === 'minimal'
                      ? '简约'
                      : '深色')
                : t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* 预览区域 */}
      <div
        className={cn(
          'border rounded-lg p-4 bg-base-200 dark:bg-base-700',
          'flex items-center justify-center',
          'min-h-[400px]'
        )}
      >
        {isGenerating ? (
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-base-content/50">
              {i18n.language === 'zh' ? '正在生成图片...' : 'Generating image...'}
            </p>
          </div>
        ) : previewUrl ? (
          <div className="flex justify-center w-full">
            <img
              src={previewUrl}
              alt="Share Card Preview"
              className="max-w-full h-auto rounded shadow-lg"
              style={{ maxHeight: '500px' }}
            />
          </div>
        ) : null}
      </div>

      {/* 提示信息 */}
      {previewUrl && !isGenerating && (
        <div className="bg-info/10 text-info p-3 rounded-lg text-sm mt-4">
          <p className="flex items-start gap-2">
            <Eye className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              {i18n.language === 'zh'
                ? '提示：将此图片拖拽到 Skill Manager 窗口，或粘贴（Ctrl+V）即可导入 Skill'
                : 'Tip: Drag this image to Skill Manager or paste (Ctrl+V) to import the Skill'}
            </span>
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-base-300">
        <Button variant="ghost" onClick={onClose}>
          {i18n.language === 'zh' ? '关闭' : 'Close'}
        </Button>
        <Button
          variant="outline"
          onClick={handleRegenerate}
          disabled={isGenerating}
        >
          {i18n.language === 'zh' ? '重新生成' : 'Regenerate'}
        </Button>
        <Button onClick={handleDownload} disabled={!previewUrl || isGenerating}>
          <Download className="w-4 h-4 mr-2" />
          {i18n.language === 'zh' ? '下载图片' : 'Download'}
        </Button>
      </div>
    </Modal>
  );
};
