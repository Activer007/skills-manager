import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShareCollectionModal } from './ShareCollectionModal';
import * as useCollectionsHook from '../hooks/useCollections';
import userEvent from '@testing-library/user-event';

// Mock the hooks
vi.mock('../hooks/useCollections');
vi.mock('../store/useToastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('ShareCollectionModal', () => {
  const mockOnClose = vi.fn();
  const mockExportMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  };

  const mockCollection = {
    id: 'c1',
    name: 'Development Tools',
    description: 'A set of dev tools',
    items_count: 5,
    icon: '🛠️',
    color: '#3b82f6',
    items: [],
    is_public: false,
    created_at: Date.now(),
    updated_at: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useCollectionsHook.useExportCollection as any).mockReturnValue(mockExportMutation);
  });

  it('renders correctly when open', () => {
    render(
      <ShareCollectionModal
        isOpen={true}
        onClose={mockOnClose}
        collection={mockCollection}
      />
    );

    expect(screen.getByText('Export Collection Package')).toBeInTheDocument();
    expect(screen.getByText('Development Tools')).toBeInTheDocument();
    expect(screen.getByText('5 Skills')).toBeInTheDocument();
    expect(screen.getByText('Start Export')).toBeInTheDocument();
  });

  it('calls export mutation when button clicked', async () => {
    mockExportMutation.mutateAsync.mockResolvedValue({
      success: true,
      filePath: '/tmp/test.zip',
      fileName: 'test.zip',
    });

    const user = userEvent.setup();
    render(
      <ShareCollectionModal
        isOpen={true}
        onClose={mockOnClose}
        collection={mockCollection}
      />
    );

    await user.click(screen.getByText('Start Export'));

    await waitFor(() => {
      expect(mockExportMutation.mutateAsync).toHaveBeenCalledWith({
        collectionId: 'c1',
      });
    });
  });

  it('shows success state after successful export', async () => {
    mockExportMutation.mutateAsync.mockResolvedValue({
      success: true,
      filePath: '/tmp/collection.skillcollection.zip',
      fileName: 'collection.skillcollection.zip',
    });

    const user = userEvent.setup();
    render(
      <ShareCollectionModal
        isOpen={true}
        onClose={mockOnClose}
        collection={mockCollection}
      />
    );

    await user.click(screen.getByText('Start Export'));

    await waitFor(() => {
      expect(screen.getByText('Export Successful!')).toBeInTheDocument();
      expect(screen.getByText('/tmp/collection.skillcollection.zip')).toBeInTheDocument();
      expect(screen.getByText('Open Folder')).toBeInTheDocument();
    });
  });

  it('shows error state after failed export', async () => {
    mockExportMutation.mutateAsync.mockResolvedValue({
      success: false,
      error: 'Disk full',
    });

    const user = userEvent.setup();
    render(
      <ShareCollectionModal
        isOpen={true}
        onClose={mockOnClose}
        collection={mockCollection}
      />
    );

    await user.click(screen.getByText('Start Export'));

    await waitFor(() => {
      expect(screen.getByText('Export Failed')).toBeInTheDocument();
      expect(screen.getByText('Disk full')).toBeInTheDocument();
    });
  });
});
