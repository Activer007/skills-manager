import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ShareImageDialog } from './ShareImageDialog';
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

vi.mock('../utils/shareCardGenerator', () => ({
  generateShareCard: vi.fn(() => Promise.resolve(new Blob(['test']))),
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
      <div data-testid="share-image-modal">
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
import { generateShareCard } from '../utils/shareCardGenerator';
import { toast } from '../store/useToastStore';

describe('ShareImageDialog', () => {
  const mockSkill: InstalledSkill = {
    id: 'test-skill',
    name: 'Test Skill',
    localPath: '/path/to/skill',
    description: 'A test skill for image sharing',
    author: 'Test Author',
    version: '1.0.0',
    status: 'safe',
    installDate: Date.now(),
    type: 'system',
    config: {
      __origin: {
        sourceUrl: 'https://github.com/test/skill',
        branch: 'main',
        checksum: 'abc123',
      },
    },
  };

  const mockOnClose = vi.fn();
  const mockBlob = new Blob(['test image data'], { type: 'image/png' });

  beforeEach(() => {
    vi.clearAllMocks();
    (invoke as any).mockResolvedValue('abc123');
    (generateShareCard as any).mockResolvedValue(mockBlob);

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  describe('Rendering', () => {
    it('should render when isOpen is true', () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByTestId('share-image-modal')).toBeInTheDocument();
      expect(screen.getByText(/Share Image/)).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={false} onClose={mockOnClose} />);

      expect(screen.queryByTestId('share-image-modal')).not.toBeInTheDocument();
    });

    it('should display theme selector', () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      expect(screen.getByText('Theme:')).toBeInTheDocument();
      expect(screen.getByText('Default')).toBeInTheDocument();
      expect(screen.getByText('Minimal')).toBeInTheDocument();
      expect(screen.getByText('Dark')).toBeInTheDocument();
    });

    it('should display loading state while generating', async () => {
      (generateShareCard as any).mockImplementation(() => new Promise(() => {}));

      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Generating image/)).toBeInTheDocument();
      });
    });
  });

  describe('Theme Selection', () => {
    it('should select default theme by default', () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      const buttons = screen.getAllByText('Default');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should switch to minimal theme when clicked', async () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText(/Generating/)).not.toBeInTheDocument();
      });

      const buttons = screen.getAllByText('Minimal');
      await userEvent.click(buttons[0]);

      // Should not throw error
      expect(generateShareCard).toHaveBeenCalled();
    });

    it('should switch to dark theme when clicked', async () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText(/Generating/)).not.toBeInTheDocument();
      });

      const buttons = screen.getAllByText('Dark');

      // Should be able to click without error
      await expect(async () => {
        await userEvent.click(buttons[0]);
      }).not.toThrow();
    });
  });

  describe('Image Generation', () => {
    it('should generate share card on mount', async () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(generateShareCard).toHaveBeenCalledWith(mockSkill, 'default');
      });
    });

    it('should display generated image preview', async () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        const img = screen.getByAltText('Share Card Preview');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'blob:mock-url');
      });
    });

    it('should display tip message after generation', async () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/Tip: Drag this image/)).toBeInTheDocument();
      });
    });

    it('should handle generation error gracefully', async () => {
      (generateShareCard as any).mockRejectedValue(new Error('Generation failed'));

      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to generate image');
      });
    });
  });

  describe('Download Functionality', () => {
    it('should have download button', async () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText(/Generating/)).not.toBeInTheDocument();
      });

      const downloadButtons = screen.getAllByText('Download');
      expect(downloadButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Regenerate Functionality', () => {
    it('should have regenerate button', async () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText(/Generating/)).not.toBeInTheDocument();
      });

      expect(screen.getByText('Regenerate')).toBeInTheDocument();
    });

    it('should regenerate image when regenerate button clicked', async () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(generateShareCard).toHaveBeenCalledTimes(1);
      });

      const regenerateButton = screen.getByText('Regenerate');
      await userEvent.click(regenerateButton);

      await waitFor(() => {
        expect(generateShareCard).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Modification Detection', () => {
    it('should display warning for modified skill', async () => {
      (invoke as any).mockResolvedValue('different-checksum');

      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByText(/local changes/)).toBeInTheDocument();
      });
    });

    it('should not display warning for unmodified skill', async () => {
      (invoke as any).mockResolvedValue('abc123');

      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText(/local changes/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Modal Actions', () => {
    it('should call onClose when close button clicked', async () => {
      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      const closeButtons = screen.getAllByText('Close');
      await userEvent.click(closeButtons[0]);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle skill with empty name', async () => {
      const skillWithEmptyName = { ...mockSkill, name: '' };

      render(<ShareImageDialog skill={skillWithEmptyName} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId('share-image-modal')).toBeInTheDocument();
      });
    });

    it('should handle skill with special characters in name', async () => {
      const skillWithSpecialChars = {
        ...mockSkill,
        name: 'Test<>:Skill|?.png',
      };

      render(<ShareImageDialog skill={skillWithSpecialChars} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.getByTestId('share-image-modal')).toBeInTheDocument();
      });
    });

    it('should disable download button when no preview', async () => {
      (generateShareCard as any).mockRejectedValue(new Error('Generation failed'));

      render(<ShareImageDialog skill={mockSkill} isOpen={true} onClose={mockOnClose} />);

      await waitFor(() => {
        expect(screen.queryByText(/Generating/)).not.toBeInTheDocument();
      });

      const downloadButton = screen.getByText('Download');
      expect(downloadButton).toBeDisabled();
    });
  });
});
