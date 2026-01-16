import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QualityScoreCard } from './QualityScoreCard';
import type { SkillScore, ClarityScore, TechnicalDepthScore, DocumentationScore, CodeQualityScore, MaintenanceScore, UxScore } from '../../types/scorer';

// Mock ScoreRadar since Recharts can be tricky in tests and we want to test the card logic
vi.mock('./ScoreRadar', () => ({
  ScoreRadar: () => <div data-testid="score-radar">Mock Radar</div>
}));

const mockScore: SkillScore = {
  total_score: 85.5,
  grade: 'A',
  content_score: {
    total: 40,
    clarity: { total: 10, has_when_to_use: false, use_cases_count: 0, scenario_clarity: 0 } as ClarityScore,
    technical_depth: { total: 15, code_examples_count: 0, has_best_practices: false, has_patterns: false, has_io_examples: false } as TechnicalDepthScore,
    documentation: { total: 10, sections_count: 0, has_quick_start: false, avg_line_length: 0 } as DocumentationScore,
    actionability: 5
  },
  technical_score: {
    total: 25,
    code_quality: { total: 13, code_blocks_count: 0, language_diversity: 0, has_security_keywords: false } as CodeQualityScore,
    pattern_design: 8,
    error_handling: 4
  },
  maintenance_score: { total: 8, update_frequency: 0, community_activity: 0, compatibility: 0, last_update_days: null } as MaintenanceScore,
  ux_score: { total: 8, ease_of_use: 0, readability: 0 } as UxScore,
  suggestions: ['Suggestion 1'],
  metadata: {
    skill_name: 'Test Skill',
    version: '1.0.0',
    author: 'Author Name',
    analyzed_at: '2023-01-01',
    analyzer_version: '1.0.0',
  },
};

describe('QualityScoreCard', () => {
  it('renders loading state', () => {
    render(<QualityScoreCard score={mockScore} isLoading={true} />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<QualityScoreCard score={mockScore} error="Failed to load" />);
    expect(screen.getByTestId('error-alert')).toHaveTextContent('Failed to load');
  });

  it('renders score summary correctly', () => {
    render(<QualityScoreCard score={mockScore} />);
    expect(screen.getByText('Test Skill')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument(); // Grade
    expect(screen.getByText('86')).toBeInTheDocument(); // Total score (rounded)
    expect(screen.getByText('v1.0.0')).toBeInTheDocument(); // Version
  });

  it('toggles details when clicked', () => {
    render(<QualityScoreCard score={mockScore} />);
    
    // Check if expansion content is hidden initially
    expect(screen.queryByText('Content Quality')).not.toBeInTheDocument();

    // Click to expand - click on the header container
    const header = screen.getByText('Test Skill').closest('div')?.parentElement;
    fireEvent.click(header!);

    // Now details should be visible
    expect(screen.getByText('Content Quality')).toBeInTheDocument();
    expect(screen.getByText('Technical Implementation')).toBeInTheDocument();
    expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
  });
});
