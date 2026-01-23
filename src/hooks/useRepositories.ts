import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

// 定义仓库类别
export type RepositoryCategory = 'official' | 'community' | 'custom';

// 定义后端返回的仓库结构
export interface Repository {
  id: string;
  url: string;
  name: string;
  description?: string;
  enabled: boolean;
  scanSubdirs: boolean; // 注意：后端是 snake_case，前端通常用 camelCase，但 Tauri 默认序列化可能保留 snake_case，需要确认
  addedAt: number;      // Unix timestamp (ms)
  lastScanned?: number; // Unix timestamp (ms)
  cachePath?: string;
  cachedCommitSha?: string;
  featured: boolean;
  category: RepositoryCategory;
}

// 对应 Rust 的 AddRepositoryRequest
export interface AddRepositoryPayload {
  url: string;
  name?: string;
  description?: string;
  scanSubdirs?: boolean;
}

// 对应 Rust 的 RepositoryResponse
export interface RepositoryResponse {
  success: boolean;
  message: string;
  repositoryId?: string;
}

// 精选仓库相关接口
export interface FeaturedRepository {
  url: string;
  name: string;
  description: Record<string, string>; // 多语言 map: { "en": "...", "zh": "..." }
  tags: string[];
  featured: boolean;
  scan_subdirs: boolean;
}

export interface FeaturedCategory {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  repositories: FeaturedRepository[];
}

export interface FeaturedRepositoriesConfig {
  version: string;
  last_updated: string;
  categories: FeaturedCategory[];
}

// --- Hooks ---

export function useRepositories() {
  return useQuery({
    queryKey: ['repositories'],
    queryFn: () => invoke<Repository[]>('get_repositories'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useRepository(id: string) {
  return useQuery({
    queryKey: ['repository', id],
    queryFn: () => invoke<Repository | null>('get_repository', { id }),
    enabled: !!id,
  });
}

export function useAddRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddRepositoryPayload) =>
      invoke<RepositoryResponse>('add_repository', { request: payload }), // 注意：后端参数名可能需要匹配
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['repositories'] });
        // 如果添加了仓库，可能也需要刷新 skills 列表，取决于业务逻辑
        // queryClient.invalidateQueries({ queryKey: ['skills'] });
      }
    },
  });
}

export function useDeleteRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => invoke<RepositoryResponse>('delete_repository', { id }),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['repositories'] });
      }
    },
  });
}

export function useToggleRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      invoke<RepositoryResponse>('toggle_repository_enabled', { id, enabled }),
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['repositories'] });
      }
    },
  });
}

// 扫描仓库通常比较耗时，可能需要处理 loading 状态
export function useScanRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (repoId: string) => invoke('scan_repository', { repoId }),
    onSuccess: () => {
      // 扫描完成后，技能列表和仓库状态（last_scanned）都会更新
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      // queryClient.invalidateQueries({ queryKey: ['skills'] }); // 假设有这个 key
    },
  });
}

export function useFeaturedRepositories() {
  return useQuery({
    queryKey: ['featured-repositories'],
    queryFn: () => invoke<FeaturedRepositoriesConfig>('get_featured_repositories'),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function useRefreshFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => invoke<FeaturedRepositoriesConfig>('refresh_featured_repositories'),
    onSuccess: (data) => {
      queryClient.setQueryData(['featured-repositories'], data);
    },
  });
}

// 获取未扫描的仓库 ID 列表
export function useUnscannedRepositories() {
  return useQuery({
    queryKey: ['unscanned-repositories'],
    queryFn: () => invoke<string[]>('get_unscanned_repositories'),
  });
}
