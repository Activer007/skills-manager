import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { SkillScore, BatchAnalysisResult } from '../types/scorer';

// Cache time constant (1 hour)
const CACHE_TIME = 1000 * 60 * 60;

export function useSkillQuality(skillPath: string) {
  return useQuery({
    queryKey: ['skill-quality', skillPath],
    queryFn: async () => {
      if (!skillPath) return null;
      return await invoke<SkillScore>('analyze_skill_quality', { skillPath });
    },
    enabled: !!skillPath,
    staleTime: CACHE_TIME,
  });
}

export function useBatchSkillQuality(skillPaths: string[]) {
  // Sort paths to ensure consistent cache key regardless of order
  const sortedPaths = [...skillPaths].sort();

  return useQuery({
    queryKey: ['batch-skill-quality', sortedPaths.join('|')],
    queryFn: async () => {
      if (skillPaths.length === 0) return [];
      return await invoke<(SkillScore | null)[]>('batch_analyze_skills', { skillPaths });
    },
    enabled: skillPaths.length > 0,
    staleTime: CACHE_TIME,
  });
}

// For detailed results with errors
export function useBatchSkillQualityDetailed(skillPaths: string[]) {
  // Sort paths to ensure consistent cache key regardless of order
  const sortedPaths = [...skillPaths].sort();

  return useQuery({
    queryKey: ['batch-skill-quality-detailed', sortedPaths.join('|')],
    queryFn: async () => {
      if (skillPaths.length === 0) return null;
      return await invoke<BatchAnalysisResult>('batch_analyze_skills_detailed', { skillPaths });
    },
    enabled: skillPaths.length > 0,
    staleTime: CACHE_TIME,
  });
}
