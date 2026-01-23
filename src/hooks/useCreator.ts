import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { Creator, UpdateCreatorRequest } from '../types/creator';

export function useCreator(id: string | null) {
  return useQuery({
    queryKey: ['creator', id],
    queryFn: async () => {
      if (!id) return null;
      return await invoke<Creator | null>('get_creator', { id });
    },
    enabled: !!id,
  });
}

export function useFollowedCreators() {
  return useQuery({
    queryKey: ['followed_creators'],
    queryFn: async () => {
      return await invoke<Creator[]>('get_followed_creators');
    },
  });
}

export function useUpdateCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: UpdateCreatorRequest) => {
      return await invoke('update_creator', { request });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['creator', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['followed_creators'] });
    },
  });
}

export function useFollowCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await invoke('follow_creator', { id });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['creator', id] });
      queryClient.invalidateQueries({ queryKey: ['followed_creators'] });
    },
  });
}

export function useUnfollowCreator() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await invoke('unfollow_creator', { id });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['creator', id] });
      queryClient.invalidateQueries({ queryKey: ['followed_creators'] });
    },
  });
}
