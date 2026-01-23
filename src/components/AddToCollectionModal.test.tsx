import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddToCollectionModal } from './AddToCollectionModal';
import * as useCollectionsHook from '../hooks/useCollections';

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

describe('AddToCollectionModal', () => {
  const mockOnClose = vi.fn();
  const mockAddMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };
  const mockCreateMutation = {
    mutateAsync: vi.fn(),
    isPending: false,
  };

  const mockCollections = [
    {
      id: 'c1',
      name: 'Development Tools',
      items_count: 5,
      icon: '🛠️',
      color: '#3b82f6',
      items: [],
      is_public: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 'c2',
      name: 'Writing Aids',
      items_count: 2,
      icon: '📝',
      color: '#10b981',
      items: [],
      is_public: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ];

  const mockSkill = {
    id: 'skill-1',
    name: 'Python Helper',
    path: '/path/to/skill',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useCollectionsHook.useCollections as any).mockReturnValue({
      data: mockCollections,
      isLoading: false,
    });
    (useCollectionsHook.useAddCollectionItem as any).mockReturnValue(mockAddMutation);
    (useCollectionsHook.useCreateCollection as any).mockReturnValue(mockCreateMutation);
  });

  it('renders correctly when open', () => {
    render(
      <AddToCollectionModal
        isOpen={true}
        onClose={mockOnClose}
        skill={mockSkill}
      />
    );

    expect(screen.getByText('Add to Collection')).toBeInTheDocument();
    expect(screen.getByText('Python Helper')).toBeInTheDocument();
    expect(screen.getByText('Development Tools')).toBeInTheDocument();
    expect(screen.getByText('Writing Aids')).toBeInTheDocument();
  });

  it('filters collections based on search query', () => {
    render(
      <AddToCollectionModal
        isOpen={true}
        onClose={mockOnClose}
        skill={mockSkill}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search collections...');
    fireEvent.change(searchInput, { target: { value: 'Writing' } });

    expect(screen.queryByText('Development Tools')).not.toBeInTheDocument();
    expect(screen.getByText('Writing Aids')).toBeInTheDocument();
  });

  it('allows selecting a collection and adding the skill', async () => {
    render(
      <AddToCollectionModal
        isOpen={true}
        onClose={mockOnClose}
        skill={mockSkill}
      />
    );

    const collectionButton = screen.getByText('Development Tools').closest('button');
    fireEvent.click(collectionButton!);

    const addButton = screen.getByText('Add');
    expect(addButton).not.toBeDisabled();

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockAddMutation.mutateAsync).toHaveBeenCalledWith({
        collection_id: 'c1',
        skill_id: mockSkill.id,
        skill_name: mockSkill.name,
        skill_path: mockSkill.path,
        skill_identifier: undefined,
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('shows create new collection form when clicking create button', () => {
    render(
      <AddToCollectionModal
        isOpen={true}
        onClose={mockOnClose}
        skill={mockSkill}
      />
    );

    fireEvent.click(screen.getByText('Create New Collection'));

    expect(screen.getByPlaceholderText('e.g., Daily Tools')).toBeInTheDocument();
    expect(screen.getByText('Create & Add')).toBeInTheDocument();
  });

  it('creates a new collection and adds skill', async () => {
    mockCreateMutation.mutateAsync.mockResolvedValue({ id: 'new-c' });

    render(
      <AddToCollectionModal
        isOpen={true}
        onClose={mockOnClose}
        skill={mockSkill}
      />
    );

    fireEvent.click(screen.getByText('Create New Collection'));

    const input = screen.getByPlaceholderText('e.g., Daily Tools');
    fireEvent.change(input, { target: { value: 'New Collection' } });

    fireEvent.click(screen.getByText('Create & Add'));

    await waitFor(() => {
      expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith({
        name: 'New Collection',
      });
      expect(mockAddMutation.mutateAsync).toHaveBeenCalledWith({
        collection_id: 'new-c',
        skill_id: mockSkill.id,
        skill_name: mockSkill.name,
        skill_path: mockSkill.path,
        skill_identifier: undefined,
      });
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('disables collection if skill is already added', () => {
    const collectionsWithSkill = [
      {
        ...mockCollections[0],
        items: [{ skill_id: 'skill-1', collection_id: 'c1' }],
      },
    ];

    (useCollectionsHook.useCollections as any).mockReturnValue({
      data: collectionsWithSkill,
      isLoading: false,
    });

    render(
      <AddToCollectionModal
        isOpen={true}
        onClose={mockOnClose}
        skill={mockSkill}
      />
    );

    const collectionButton = screen.getByText('Development Tools').closest('button');
    expect(collectionButton).toBeDisabled();
    expect(screen.getByText('Added')).toBeInTheDocument();
  });
});
