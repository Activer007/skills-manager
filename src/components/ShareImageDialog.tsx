import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
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
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [generationKey, setGenerationKey] = useState(0);
  const [isModified, setIsModified] = useState<boolean | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // 同步 ref 和 state
  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    let isMounted = true;
    const origin = (skill.config as Record<string, unknown> | undefined)
      ?.__origin as Record<string, unknown> | undefined;
    const originChecksum =
      typeof origin?.checksum === 'string' ? origin.checksum : undefined;

    if (!originChecksum || !isOpen) {
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
  }, [skill.localPath, skill.config, isOpen]);

  // 生成预览
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const generate = async () => {
      if (!isMounted) return;
      setIsGenerating(true);
      setPreviewUrl(null);
      setImageBlob(null);
      try {
        const blob = await generateShareCard(skill, theme);
        if (!isMounted) return;
        const url = URL.createObjectURL(blob);
        setImageBlob(blob);
        setPreviewUrl(url);
        previewUrlRef.current = url;
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
      // 添加小延迟确保状态已更新
      timeoutId = setTimeout(() => {
        generate();
      }, 100);
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      // 使用 ref 中最新的 URL
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [isOpen, theme, skill, i18n.language, generationKey]);  

  const handleDownload = async () => {
    if (!previewUrl && !imageBlob) return;

    try {
      const blob =
        imageBlob ??
        (previewUrl ? await fetch(previewUrl).then((res) => res.blob()) : null);
      if (!blob) return;

      const safeName = skill.name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
      const filename = `${safeName || 'skill'}-share.png`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

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
    // Clear current preview and trigger regeneration
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setImageBlob(null);
    setGenerationKey((value) => value + 1);
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
      data-testid="share-image-dialog"
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
              data-testid={`theme-${t}`}
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
        data-testid="image-preview-container"
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
              data-testid="image-preview"
            />
          </div>
        ) : null}
      </div>

      {isModified === true && (
        <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-3 rounded-lg text-sm mt-4">
          {i18n.language === 'zh'
            ? '此 Skill 已在本地修改，二维码安装链接不包含修改内容。'
            : 'This skill has local changes; the QR install link excludes modifications.'}
        </div>
      )}

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
        <Button onClick={handleDownload} disabled={!previewUrl || isGenerating} data-testid="download-image">
          <Download className="w-4 h-4 mr-2" />
          {i18n.language === 'zh' ? '下载图片' : 'Download'}
        </Button>
      </div>
    </Modal>
  );
};
