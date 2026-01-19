// @ts-nocheck
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreRadar } from './ScoreRadar';
import type { SkillScore } from '../../types/scorer';

// Mock Recharts components to simplify testing
vi.mock('recharts', () => ({
  RadarChart: ({ data, children }: { data: unknown; children: React.ReactNode }) => (
    <div data-testid="radar-chart" data-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Radar: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="radar" data-datakey={dataKey} />
  ),
  PolarGrid: () => <div data-testid="polar-grid" />,
  PolarAngleAxis: ({ dataKey }: { dataKey: string }) => (
    <div data-testid="polar-angle-axis" data-datakey={dataKey} />
  ),
  PolarRadiusAxis: () => <div data-testid="polar-radius-axis" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: ({ formatter }: { formatter?: (value: number) => string }) => (
    <div data-testid="tooltip" data-formatter={formatter ? 'true' : 'false'} />
  ),
}));

const createMockScore = (
  contentScore: number,
  technicalScore: number,
  maintenanceScore: number,
  uxScore: number
): SkillScore => ({
  total_score: contentScore + technicalScore + maintenanceScore + uxScore,
  grade: 'A',
  content_score: {
    total: contentScore,
    clarity: { total: contentScore * 0.25, has_when_to_use: false, use_cases_count: 0, scenario_clarity: 0 },
    technical_depth: { total: contentScore * 0.375, code_examples_count: 0, has_best_practices: false, has_patterns: false, has_io_examples: false },
    documentation: { total: contentScore * 0.25, sections_count: 0, has_quick_start: false, avg_line_length: 0 },
    actionability: contentScore * 0.125,
  },
  technical_score: {
    total: technicalScore,
    code_quality: { total: technicalScore * 0.52, code_blocks_count: 0, language_diversity: 0, has_security_keywords: false },
    pattern_design: technicalScore * 0.32,
    error_handling: technicalScore * 0.16,
  },
  maintenance_score: { total: maintenanceScore, update_frequency: 0, community_activity: 0, compatibility: 0, last_update_days: null },
  ux_score: { total: uxScore, ease_of_use: uxScore * 0.5, readability: uxScore * 0.5 },
  suggestions: [],
  metadata: {
    skill_name: 'Test Skill',
    version: '1.0.0',
    author: 'Test Author',
    analyzed_at: '2023-01-01',
    analyzer_version: '1.0.0',
  },
});

describe('ScoreRadar', () => {
  it('renders radar chart with correct data structure', () => {
    const mockScore = createMockScore(40, 25, 8, 8); // 81 total
    const { container } = render(<ScoreRadar score={mockScore} />);

    const chart = screen.getByTestId('radar-chart');
    expect(chart).toBeInTheDocument();

    // Verify data structure
    const dataAttribute = chart.getAttribute('data-data');
    expect(dataAttribute).toBeDefined();

    const data = JSON.parse(dataAttribute || '[]');
    expect(data).toHaveLength(4);
    expect(data[0]).toHaveProperty('subject', 'Content');
    expect(data[0]).toHaveProperty('score');
    expect(data[0]).toHaveProperty('fullMark', 100);
  });

  it('normalizes scores to 0-100 percentage scale', () => {
    // Content: 40/50 = 80%
    // Technical: 25/30 ≈ 83.33%
    // Maintenance: 8/10 = 80%
    // UX: 8/10 = 80%
    const mockScore = createMockScore(40, 25, 8, 8);
    const { container } = render(<ScoreRadar score={mockScore} />);

    const chart = screen.getByTestId('radar-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data[0].score).toBeCloseTo(80, 1); // Content: 40/50 * 100
    expect(data[1].score).toBeCloseTo(83.33, 1); // Technical: 25/30 * 100
    expect(data[2].score).toBe(80); // Maintenance: 8/10 * 100
    expect(data[3].score).toBe(80); // UX: 8/10 * 100
  });

  it('displays all four dimension labels', () => {
    const mockScore = createMockScore(30, 20, 5, 5);
    render(<ScoreRadar score={mockScore} />);

    const chart = screen.getByTestId('radar-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data.map((d: { subject: string }) => d.subject)).toEqual([
      'Content',
      'Technical',
      'Maintenance',
      'UX',
    ]);
  });

  it('handles zero scores correctly', () => {
    const mockScore = createMockScore(0, 0, 0, 0);
    const { container } = render(<ScoreRadar score={mockScore} />);

    const chart = screen.getByTestId('radar-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data[0].score).toBe(0);
    expect(data[1].score).toBe(0);
    expect(data[2].score).toBe(0);
    expect(data[3].score).toBe(0);
  });

  it('handles perfect scores correctly', () => {
    // Content: 50/50 = 100%
    // Technical: 30/30 = 100%
    // Maintenance: 10/10 = 100%
    // UX: 10/10 = 100%
    const mockScore = createMockScore(50, 30, 10, 10);
    const { container } = render(<ScoreRadar score={mockScore} />);

    const chart = screen.getByTestId('radar-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data[0].score).toBe(100);
    expect(data[1].score).toBe(100);
    expect(data[2].score).toBe(100);
    expect(data[3].score).toBe(100);
  });

  it('shows tooltip with formatted score', () => {
    const mockScore = createMockScore(35, 22, 7, 6);
    render(<ScoreRadar score={mockScore} />);

    const tooltip = screen.getByTestId('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(tooltip.getAttribute('data-formatter')).toBe('true');
  });

  it('applies custom className', () => {
    const mockScore = createMockScore(30, 20, 5, 5);
    const { container } = render(<ScoreRadar score={mockScore} className="custom-class" />);

    const wrapper = container.querySelector('.custom-class');
    expect(wrapper).toBeInTheDocument();
  });

  it('handles edge case scores correctly', () => {
    // Test with fractional scores that would result in decimal percentages
    // Content: 25.5/50 = 51%
    // Technical: 15.3/30 = 51%
    const mockScore = createMockScore(25.5, 15.3, 5.2, 4.8);
    const { container } = render(<ScoreRadar score={mockScore} />);

    const chart = screen.getByTestId('radar-chart');
    const data = JSON.parse(chart.getAttribute('data-data') || '[]');

    expect(data[0].score).toBeCloseTo(51, 0);
    expect(data[1].score).toBeCloseTo(51, 0);
    expect(data[2].score).toBeCloseTo(52, 0);
    expect(data[3].score).toBeCloseTo(48, 0);
  });
});
