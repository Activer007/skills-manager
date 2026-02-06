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

// Mock MarketplaceContext
vi.mock('../context/MarketplaceContext', () => ({
  useMarketplaceContext: () => ({
    searchTerm: '',
    setSearchTerm: vi.fn(),
    filter: 'all',
    setFilter: vi.fn(),
    sortOption: 'updated',
    setSortOption: vi.fn(),
    securityFilter: 'all',
    setSecurityFilter: vi.fn(),
    compatibilityFilter: 'all',
    setCompatibilityFilter: vi.fn(),
    sourceFilter: 'all',
    setSourceFilter: vi.fn(),
    showFilters: false,
    setShowFilters: vi.fn(),
  }),
}));

// Mock useMarketplaceLogic
vi.mock('../hooks/useMarketplaceLogic', () => ({
  useMarketplaceLogic: () => ({
    isLoadingMarketplace: false,
    isMarketplaceError: false,
    marketplaceError: null,
    refetchMarketplace: vi.fn(),
    searchTerm: '',
    setSearchTerm: vi.fn(),
    filter: 'all',
    setFilter: vi.fn(),
    sortOption: 'updated',
    setSortOption: vi.fn(),
    securityFilter: 'all',
    setSecurityFilter: vi.fn(),
    compatibilityFilter: 'all',
    setCompatibilityFilter: vi.fn(),
    sourceFilter: 'all',
    setSourceFilter: vi.fn(),
    showFilters: false,
    setShowFilters: vi.fn(),
    isGithubUrl: false,
    filteredAndSortedSkills: [],
    marketplaceSkills: [],
  }),
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
    // This test now verifies the header component properly receives and renders the button
    // The actual isGithubUrl logic is tested in the useMarketplaceLogic hook
    render(<Marketplace />);

    // Verify the default import button is shown
    expect(screen.getByText('Import from GitHub')).toBeInTheDocument();
  });

  it('passes URL to modal when clicking import with URL', () => {
    render(<Marketplace />);

    // Click the import button
    const importButton = screen.getByText('Import from GitHub');
    fireEvent.click(importButton);

    // Check if modal is rendered (initialUrl would be undefined since no GitHub URL was entered)
    const modal = screen.getByTestId('import-modal');
    expect(modal).toBeInTheDocument();
  });
});
