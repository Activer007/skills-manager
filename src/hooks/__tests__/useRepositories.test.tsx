import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { useRepositories, useAddRepository, useFeaturedRepositories } from '../useRepositories';
import { createWrapper } from '../../test/utils';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('useRepositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches repositories successfully', async () => {
    const mockRepositories = [
      {
        id: '123',
        url: 'https://github.com/test/repo',
        name: 'test-repo',
        enabled: true,
        scanSubdirs: false,
        addedAt: 1672531200000,
        featured: false,
        category: 'custom',
      },
    ];

    vi.mocked(invoke).mockResolvedValue(mockRepositories);

    const { result } = renderHook(() => useRepositories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockRepositories);
    expect(invoke).toHaveBeenCalledWith('get_repositories');
  });
});

describe('useAddRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adds a repository successfully', async () => {
    const mockResponse = {
      success: true,
      message: 'Added successfully',
      repositoryId: '123',
    };

    vi.mocked(invoke).mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAddRepository(), {
      wrapper: createWrapper(),
    });

    const payload = { url: 'https://github.com/new/repo', name: 'new-repo' };

    result.current.mutate(payload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith('add_repository', { request: payload });
    expect(result.current.data).toEqual(mockResponse);
  });
});

describe('useFeaturedRepositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches featured repositories successfully', async () => {
    const mockConfig = {
      version: '1.0',
      last_updated: '2026-01-23',
      categories: [
        {
          id: 'official',
          name: { en: 'Official' },
          description: { en: 'Desc' },
          repositories: [],
        },
      ],
    };

    vi.mocked(invoke).mockResolvedValue(mockConfig);

    const { result } = renderHook(() => useFeaturedRepositories(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockConfig);
    expect(invoke).toHaveBeenCalledWith('get_featured_repositories');
  });
});
