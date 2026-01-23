import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { InstalledSkill } from '../../../types';

// Mock shareCardGenerator (uses html2canvas and qrcode)
vi.mock('../../../utils/shareCardGenerator', () => ({
  generateShareCard: vi.fn().mockResolvedValue(new Blob(['mock-image'], { type: 'image/png' })),
  generateSkillQRCode: vi.fn().mockResolvedValue('data:image/png;base64,mock-qr-code'),
  CARD_THEMES: {
    default: { width: 800, height: 600, theme: 'light', accentColor: '#3B82F6', watermark: true },
    minimal: { width: 600, height: 400, theme: 'light', accentColor: '#000000', watermark: false },
    dark: { width: 800, height: 600, theme: 'dark', accentColor: '#8B5CF6', watermark: true },
  },
}));

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('mock-checksum'),
}));

vi.mock('../../../store/useToastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Import ShareSheet after mocks are set up
import { ShareSheet } from '../ShareSheet';

const mockSkill: InstalledSkill = {
  id: 'test-skill-1',
  name: 'Test Skill',
  description: 'A test skill for unit testing',
  author: 'Test Author',
  version: '1.0.0',
  type: 'system',
  localPath: '/path/to/skill',
  status: 'safe',
  enabled: true,
  config: {
    __origin: {
      repoUrl: 'https://github.com/test/skill',
      checksum: 'original-checksum',
    },
  },
};

describe('ShareSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByTestId('share-sheet')).toBeInTheDocument();
    expect(screen.getByText('Test Skill')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={false}
        onClose={() => {}}
      />
    );

    expect(screen.queryByTestId('share-sheet')).not.toBeInTheDocument();
  });

  it('displays skill information', () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Test Skill')).toBeInTheDocument();
    expect(screen.getByText(/A test skill for unit testing/)).toBeInTheDocument();
  });

  it('shows all share options', () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByTestId('share-option-link')).toBeInTheDocument();
    expect(screen.getByTestId('share-option-text')).toBeInTheDocument();
    expect(screen.getByTestId('share-option-image')).toBeInTheDocument();
    expect(screen.getByTestId('share-option-package')).toBeInTheDocument();
  });

  it('switches to text panel when text option is clicked', async () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('share-option-text'));

    await waitFor(() => {
      expect(screen.getByTestId('share-text-panel')).toBeInTheDocument();
    });
  });

  it('switches to image panel when image option is clicked', async () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('share-option-image'));

    await waitFor(() => {
      expect(screen.getByTestId('share-image-panel')).toBeInTheDocument();
    });
  });

  it('switches to package panel when package option is clicked', async () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
      />
    );

    fireEvent.click(screen.getByTestId('share-option-package'));

    await waitFor(() => {
      expect(screen.getByTestId('share-package-panel')).toBeInTheDocument();
    });
  });

  it('calls onClose when modal is closed', () => {
    const onClose = vi.fn();
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={onClose}
      />
    );

    // Find and click the close button (usually in the modal header)
    const closeButtons = screen.getAllByRole('button');
    const closeButton = closeButtons.find(btn =>
      btn.getAttribute('aria-label')?.includes('close') ||
      btn.textContent?.toLowerCase().includes('close')
    );

    if (closeButton) {
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('displays security status badge', () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
      />
    );

    // Should show "Safe" badge for safe status
    expect(screen.getByText('Safe')).toBeInTheDocument();
  });

  it('handles skill with risk status', () => {
    const riskSkill = { ...mockSkill, status: 'risk' as const };
    render(
      <ShareSheet
        skill={riskSkill}
        isOpen={true}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Risk')).toBeInTheDocument();
  });
});

describe('ShareTextPanel', () => {
  it('displays share text content', async () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
        initialPanel="text"
      />
    );

    // Wait for the text panel to be visible
    await waitFor(() => {
      expect(screen.getByTestId('share-text-panel')).toBeInTheDocument();
    });
  });

  it('has copy text functionality', async () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
        initialPanel="text"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('share-text-panel')).toBeInTheDocument();
    });

    // Should have copy button
    const copyButton = screen.getByTestId('copy-text');
    expect(copyButton).toBeInTheDocument();
  });
});

describe('ShareImagePanel', () => {
  it('displays image preview container', async () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
        initialPanel="image"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('share-image-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('image-preview-container')).toBeInTheDocument();
  });

  it('has theme selection buttons', async () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
        initialPanel="image"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('share-image-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('theme-default')).toBeInTheDocument();
    expect(screen.getByTestId('theme-minimal')).toBeInTheDocument();
    expect(screen.getByTestId('theme-dark')).toBeInTheDocument();
  });
});

describe('SharePackagePanel', () => {
  it('displays export package button', async () => {
    render(
      <ShareSheet
        skill={mockSkill}
        isOpen={true}
        onClose={() => {}}
        initialPanel="package"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('share-package-panel')).toBeInTheDocument();
    });

    expect(screen.getByTestId('export-package')).toBeInTheDocument();
  });
});
