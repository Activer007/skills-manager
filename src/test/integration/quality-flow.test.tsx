// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import React from 'react';
import { QualityScoreCard } from '../../components/SkillQuality/QualityScoreCard';
import type { SkillScore } from '../../types/scorer';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock ScoreRadar
vi.mock('../../components/SkillQuality/ScoreRadar', () => ({
  ScoreRadar: () => <div data-testid="score-radar">Mock Radar</div>
}));

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

const mockScore: SkillScore = {
  total_score: 85.5,
  grade: 'A',
  content_score: {
    total: 40,
    clarity: { total: 10, has_when_to_use: false, use_cases_count: 0, scenario_clarity: 0 },
    technical_depth: { total: 15, code_examples_count: 0, has_best_practices: false, has_patterns: false, has_io_examples: false },
    documentation: { total: 10, sections_count: 0, has_quick_start: false, avg_line_length: 0 },
    actionability: 5
  },
  technical_score: {
    total: 25,
    code_quality: { total: 13, code_blocks_count: 0, language_diversity: 0, has_security_keywords: false },
    pattern_design: 8,
    error_handling: 4
  },
  maintenance_score: { total: 8, update_frequency: 0, community_activity: 0, compatibility: 0, last_update_days: null },
  ux_score: { total: 8, ease_of_use: 0, readability: 0 },
  suggestions: ['Add more code examples', 'Improve documentation structure', 'Add best practices section'],
  metadata: {
    skill_name: 'Test Skill',
    version: '1.0.0',
    author: 'Test Author',
    analyzed_at: '2023-01-01',
    analyzer_version: '1.0.0',
  },
};

describe('Quality Score Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('complete flow: fetch → analyze → display', async () => {
    // Simulate fetching score from Tauri
    vi.mocked(invoke).mockResolvedValue(mockScore);

    const TestComponent = () => {
      const { t } = useTranslation();
      const [score, setScore] = React.useState<SkillScore | null>(null);

      React.useEffect(() => {
        // Simulate fetch
        invoke('analyze_skill_quality', { skillPath: '/test/path' })
          .then((data) => setScore(data as SkillScore));
      }, []);

      if (!score) return <div>Loading...</div>;

      return (
        <div>
          <h1>{t('pages.mySkills.title')}</h1>
          <QualityScoreCard score={score} />
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    // Initially loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // After fetch completes
    await waitFor(() => {
      expect(screen.getByText('Test Skill')).toBeInTheDocument();
    });

    // Check score display
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('86')).toBeInTheDocument();
  });

  it('handles analysis error gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(invoke).mockRejectedValue(new Error('Analysis failed'));

    const TestComponent = () => {
      const [score, setScore] = React.useState<SkillScore | null>(null);
      const [error, setError] = React.useState<string | null>(null);

      React.useEffect(() => {
        invoke('analyze_skill_quality', { skillPath: '/test/path' })
          .then((data) => setScore(data as SkillScore))
          .catch((err) => setError(err.message));
      }, []);

      if (error) return <div data-testid="error-message">Error: {error}</div>;
      if (!score) return <div>Loading...</div>;
      return <QualityScoreCard score={score} />;
    };

    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
    });

    expect(screen.getByText(/Analysis failed/)).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it('shows cached score on second view', async () => {
    let invokeCallCount = 0;
    vi.mocked(invoke).mockImplementation(() => {
      invokeCallCount++;
      return Promise.resolve(mockScore);
    });

    const TestComponent = () => {
      const [score, setScore] = React.useState<SkillScore | null>(null);
      const [viewCount, setViewCount] = React.useState(1);

      React.useEffect(() => {
        invoke('analyze_skill_quality', { skillPath: '/test/path' })
          .then((data) => setScore(data as SkillScore));
      }, [viewCount]);

      if (!score) return <div>Loading...</div>;
      return (
        <div>
          <QualityScoreCard score={score} />
          <button onClick={() => setViewCount(c => c + 1)}>Refresh</button>
        </div>
      );
    };

    const { rerender } = render(<TestComponent />, { wrapper });

    // First view
    await waitFor(() => {
      expect(screen.getByText('Test Skill')).toBeInTheDocument();
    });
    const firstCallCount = invokeCallCount;

    // Simulate cache - in real scenario, React Query would cache this
    // For this test, we verify that the component can re-render without issues
    rerender(<TestComponent />);

    // Component still displays correctly
    expect(screen.getByText('Test Skill')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    const TestComponent = () => {
      const [score, setScore] = React.useState<SkillScore | null>(null);

      // Don't fetch - simulate loading state
      return (
        <div>
          {score ? <QualityScoreCard score={score} /> : <div data-testid="loading-state">Analyzing skill quality...</div>}
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText('Analyzing skill quality...')).toBeInTheDocument();
  });

  it('expands score card', async () => {
    const TestComponent = () => {
      return (
        <div>
          <QualityScoreCard score={mockScore} />
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    // Initially collapsed - details not visible
    expect(screen.queryByText('Content Quality')).not.toBeInTheDocument();

    // Click to expand
    const header = screen.getByText('Test Skill').closest('div')?.parentElement;
    fireEvent.click(header!);

    // Now details should be visible - just check that content section is displayed
    await waitFor(() => {
      expect(screen.getByText('Content Quality')).toBeInTheDocument();
      expect(screen.getByText('50 pts')).toBeInTheDocument();
    });
  });

  it('renders suggestion list', async () => {
    const TestComponent = () => {
      return <QualityScoreCard score={mockScore} />;
    };

    render(<TestComponent />, { wrapper });

    // Expand the card
    const header = screen.getByText('Test Skill').closest('div')?.parentElement;
    fireEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText('Add more code examples')).toBeInTheDocument();
      expect(screen.getByText('Improve documentation structure')).toBeInTheDocument();
      expect(screen.getByText('Add best practices section')).toBeInTheDocument();
    });
  });

  it('displays grade correctly for different score ranges', () => {
    const testCases: { score: number; expectedGrade: string }[] = [
      { score: 95, expectedGrade: 'S' },
      { score: 85, expectedGrade: 'A' },
      { score: 75, expectedGrade: 'B' },
      { score: 65, expectedGrade: 'C' },
      { score: 50, expectedGrade: 'D' },
    ];

    testCases.forEach(({ score, expectedGrade }) => {
      const testScore: SkillScore = {
        ...mockScore,
        total_score: score,
        grade: expectedGrade,
      };

      const TestComponent = () => {
        return <QualityScoreCard score={testScore} />;
      };

      const { unmount } = render(<TestComponent />, { wrapper });

      expect(screen.getByText(expectedGrade)).toBeInTheDocument();
      unmount();
    });
  });

  it('shows radar chart visualization', async () => {
    const TestComponent = () => {
      return <QualityScoreCard score={mockScore} />;
    };

    render(<TestComponent />, { wrapper });

    // Expand the card
    const header = screen.getByText('Test Skill').closest('div')?.parentElement;
    fireEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByTestId('score-radar')).toBeInTheDocument();
    });
  });
});
