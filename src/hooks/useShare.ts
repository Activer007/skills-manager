import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { InstalledSkill } from '../types';
import type {
  SharePlatform,
  ShareCardTheme,
  UseShareOptions,
  UseShareReturn,
  ExportResult,
  ExportStatus,
  ShareRecord,
  ShareMetadata,
} from '../types/share';
import { resolveSkillLink } from '../utils/shareLink';
import { generatePlatformShareText, copyToClipboard } from '../utils/shareTextGenerator';
import { generateShareCard } from '../utils/shareCardGenerator';
import { getQualityScore } from '../utils/skillNormalizers';
import { toast } from '../store/useToastStore';

/**
 * 统一分享功能 Hook
 * 整合链接复制、文本分享、图片生成、包导出等功能
 */
export const useShare = (
  skill: InstalledSkill,
  locale: string = 'zh',
  options: UseShareOptions = {}
): UseShareReturn => {
  const { autoCheckModified = true } = options;

  // 状态
  const [shareLink, setShareLink] = useState<string | undefined>(undefined);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [isModified, setIsModified] = useState<boolean | null>(null);
  const [isCheckingModified, setIsCheckingModified] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [textCopied, setTextCopied] = useState(false);
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  // Refs
  const cardBlobRef = useRef<Blob | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  // 生成分享链接 (调用后端)
  useEffect(() => {
    let isMounted = true;

    const createLink = async () => {
      setIsLoadingLink(true);
      try {
        const metadata: ShareMetadata = {
          name: skill.name,
          description: skill.description || '',
          version: skill.version || '1.0.0',
          author: skill.author,
          url: resolveSkillLink(skill),
          security_score: getQualityScore(skill),
          security_level: skill.status,
        };

        const result = await invoke<ShareRecord>('generate_share_link', {
          targetType: 'skill',
          targetId: skill.id,
          visibility: 'public',
          metadata: metadata,
          expiresAt: null, // Optional: set expiration if needed
        });

        if (isMounted && result.share_id) {
          // Construct the full URL
          const origin = window.location.origin;
          setShareLink(`${origin}/share/${result.share_id}`);
        }
      } catch (error) {
        console.error('Failed to generate share link:', error);
        if (isMounted) {
          toast.error(locale === 'zh' ? '生成分享链接失败' : 'Failed to generate share link');
        }
      } finally {
        if (isMounted) {
          setIsLoadingLink(false);
        }
      }
    };

    createLink();

    return () => {
      isMounted = false;
    };
  }, [skill, locale]);

  // 检测修改状态
  useEffect(() => {
    if (!autoCheckModified) return;

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

    setIsCheckingModified(true);
    invoke<string>('calculate_skill_checksum', { skillPath: skill.localPath })
      .then((checksum) => {
        if (!isMounted) return;
        setIsModified(checksum !== originChecksum);
      })
      .catch(() => {
        if (!isMounted) return;
        setIsModified(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsCheckingModified(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [skill.localPath, skill.config, autoCheckModified]);

  // 复制状态自动重置
  useEffect(() => {
    if (linkCopied) {
      const timer = setTimeout(() => setLinkCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [linkCopied]);

  useEffect(() => {
    if (textCopied) {
      const timer = setTimeout(() => setTextCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [textCopied]);

  // 复制链接
  const copyLink = useCallback(async (): Promise<boolean> => {
    if (!shareLink) {
      toast.error(locale === 'zh' ? '正在生成链接...' : 'Generating link...');
      return false;
    }

    const success = await copyToClipboard(shareLink);
    if (success) {
      setLinkCopied(true);
      toast.success(locale === 'zh' ? '链接已复制' : 'Link copied');
    } else {
      toast.error(locale === 'zh' ? '复制失败' : 'Copy failed');
    }
    return success;
  }, [shareLink, locale]);

  // 生成文本
  const generateText = useCallback(
    (platform: SharePlatform): string => {
      // Pass the generated shareLink explicitly if available
      return generatePlatformShareText(skill, platform, locale, {
        modified: isModified === true,
        shareLink: shareLink, // Ensure generator uses this link
      });
    },
    [skill, locale, isModified, shareLink]
  );

  // 复制文本
  const copyText = useCallback(
    async (text: string): Promise<boolean> => {
      const success = await copyToClipboard(text);
      if (success) {
        setTextCopied(true);
        toast.success(locale === 'zh' ? '已复制到剪贴板' : 'Copied to clipboard');
      } else {
        toast.error(locale === 'zh' ? '复制失败' : 'Copy failed');
      }
      return success;
    },
    [locale]
  );

  // 分享到社交媒体
  const shareToSocial = useCallback(
    (platform: 'twitter' | 'weibo') => {
      const text = generateText(platform);
      const url =
        platform === 'twitter'
          ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
          : `https://service.weibo.com/share/share.php?title=${encodeURIComponent(text)}`;

      window.open(url, '_blank');
    },
    [generateText]
  );

  // 生成卡片
  const generateCard = useCallback(
    async (theme: ShareCardTheme): Promise<Blob> => {
      setIsGeneratingCard(true);
      try {
        // We need to pass the shareLink to the card generator
        const blob = await generateShareCard(skill, theme, { shareLink });
        cardBlobRef.current = blob;

        // 清理旧的预览 URL
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
        }

        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setCardPreviewUrl(url);

        return blob;
      } catch (error) {
        console.error('Failed to generate share card:', error);
        toast.error(locale === 'zh' ? '生成失败' : 'Failed to generate image');
        throw error;
      } finally {
        setIsGeneratingCard(false);
      }
    },
    [skill, locale, shareLink]
  );

  // 下载卡片
  const downloadCard = useCallback(
    async (filename?: string): Promise<void> => {
      const blob = cardBlobRef.current;
      if (!blob) {
        toast.error(locale === 'zh' ? '请先生成图片' : 'Please generate image first');
        return;
      }

      try {
        const safeName = skill.name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').trim();
        const finalFilename = filename || `${safeName || 'skill'}-share.png`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = finalFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(locale === 'zh' ? '图片已保存' : 'Image saved');
      } catch (error) {
        console.error('Failed to download image:', error);
        toast.error(locale === 'zh' ? '下载失败' : 'Failed to download');
      }
    },
    [skill.name, locale]
  );

  // 导出包
  const exportPackage = useCallback(
    async (outputDir?: string): Promise<ExportResult> => {
      setExportStatus('exporting');
      setExportResult(null);

      try {
        const result = await invoke<{
          success: boolean;
          file_path?: string;
          file_name?: string;
          file_size?: number;
          error?: string;
        }>('export_skill_package', {
          skillPath: skill.localPath,
          outputDir,
        });

        const exportRes: ExportResult = {
          success: result.success,
          filePath: result.file_path,
          fileName: result.file_name,
          fileSize: result.file_size,
          error: result.error,
        };

        setExportResult(exportRes);
        setExportStatus(result.success ? 'success' : 'error');

        if (result.success) {
          toast.success(
            locale === 'zh'
              ? `已导出到 ${result.file_name}`
              : `Exported to ${result.file_name}`
          );
        } else {
          toast.error(result.error || (locale === 'zh' ? '导出失败' : 'Export failed'));
        }

        return exportRes;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const exportRes: ExportResult = {
          success: false,
          error: errorMsg,
        };

        setExportResult(exportRes);
        setExportStatus('error');
        toast.error(errorMsg);

        return exportRes;
      }
    },
    [skill.localPath, locale]
  );

  // 重置状态
  const reset = useCallback(() => {
    setLinkCopied(false);
    setTextCopied(false);
    setExportStatus('idle');
    setExportResult(null);
  }, []);

  // 清理资源
  const cleanup = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setCardPreviewUrl(null);
    cardBlobRef.current = null;
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  return {
    // 状态
    shareLink,
    isLoadingLink: false, // exposed property if needed, but not in original interface.
    isModified,
    isCheckingModified,

    // 复制链接
    copyLink,
    linkCopied,

    // 文本分享
    generateText,
    copyText,
    textCopied,
    shareToSocial,

    // 图片分享
    generateCard,
    cardPreviewUrl,
    isGeneratingCard,
    downloadCard,

    // 包导出
    exportPackage,
    exportStatus,
    exportResult,

    // 工具方法
    reset,
    cleanup,
  };
};

export default useShare;
