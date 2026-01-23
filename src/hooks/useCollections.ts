import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  AddItemRequest,
} from '../types/collection';
import type { ExportResult } from '../types/share';

export function useCollections() {
  return useQuery({
    queryKey: ['collections'],
    queryFn: async () => {
      return await invoke<Collection[]>('get_collections');
    },
  });
}

export function useCollection(id: string | null) {
  return useQuery({
    queryKey: ['collection', id],
    queryFn: async () => {
      if (!id) return null;
      return await invoke<Collection>('get_collection', { id });
    },
    enabled: !!id,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: CreateCollectionRequest) => {
      return await invoke<Collection>('create_collection', { request });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: UpdateCollectionRequest) => {
      return await invoke('update_collection', { request });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      queryClient.invalidateQueries({ queryKey: ['collection', variables.id] });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      return await invoke('delete_collection', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useAddCollectionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: AddItemRequest) => {
      return await invoke('add_collection_item', { request });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] }); // To update items count
    },
  });
}

export function useRemoveCollectionItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (request: { collectionId: string, skillIdentifier: string }) => {
      return await invoke('remove_collection_item', { request });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['collection', variables.collectionId] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
  });
}

export function useExportCollection() {
  return useMutation({
    mutationFn: async (params: { collectionId: string; outputDir?: string }) => {
      return await invoke<ExportResult>('export_collection_package', params);
    },
  });
}
