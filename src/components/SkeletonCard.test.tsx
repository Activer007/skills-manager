import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonCard } from './SkeletonCard';

describe('SkeletonCard', () => {
  it('renders default single skeleton card', () => {
    const { container } = render(<SkeletonCard />);

    const cards = container.querySelectorAll('.card');
    expect(cards).toHaveLength(1);

    const skeletonElements = container.querySelectorAll('.animate-pulse');
    expect(skeletonElements.length).toBeGreaterThan(0);
  });

  it('renders multiple skeleton cards when count is specified', () => {
    const { container } = render(<SkeletonCard count={3} />);

    const cards = container.querySelectorAll('.card');
    expect(cards).toHaveLength(3);
  });

  it('renders with correct skeleton structure', () => {
    const { container } = render(<SkeletonCard />);

    // Check for main card body
    expect(container.querySelector('.card-body')).toBeInTheDocument();

    // Check for pulse animation elements
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('renders with default count of 1', () => {
    const { container } = render(<SkeletonCard count={1} />);

    const cards = container.querySelectorAll('.card');
    expect(cards).toHaveLength(1);
  });

  it('renders empty fragment when count is 0', () => {
    const { container } = render(<SkeletonCard count={0} />);

    const cards = container.querySelectorAll('.card');
    expect(cards).toHaveLength(0);
  });
});
