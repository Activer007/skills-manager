import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { SkillScore, BatchAnalysisResult } from '../types/scorer';

export function useSkillQuality(skillPath: string) {
  return useQuery({
    queryKey: ['skill-quality', skillPath],
    queryFn: async () => {
      if (!skillPath) return null;
      return await invoke<SkillScore>('analyze_skill_quality', { skillPath });
    },
    enabled: !!skillPath,
    staleTime: 1000 * 60 * 60, // 1 hour (scores don't change often unless skill changes)
  });
}

export function useBatchSkillQuality(skillPaths: string[]) {
  return useQuery({
    queryKey: ['batch-skill-quality', skillPaths], // Simple key, could be better hashed
    queryFn: async () => {
      if (skillPaths.length === 0) return [];
      return await invoke<(SkillScore | null)[]>('batch_analyze_skills', { skillPaths });
    },
    enabled: skillPaths.length > 0,
    staleTime: 1000 * 60 * 60,
  });
}

// For detailed results with errors
export function useBatchSkillQualityDetailed(skillPaths: string[]) {
  return useQuery({
    queryKey: ['batch-skill-quality-detailed', skillPaths],
    queryFn: async () => {
      if (skillPaths.length === 0) return null;
      return await invoke<BatchAnalysisResult>('batch_analyze_skills_detailed', { skillPaths });
    },
    enabled: skillPaths.length > 0,
    staleTime: 1000 * 60 * 60,
  });
}
