import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { InstalledSkill, MarketplaceSkill } from '../types';

/**
 * Hook for fetching installed skills
 */
export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const result = await invoke<{ system_skills: InstalledSkill[]; project_skills: InstalledSkill[] }>('scan_skills');
      return [...result.system_skills, ...result.project_skills];
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
        old?.filter(s => s.path !== skillPath) ?? []
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
 * Hook for fetching marketplace skills
 */
export function useMarketplaceSkills() {
  return useQuery({
    queryKey: ['marketplace-skills'],
    queryFn: async () => {
      const response = await fetch('/data/marketplace.json');
      if (!response.ok) {
        throw new Error(`Failed to load marketplace data (${response.status})`);
      }
      return await response.json() as MarketplaceSkill[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes (marketplace data changes less frequently)
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook for installing a skill from marketplace
 */
export function useInstallSkill() {
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
      // Invalidate both skills and marketplace queries
      queryClient.invalidateQueries({ queryKey: ['skills'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-skills'] });
    },
  });
}
