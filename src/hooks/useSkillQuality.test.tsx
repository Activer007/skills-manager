import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useSkillQuality, useBatchSkillQuality, useBatchSkillQualityDetailed } from './useSkillQuality';
import type { SkillScore, ContentScore, TechnicalScore, MaintenanceScore, UxScore } from '../types/scorer';

// Mock data
const mockScore: SkillScore = {
  total_score: 85,
  grade: 'A',
  content_score: {
    total: 40,
    clarity: { total: 10, has_when_to_use: false, use_cases_count: 0, scenario_clarity: 0 },
    technical_depth: { total: 15, code_examples_count: 0, has_best_practices: false, has_patterns: false, has_io_examples: false },
    documentation: { total: 10, sections_count: 0, has_quick_start: false, avg_line_length: 0 },
    actionability: 5
  } as ContentScore,
  technical_score: {
    total: 25,
    code_quality: { total: 13, code_blocks_count: 0, language_diversity: 0, has_security_keywords: false },
    pattern_design: 8,
    error_handling: 4
  } as TechnicalScore,
  maintenance_score: { total: 10, update_frequency: 0, community_activity: 0, compatibility: 0, last_update_days: null } as MaintenanceScore,
  ux_score: { total: 10, ease_of_use: 0, readability: 0 } as UxScore,
  suggestions: ['Add more examples'],
  metadata: {
    skill_name: 'test-skill',
    version: '1.0.0',
    author: 'tester',
    analyzed_at: '2023-01-01T00:00:00Z',
    analyzer_version: '1.0.0',
  },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useSkillQuality Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('useSkillQuality should fetch skill score', async () => {
    vi.mocked(invoke).mockResolvedValue(mockScore);

    const { result } = renderHook(() => useSkillQuality('/path/to/skill'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith('analyze_skill_quality', { skillPath: '/path/to/skill' });
    expect(result.current.data).toEqual(mockScore);
  });

  it('useSkillQuality should not fetch if path is empty', async () => {
    const { result } = renderHook(() => useSkillQuality(''), { wrapper });

    expect(result.current.isLoading).toBe(false); // Should not even start loading or be in success state immediately if enabled is false?
    // Actually, when enabled is false, status is 'pending' and fetchStatus is 'idle'.
    expect(invoke).not.toHaveBeenCalled();
  });

  it('useBatchSkillQuality should fetch multiple scores', async () => {
    const mockScores = [mockScore, { ...mockScore, total_score: 90 }];
    vi.mocked(invoke).mockResolvedValue(mockScores);

    const paths = ['/path/1', '/path/2'];
    const { result } = renderHook(() => useBatchSkillQuality(paths), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith('batch_analyze_skills', { skillPaths: paths });
    expect(result.current.data).toEqual(mockScores);
  });

  it('useBatchSkillQualityDetailed should fetch detailed results', async () => {
    const mockResult = {
        scores: [mockScore],
        errors: [],
        total: 1,
        successful: 1,
        failed: 0
    };
    vi.mocked(invoke).mockResolvedValue(mockResult);

    const paths = ['/path/1'];
    const { result } = renderHook(() => useBatchSkillQualityDetailed(paths), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invoke).toHaveBeenCalledWith('batch_analyze_skills_detailed', { skillPaths: paths });
    expect(result.current.data).toEqual(mockResult);
  });
});
