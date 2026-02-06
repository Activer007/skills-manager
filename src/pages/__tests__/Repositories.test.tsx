import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import RepositoriesPage from '../Repositories';
import { createWrapper } from '../../test/utils';
import { invoke } from '@tauri-apps/api/core';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock UI components
vi.mock('../components/common/ModalDialog', () => ({
  ModalDialog: ({ children, isOpen, title }: any) => (
    isOpen ? <div data-testid="modal-dialog" title={title}>{children}</div> : null
  ),
}));

vi.mock('../components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

vi.mock('../components/ui/Switch', () => ({
  Switch: (props: any) => <input type="checkbox" {...props} />,
}));

vi.mock('../components/ui/Badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock('../components/ui/Button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));

vi.mock('../components/ui/Input', () => ({
  Input: (props: any) => <input {...props} />,
}));

// Mock FeaturedRepositories component to avoid rendering issues and isolate tests
vi.mock('../components/FeaturedRepositories', () => ({
  FeaturedRepositories: () => <div data-testid="featured-repositories">Featured Repositories</div>,
}));

// Mock Lucide icons to avoid rendering issues
vi.mock('lucide-react', async () => {
  return {
    Plus: () => <span>+</span>,
    Trash2: () => <span>Trash</span>,
    RefreshCw: () => <span>Refresh</span>,
    ExternalLink: () => <span>Link</span>,
    Loader2: () => <span>Loading...</span>,
    GitBranch: () => <span>Branch</span>,
    Calendar: () => <span>Date</span>,
    CheckCircle2: () => <span>Check</span>,
    XCircle: () => <span>X</span>,
    FolderOpen: () => <span>Folder</span>,
    AlertTriangle: () => <span>Alert</span>,
    CheckCircle: () => <span>Check</span>,
    Info: () => <span>Info</span>,
  };
});

describe('RepositoriesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(invoke).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<RepositoriesPage />, { wrapper: createWrapper() });

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('renders repository list after loading', async () => {
    const mockRepositories = [
      {
        id: '123',
        url: 'https://github.com/test/repo',
        name: 'Test Repo',
        enabled: true,
        scanSubdirs: false,
        addedAt: 1672531200000,
        featured: false,
        category: 'custom',
      },
    ];

    // Mock get_repositories
    vi.mocked(invoke).mockImplementation((cmd) => {
      if (cmd === 'get_repositories') return Promise.resolve(mockRepositories);
      if (cmd === 'get_featured_repositories') return Promise.resolve({ categories: [] });
      return Promise.resolve(null);
    });

    render(<RepositoriesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Test Repo')).toBeInTheDocument();
    });

    expect(screen.getByText('repositories.title')).toBeInTheDocument();
  });

  it('opens add repository modal when add button is clicked', async () => {
    vi.mocked(invoke).mockResolvedValue([]);

    render(<RepositoriesPage />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('repositories.add')).toBeInTheDocument();
    });

    // There might be multiple "Add" buttons (header + empty state + featured), get the first one
    const addButtons = screen.getAllByText('repositories.add');
    fireEvent.click(addButtons[0]);

    expect(screen.getByText('repositories.addDialog.title')).toBeInTheDocument();
  });
});
