import { render, screen, fireEvent } from '@testing-library/react';
import Marketplace from './Marketplace';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mocks
vi.mock('../hooks/useSkills', () => ({
  useSkills: () => ({ data: [] }),
  useMarketplaceSkills: () => ({ data: [], isLoading: false }),
  useInstallSkill: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUninstallSkill: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en' },
  }),
}));

// Mock child components to avoid rendering complexity
vi.mock('../components/ImportSkillModal', () => ({
  ImportSkillModal: ({ isOpen, initialUrl }: any) => (
    isOpen ? <div data-testid="import-modal" data-initial-url={initialUrl}>Import Modal</div> : null
  ),
}));

vi.mock('../components/ImageDropZone', () => ({
  ImageDropZone: () => <div data-testid="image-drop-zone">Drop Zone</div>,
}));

vi.mock('../components/ImageImportModal', () => ({
  ImageImportModal: () => null,
}));

// Mock heavy UI components
vi.mock('react-window', () => ({
  FixedSizeGrid: () => <div>Grid</div>,
}));

vi.mock('react-virtualized-auto-sizer', () => ({
  AutoSizer: ({ renderProp, ChildComponent }: any) => {
    if (renderProp) {
      return renderProp({ height: 500, width: 500 });
    }
    if (ChildComponent) {
      return <ChildComponent height={500} width={500} />;
    }
    return null;
  },
}));

vi.mock('../components/ui/SlideOver', () => ({
  SlideOver: () => null
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  }
}));

describe('Marketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects GitHub URL and updates import button text', () => {
    render(<Marketplace />);

    const input = screen.getByPlaceholderText('searchSkills');

    // Initial state (Import text might be inside the button which has an icon)
    // The button contains "Import" text initially
    expect(screen.getByText('Import')).toBeInTheDocument();

    // Type GitHub URL
    fireEvent.change(input, { target: { value: 'https://github.com/test/repo' } });

    // Check button text update
    expect(screen.getByText('Import URL')).toBeInTheDocument();

    // Type non-URL
    fireEvent.change(input, { target: { value: 'react skills' } });
    expect(screen.getByText('Import')).toBeInTheDocument();
  });

  it('passes URL to modal when clicking import with URL', () => {
     render(<Marketplace />);
     const input = screen.getByPlaceholderText('searchSkills');
     const url = 'https://github.com/test/repo';

     fireEvent.change(input, { target: { value: url } });

     // Click the button. Since the text changed to "Import URL", we can find it by that.
     const button = screen.getByText('Import URL');
     fireEvent.click(button);

     // Check if modal is rendered with correct props
     const modal = screen.getByTestId('import-modal');
     expect(modal).toBeInTheDocument();
     expect(modal).toHaveAttribute('data-initial-url', url);
  });
});
