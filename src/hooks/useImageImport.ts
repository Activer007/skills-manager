import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '../store/useToastStore';
import type { SkillImportInfo, ImageImportError } from '../types/share';
import { importSkillFromImage } from '../utils/qrCodeImporter';

interface UseImageImportOptions {
  onSuccess?: (skillInfo: SkillImportInfo) => void;
  onError?: (error: ImageImportError, message: string) => void;
}

export const useImageImport = (options?: UseImageImportOptions) => {
  const queryClient = useQueryClient();

  // 状态
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [skillInfo, setSkillInfo] = useState<SkillImportInfo | null>(null);
  const [error, setError] = useState<{ type: ImageImportError; message: string } | null>(null);
  const [isPending, setIsPending] = useState(false);

  // 导入 Skill mutation
  const importMutation = useMutation({
    mutationFn: async (info: SkillImportInfo) => {
      // 优先使用 sourceUrl，回退到 installUrl
      const repoUrl = info.sourceUrl || info.installUrl;

      if (!repoUrl) {
        throw new Error('No URL available for import');
      }

      return await invoke('import_github_skill', {
        request: {
          repoUrl,
          skipSecurityCheck: false,
        },
      });
    },
    onSuccess: () => {
      // 刷新 Skills 列表
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-skills'] });
    },
  });

  /**
   * 处理图片文件
   */
  const handleImage = useCallback(
    async (file: File, language: 'zh' | 'en' = 'zh') => {
      setIsPending(true);
      setError(null);

      const result = await importSkillFromImage(file, language);

      if (result.success && result.skillInfo) {
        setSkillInfo(result.skillInfo);
        setPreviewUrl(result.previewUrl || null);
      } else {
        setError({
          type: result.error || 'unknown_error',
          message: result.errorMessage || 'Unknown error',
        });
        options?.onError?.(result.error || 'unknown_error', result.errorMessage || 'Unknown error');
      }

      setIsPending(false);
      return result;
    },
    [options]
  );

  /**
   * 确认导入
   */
  const confirmImport = useCallback(async () => {
    if (!skillInfo) return;

    setIsPending(true);

    try {
      await importMutation.mutateAsync(skillInfo);
      toast.success('Skill 导入成功！');
      options?.onSuccess?.(skillInfo);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入失败';
      toast.error(`导入失败：${errorMessage}`);
      setError({
        type: 'import_failed',
        message: errorMessage,
      });
      options?.onError?.('import_failed', errorMessage);
    } finally {
      setIsPending(false);
    }
  }, [skillInfo, importMutation, options]);

  /**
   * 清理资源
   */
  const cleanup = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSkillInfo(null);
    setError(null);
    setIsPending(false);
  }, [previewUrl]);

  // 组件卸载时自动清理
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  return {
    // 状态
    previewUrl,
    skillInfo,
    error,
    isPending: isPending || importMutation.isPending,
    // 方法
    handleImage,
    confirmImport,
    cleanup,
  };
};
