import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { InstalledSkill, MarketplaceSkill } from '../types';
import type { SecurityReport } from '../types/security';

type ScanSkillEntry = {
  name: string;
  description?: string;
  path: string;
  skillType: 'system' | 'project' | string;
  isMcp?: boolean;
  tags?: string[];
  configSchema?: Record<string, unknown>;
};

type ScanSkillsResult = {
  systemSkills: ScanSkillEntry[];
  projectSkills: ScanSkillEntry[];
};

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

      const securityReports = await invoke<SecurityReport[]>('batch_scan_skills', {
        skillPaths: allSkillPaths,
        locale: window.localStorage.getItem('i18nextLng') || 'en'
      });
      const securityMap = new Map(securityReports.map(report => [report.skill_id, report]));

      const mapSkill = (skill: ScanSkillEntry): InstalledSkill => {
        const report = securityMap.get(skill.path.split(/[\\/]/).pop() || '');
        return {
          id: skill.path,
          name: skill.name,
          description: skill.description ?? '',
          localPath: skill.path,
          status: report ? (report.score >= 70 ? 'safe' : 'unsafe') : 'safe',
          type: skill.skillType as InstalledSkill['type'],
          installDate: Date.now(),
          version: '1.0.0',
          author: 'Unknown',
          stars: 0,
          securityScore: report?.score,
          securityIssues: report?.issues,
          isMcp: skill.isMcp,
          tags: skill.tags,
          configSchema: skill.configSchema
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
