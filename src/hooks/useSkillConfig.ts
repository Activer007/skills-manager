import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';

export function useSkillConfig(skillId: string | null) {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ['skillConfig', skillId],
    queryFn: async () => {
      if (!skillId) return null;
      return await invoke<Record<string, unknown>>('get_skill_config', { skillId });
    },
    enabled: !!skillId,
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (config: Record<string, unknown>) => {
      if (!skillId) throw new Error('No skill ID provided');
      return await invoke('set_skill_config', { skillId, config });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skillConfig', skillId] });
    },
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    updateConfig: updateConfigMutation.mutateAsync,
    isUpdating: updateConfigMutation.isPending,
  };
}
