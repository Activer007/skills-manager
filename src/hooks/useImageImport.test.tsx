import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useImageImport } from './useImageImport';
import type { SkillImportInfo } from '../types/share';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock toast
vi.mock('../store/useToastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock qrCodeImporter
vi.mock('../utils/qrCodeImporter', () => ({
  importSkillFromImage: vi.fn(),
}));

const { importSkillFromImage } = await import('../utils/qrCodeImporter');

describe('useImageImport', () => {
  let queryClient: QueryClient;

  const mockSkillInfo: SkillImportInfo = {
    skillId: 'test-skill-123',
    skillName: 'Test Skill',
    sourceUrl: 'https://github.com/test/skill',
    installUrl: 'https://github.com/test/skill',
    description: 'A test skill for import',
  };

  const mockImageFile = new File([''], 'test.png', { type: 'image/png' });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
        queries: {
          retry: false,
        },
      },
    });

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('handleImage', () => {
    it('should successfully parse image and extract skill info', async () => {
      const mockResult = {
        success: true,
        skillInfo: mockSkillInfo,
        previewUrl: 'blob:test-preview',
      };

      vi.mocked(importSkillFromImage).mockResolvedValue(mockResult as any);

      const { result } = renderHook(() => useImageImport(), { wrapper });

      await act(async () => {
        await result.current.handleImage(mockImageFile, 'zh');
      });

      expect(result.current.skillInfo).toEqual(mockSkillInfo);
      expect(result.current.previewUrl).toBe('blob:test-preview');
      expect(result.current.error).toBeNull();
      expect(importSkillFromImage).toHaveBeenCalledWith(mockImageFile, 'zh');
    });

    it('should handle parsing errors', async () => {
      const mockResult = {
        success: false,
        previewUrl: 'blob:test-preview',
        error: 'no_qrcode_found' as const,
        errorMessage: '未在图片中识别到二维码',
      };

      vi.mocked(importSkillFromImage).mockResolvedValue(mockResult as any);

      const onError = vi.fn();
      const { result } = renderHook(() => useImageImport({ onError }), { wrapper });

      await act(async () => {
        await result.current.handleImage(mockImageFile, 'zh');
      });

      expect(result.current.skillInfo).toBeNull();
      expect(result.current.error).toEqual({
        type: 'no_qrcode_found',
        message: '未在图片中识别到二维码',
      });
      expect(onError).toHaveBeenCalledWith('no_qrcode_found', '未在图片中识别到二维码');
    });
  });

  describe('confirmImport', () => {
    it('should successfully import skill and refresh queries', async () => {
      const mockResult = {
        success: true,
        skillInfo: mockSkillInfo,
        previewUrl: 'blob:test-preview',
      };

      vi.mocked(importSkillFromImage).mockResolvedValue(mockResult as any);
      vi.mocked(invoke).mockResolvedValue(undefined);

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useImageImport({ onSuccess }), { wrapper });

      // Set skill info
      await act(async () => {
        await result.current.handleImage(mockImageFile, 'zh');
      });

      // Confirm import
      await act(async () => {
        await result.current.confirmImport();
      });

      expect(invoke).toHaveBeenCalledWith('import_github_skill', {
        request: {
          repoUrl: 'https://github.com/test/skill',
          skipSecurityCheck: false,
        },
      });
      expect(onSuccess).toHaveBeenCalledWith(mockSkillInfo);
    });

    it('should handle import errors', async () => {
      const mockResult = {
        success: true,
        skillInfo: mockSkillInfo,
        previewUrl: 'blob:test-preview',
      };

      vi.mocked(importSkillFromImage).mockResolvedValue(mockResult as any);
      vi.mocked(invoke).mockRejectedValue(new Error('Network error'));

      const onError = vi.fn();
      const { result } = renderHook(() => useImageImport({ onError }), { wrapper });

      // Set skill info
      await act(async () => {
        await result.current.handleImage(mockImageFile, 'zh');
      });

      // Confirm import
      await act(async () => {
        await result.current.confirmImport();
      });

      expect(result.current.error).toEqual({
        type: 'import_failed',
        message: 'Network error',
      });
      expect(onError).toHaveBeenCalledWith('import_failed', 'Network error');
    });

    it('should not import when skillInfo is null', async () => {
      const { result } = renderHook(() => useImageImport(), { wrapper });

      await act(async () => {
        await result.current.confirmImport();
      });

      expect(invoke).not.toHaveBeenCalled();
    });

    it('should use installUrl as fallback when sourceUrl is missing', async () => {
      const skillInfoWithoutSource: SkillImportInfo = {
        skillId: 'test-skill-456',
        skillName: 'Test Skill',
        installUrl: 'https://github.com/test/skill',
        description: 'A test skill',
      };

      const mockResult = {
        success: true,
        skillInfo: skillInfoWithoutSource,
        previewUrl: 'blob:test-preview',
      };

      vi.mocked(importSkillFromImage).mockResolvedValue(mockResult as any);
      vi.mocked(invoke).mockResolvedValue(undefined);

      const { result } = renderHook(() => useImageImport(), { wrapper });

      // Set skill info
      await act(async () => {
        await result.current.handleImage(mockImageFile, 'zh');
      });

      // Confirm import
      await act(async () => {
        await result.current.confirmImport();
      });

      expect(invoke).toHaveBeenCalledWith('import_github_skill', {
        request: {
          repoUrl: 'https://github.com/test/skill',
          skipSecurityCheck: false,
        },
      });
    });
  });

  describe('cleanup', () => {
    it('should revoke object URL and reset state', async () => {
      const mockResult = {
        success: true,
        skillInfo: mockSkillInfo,
        previewUrl: 'blob:test-preview',
      };

      vi.mocked(importSkillFromImage).mockResolvedValue(mockResult as any);

      const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');

      const { result } = renderHook(() => useImageImport(), { wrapper });

      await act(async () => {
        await result.current.handleImage(mockImageFile, 'zh');
      });

      expect(result.current.previewUrl).toBe('blob:test-preview');

      act(() => {
        result.current.cleanup();
      });

      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:test-preview');
      expect(result.current.previewUrl).toBeNull();
      expect(result.current.skillInfo).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('isPending', () => {
    it('should be true during parsing', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(importSkillFromImage).mockReturnValue(pendingPromise as any);

      const { result } = renderHook(() => useImageImport(), { wrapper });

      act(() => {
        result.current.handleImage(mockImageFile, 'zh');
      });

      expect(result.current.isPending).toBe(true);

      await act(async () => {
        resolvePromise!({
          success: true,
          skillInfo: mockSkillInfo,
        });
      });

      expect(result.current.isPending).toBe(false);
    });

    it('should be true during import', async () => {
      const mockResult = {
        success: true,
        skillInfo: mockSkillInfo,
        previewUrl: 'blob:test-preview',
      };

      vi.mocked(importSkillFromImage).mockResolvedValue(mockResult as any);
      vi.mocked(invoke).mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useImageImport(), { wrapper });

      // Set skill info
      await act(async () => {
        await result.current.handleImage(mockImageFile, 'zh');
      });

      act(() => {
        result.current.confirmImport();
      });

      expect(result.current.isPending).toBe(true);
    });
  });
});
