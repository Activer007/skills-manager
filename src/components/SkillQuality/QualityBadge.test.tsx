import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QualityBadge } from './QualityBadge';

describe('QualityBadge', () => {
  it('renders correct grade and score', () => {
    render(<QualityBadge grade="A" score={85.5} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('86')).toBeInTheDocument(); // 85.5 rounds to 86 with toFixed(0)
  });

  it('renders correct color class for grade S', () => {
    const { container } = render(<QualityBadge grade="S" score={95} />);
    expect(container.firstChild).toHaveClass('badge-success');
  });

  it('renders correct color class for grade C', () => {
    const { container } = render(<QualityBadge grade="C" score={65} />);
    expect(container.firstChild).toHaveClass('badge-error');
  });

  it('renders small size without score', () => {
    render(<QualityBadge grade="B" score={75} size="sm" />);
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByText('75')).not.toBeInTheDocument();
  });
});
