import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ShareTextDialog } from './ShareTextDialog';
import type { InstalledSkill } from '../types';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../utils/shareTextGenerator', () => ({
  generatePlatformShareText: vi.fn((skill) => `${skill.name} - ${skill.description}`),
  copyToClipboard: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../utils/shareLink', () => ({
  resolveSkillLink: vi.fn(() => 'https://github.com/test/skill'),
}));

vi.mock('../store/useToastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

vi.mock('./ui/Modal', () => ({
  Modal: ({ isOpen, onClose, title, children }: any) =>
    isOpen ? (
      <div data-testid="share-modal">
        <div data-testid="modal-title">{title}</div>
        {children}
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock('./ui/Button', () => ({
  Button: ({ children, onClick, variant, size, disabled }: any) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}));

import { invoke } from '@tauri-apps/api/core';
import { copyToClipboard } from '../utils/shareTextGenerator';
import { toast } from '../store/useToastStore';

describe('ShareTextDialog', () => {
  const mockSkill: InstalledSkill = {
    id: 'test-skill',
    name: 'Test Skill',
    localPath: '/path/to/skill',
    description: 'A test skill',
    author: 'Test Author',
    version: '1.0.0',
    status: 'safe',
    config: {
      __origin: {
        sourceUrl: 'https://github.com/test/skill',
        branch: 'main',
        checksum: 'abc123',
      },
    },
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (invoke as any).mockResolvedValue('abc123');
    (copyToClipboard as any).mockResolvedValue(true);

    // Mock window.open
    global.open = vi.fn();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('share-modal')).toBeInTheDocument();
      expect(screen.getByText(/Share Skill/)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByTestId('share-modal')).not.toBeInTheDocument();
    });

    it('should display skill name and description', () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Test Skill')).toBeInTheDocument();
      expect(screen.getByText('A test skill')).toBeInTheDocument();
    });

    it('should display safe status badge', () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Safe')).toBeInTheDocument();
    });

    it('should display skill link', async () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/github/)).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should display Copy Text tab by default', () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Copy Text')).toBeInTheDocument();
      expect(screen.getByText('Full Share Text')).toBeInTheDocument();
    });

    it('should switch to Social Media tab', async () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      const socialTab = screen.getByText('Social Media');
      await userEvent.click(socialTab);

      expect(screen.getByText('Twitter')).toBeInTheDocument();
      expect(screen.getByText('Weibo')).toBeInTheDocument();
    });
  });

  describe('Copy Text Tab', () => {
    it('should display generated share text', async () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getAllByText(/Test Skill/).length).toBeGreaterThan(0);
      });
    });

    it('should copy text to clipboard when copy button clicked', async () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      const buttons = screen.getAllByRole('button');
      const copyButton = buttons.find(btn => btn.textContent === '');

      if (copyButton) {
        await userEvent.click(copyButton);
      }

      expect(copyToClipboard).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalled();
    });
  });

  describe('Social Media Tab', () => {
    it('should open Twitter intent when tweet button clicked', async () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      // Switch to social tab
      await userEvent.click(screen.getByText('Social Media'));

      // Click tweet button
      const tweetButton = screen.getByText('Tweet');
      await userEvent.click(tweetButton);

      expect(global.open).toHaveBeenCalledWith(
        expect.stringContaining('twitter.com'),
        '_blank'
      );
    });

    it('should open Weibo share when share button clicked', async () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      // Switch to social tab
      await userEvent.click(screen.getByText('Social Media'));

      // Find and click Weibo share button
      const buttons = screen.getAllByRole('button');
      const shareButtons = buttons.filter(btn => btn.textContent === 'Share');

      if (shareButtons.length > 0) {
        await userEvent.click(shareButtons[0]);
      }

      // Should not throw error
      expect(global.open).toHaveBeenCalled();
    });

    it('should display character counts', async () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await userEvent.click(screen.getByText('Social Media'));

      expect(screen.getByText(/\(.*\/280\)/)).toBeInTheDocument();
      expect(screen.getByText(/\(.*\/140\)/)).toBeInTheDocument();
    });
  });

  describe('Modification Detection', () => {
    it('should detect modified skill', async () => {
      (invoke as any).mockResolvedValue('different-checksum');

      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/local changes/)).toBeInTheDocument();
      });
    });

    it('should not show warning for unmodified skill', async () => {
      (invoke as any).mockResolvedValue('abc123');

      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText(/local changes/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal Actions', () => {
    it('should call onClose when close button clicked', async () => {
      render(<ShareTextDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      const closeButtons = screen.getAllByText('Close');
      await userEvent.click(closeButtons[0]);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Different Skill Status', () => {
    it('should display risk status for unsafe skill', () => {
      const riskSkill = { ...mockSkill, status: 'unsafe' as any };
      render(<ShareTextDialog skill={riskSkill} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Risk')).toBeInTheDocument();
    });

    it('should display blocked status', () => {
      const blockedSkill = { ...mockSkill, status: 'blocked' as any };
      render(<ShareTextDialog skill={blockedSkill} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });

    it('should display unknown status for null status', () => {
      const unknownSkill = { ...mockSkill, status: null as any };
      render(<ShareTextDialog skill={unknownSkill} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });
});
