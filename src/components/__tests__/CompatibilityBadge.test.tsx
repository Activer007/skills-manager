import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompatibilityBadge } from '../CompatibilityBadge';
import type { CompatibilityInfo } from '../../types';

// Mock translation
import { vi } from 'vitest';
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock Tooltip component to avoid Radix UI dependency issues in tests
vi.mock('../ui/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: string }) => (
    <div data-testid="tooltip" title={content}>
      {children}
    </div>
  ),
}));

describe('CompatibilityBadge', () => {
  it('renders nothing when compatibility info is missing', () => {
    const { container } = render(<CompatibilityBadge />);
    expect(container.firstChild).toBeNull();
  });

  it('renders badge for supported agents', () => {
    const compatibility: CompatibilityInfo = {
      supportedAgents: ['claude-code', 'cursor'],
    };

    render(<CompatibilityBadge compatibility={compatibility} showLabel />);

    expect(screen.getByText('Claude Code')).toBeInTheDocument();
    expect(screen.getByText('Cursor')).toBeInTheDocument();
  });

  it('renders correct icons for agents', () => {
    const compatibility: CompatibilityInfo = {
      supportedAgents: ['claude-code'],
    };

    const { container } = render(<CompatibilityBadge compatibility={compatibility} />);
    // Check if SVG is present (icon)
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
