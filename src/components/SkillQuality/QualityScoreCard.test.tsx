import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QualityScoreCard } from './QualityScoreCard';
import type { SkillScore } from '../../types/scorer';

// Mock ScoreRadar since Recharts can be tricky in tests and we want to test the card logic
vi.mock('./ScoreRadar', () => ({
  ScoreRadar: () => <div data-testid="score-radar">Mock Radar</div>
}));

const mockScore: SkillScore = {
  total_score: 85.5,
  grade: 'A',
  content_score: { 
    total: 40,
    clarity: { total: 10 } as any,
    technical_depth: { total: 15 } as any,
    documentation: { total: 10 } as any,
    actionability: 5
  },
  technical_score: {
    total: 25,
    code_quality: { total: 13 } as any,
    pattern_design: 8,
    error_handling: 4
  },
  maintenance_score: { total: 8 } as any,
  ux_score: { total: 8 } as any,
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
