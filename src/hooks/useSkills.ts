import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { InstalledSkill, MarketplaceSkill, MarketplaceSkillDTO, ListMarketplaceParams, DeleteRepositoryResult, ApiErrorResponse, SourceFilter } from '../types';
import { fetchMarketplaceData } from '../utils/marketplace';
import type { SecurityReport } from '../types/security';

type ScanSkillEntry = {
  name: string;
  description?: string;
  path: string;
  skillType: 'system' | 'project' | string;
  isMcp?: boolean;
  tags?: string[];
  configSchema?: Record<string, unknown>;
  author?: string;
  derivedFrom?: string;
  forkType?: 'fork' | 'remix';
};

type ScanSkillsResult = {
  systemSkills: ScanSkillEntry[];
  projectSkills: ScanSkillEntry[];
};

const mapMarketplaceDto = (dto: MarketplaceSkillDTO): MarketplaceSkill => ({
  id: dto.id,
  name: dto.name,
  author: dto.author || 'Unknown',
  authorAvatar: '',
  description: dto.description || '',
  githubUrl: dto.githubUrl || '', // Corrected property access
  stars: dto.stars,
  forks: dto.forks,
  updatedAt: dto.updatedAt, // Corrected property access
  hasMarketplace: false,
  path: dto.skillPath || 'SKILL.md',
  branch: 'main',
  tags: dto.tags,
  securityScore: dto.securityScore, // Corrected property access
  compatibility: dto.compatibility,
  repositoryId: dto.repositoryId,
  repositoryName: dto.repositoryName,
  sourceType: dto.sourceType,
  priority: dto.priority,
  skillPath: dto.skillPath,
});

/**
 * Hook for fetching installed skills
 */
export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const result = await invoke<ScanSkillsResult>('scan_skills');
      const allSkillPaths = [
        ...result.systemSkills.map((skill) => skill.path),
        ...result.projectSkills.map((skill) => skill.path)
      ];

      if (allSkillPaths.length === 0) {
        return [];
      }

      const [securityReports, skillConfigs] = await Promise.all([
        invoke<SecurityReport[]>('batch_scan_skills', {
        skillPaths: allSkillPaths,
        locale: window.localStorage.getItem('i18nextLng') || 'en'
        }),
        Promise.all(
          allSkillPaths.map(async (skillPath) => {
            try {
              const config = await invoke<Record<string, unknown>>('get_skill_config', { skillId: skillPath });
              return [skillPath, config] as const;
            } catch {
              return [skillPath, {}] as const;
            }
          })
        ),
      ]);
      const securityMap = new Map(securityReports.map(report => [report.skill_id, report]));
      const configMap = new Map(skillConfigs);

      const mapSkill = (skill: ScanSkillEntry): InstalledSkill => {
        const report = securityMap.get(skill.path.split(/[\\/]/).pop() || '');
        const config = configMap.get(skill.path) ?? {};
        const enabled = typeof config.enabled === 'boolean' ? config.enabled : true;
        return {
          id: skill.path,
          name: skill.name,
          description: skill.description ?? '',
          localPath: skill.path,
          status: report ? (report.score >= 70 ? 'safe' : 'unsafe') : 'safe',
          type: skill.skillType as InstalledSkill['type'],
          installDate: Date.now(),
          version: '1.0.0',
          author: skill.author || 'Unknown',
          stars: 0,
          enabled,
          config,
          securityScore: report?.score,
          securityIssues: report?.issues,
          isMcp: skill.isMcp,
          tags: skill.tags,
          configSchema: skill.configSchema,
          derivedFrom: skill.derivedFrom,
          forkType: skill.forkType
        };
      };

      return [
        ...result.systemSkills.map(mapSkill),
        ...result.projectSkills.map(mapSkill)
      ];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Hook for importing a skill from GitHub
 */
export function useImportSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skill: MarketplaceSkill) => {
      return await invoke('import_github_skill', {
        request: {
          repoUrl: skill.githubUrl,
          skipSecurityCheck: false
        }
      });
    },
    onSuccess: () => {
      // Invalidate skills query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

/**
 * Hook for uninstalling a skill with optimistic update
 */
export function useUninstallSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skillPath: string) => {
      return await invoke('uninstall_skill', {
        request: {
          skillPath
        }
      });
    },
    onMutate: async (skillPath) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['skills'] });

      // Snapshot the previous value
      const previousSkills = queryClient.getQueryData<InstalledSkill[]>(['skills']);

      // Optimistically update to the new value
      queryClient.setQueryData<InstalledSkill[]>(['skills'], (old) =>
        old?.filter(s => s.localPath !== skillPath) ?? []
      );

      // Return a context object with the snapshotted value
      return { previousSkills };
    },
    onError: (_err, _skillPath, context) => {
      // If the mutation fails, roll back to the previous value
      if (context?.previousSkills) {
        queryClient.setQueryData(['skills'], context.previousSkills);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

/**
 * Hook for importing a skill from local folder
 */
export function useImportLocalSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (folderPath: string) => {
      const skillName = folderPath.split(/[\\/]/).pop() || 'unknown-skill';
      return await invoke('import_local_skill', {
        request: {
          sourcePath: folderPath,
          skillName,
          skipSecurityCheck: false
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

/**
 * Hook for importing a skill from package
 */
export function useImportPackageSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (packagePath: string) => {
      return await invoke('import_skill_package', {
        request: {
          packagePath,
          skipSecurityCheck: false
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

/**
 * Hook for fetching marketplace skills from backend database
 *
 * @param params - Query parameters for filtering and pagination
 * @returns React Query result with MarketplaceSkillDTO array
 */
export function useMarketplaceSkills(params?: ListMarketplaceParams & { sourceType?: SourceFilter }) {
  return useQuery({
    queryKey: ['marketplace-skills', params],
    queryFn: async () => {
      // If sourceType filter is provided, use the new filtered endpoint
      if (params?.sourceType && params.sourceType !== 'all') {
        const data = await invoke<MarketplaceSkillDTO[]>('list_marketplace_skills_by_source', {
          sourceType: params.sourceType,
          limit: params.limit || 100,
          offset: params.offset || 0,
        });

        return data.map(mapMarketplaceDto) as MarketplaceSkill[];
      }

      // If search query is provided, use search endpoint
      if (params?.searchQuery) {
        const data = await invoke<MarketplaceSkillDTO[]>('search_marketplace_skills', {
          query: params.searchQuery,
          limit: params.limit || 100,
        });

        return data.map(mapMarketplaceDto) as MarketplaceSkill[];
      }

      // Otherwise use list endpoint with filters
      const data = await invoke<MarketplaceSkillDTO[]>('list_marketplace_skills', {
        tagFilter: params?.tagFilter,
        minStars: params?.minStars,
        limit: params?.limit || 100,
      });

      // Convert DTO to MarketplaceSkill format for compatibility
      return data.map(mapMarketplaceDto) as MarketplaceSkill[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (marketplace data changes less frequently)
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook for fetching marketplace skills from JSON file (fallback)
 * This is kept for backward compatibility and testing
 *
 * @deprecated Use useMarketplaceSkills with backend API instead
 */
export function useMarketplaceSkillsFromJSON() {
  return useQuery({
    queryKey: ['marketplace-skills-json'],
    queryFn: async () => {
      const data = await fetchMarketplaceData();
      return data as MarketplaceSkill[];
    },
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}

/**
 * Hook for installing a skill from marketplace
 */
export function useInstallSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (skill: MarketplaceSkill) => {
      console.log('Attempting to install skill:', skill);

      if (!skill.githubUrl) {
        // Fallback: try to construct URL from repositoryName if available
        // Format: "owner/repo" -> "https://github.com/owner/repo"
        if (skill.repositoryName && skill.repositoryName.includes('/')) {
            console.warn('githubUrl is missing, falling back to repositoryName:', skill.repositoryName);
            skill.githubUrl = `https://github.com/${skill.repositoryName}`;
        } else {
            throw new Error(`Cannot install skill: Missing GitHub URL for ${skill.name}`);
        }
      }

      const result = await invoke<{ success: boolean; message: string }>('import_github_skill', {
        request: {
          repoUrl: skill.githubUrl,
          skipSecurityCheck: false
        }
      });

      if (!result.success) {
        throw new Error(result.message || 'Installation failed');
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate both skills and marketplace queries
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-skills'] });
    },
  });
}

/**
 * Hook for forking a skill
 */
export function useForkSkill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      originalSkillPath,
      newSkillName,
      forkType,
      derivedFromUrl,
      installPath
    }: {
      originalSkillPath: string;
      newSkillName: string;
      forkType: 'fork' | 'remix';
      derivedFromUrl?: string;
      installPath?: string;
    }) => {
      return await invoke('fork_skill', {
        request: {
          originalSkillPath,
          newSkillName,
          forkType,
          derivedFromUrl,
          installPath
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

/**
 * Hook for deleting a repository with detailed result
 *
 * @returns Mutation hook with enhanced error handling and success feedback
 */
export function useDeleteRepository() {
  const queryClient = useQueryClient();

  return useMutation<DeleteRepositoryResult, Error, string>({
    mutationFn: async (id: string) => {
      return await invoke<DeleteRepositoryResult>('delete_repository', { id });
    },
    onSuccess: (result) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-skills'] });

      // Log success for debugging
      console.log(`Repository deleted: ${result.deletedSkillsCount} skills removed`);
    },
    onError: (error: Error) => {
      // Enhanced error handling for API rate limits
      const apiError = error as unknown as ApiErrorResponse;

      if (apiError.code === 'API_RATE_LIMIT_EXCEEDED') {
        console.error('API rate limit exceeded:', apiError.message);
        if (apiError.helpUrl) {
          console.info('Configure token at:', apiError.helpUrl);
        }
      } else {
        console.error('Failed to delete repository:', error.message);
      }
    },
  });
}
