import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SharePreview from '../SharePreview';
import { TaskStatus } from '../../types/task';

// Mocks
const mockNavigate = vi.fn();
const mockParams = { shareId: 'valid-share-id' };

vi.mock('react-router-dom', () => ({
  useParams: () => mockParams,
  useNavigate: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockInvoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

// Define mockToast using vi.hoisted to ensure it's available for the hoisted vi.mock call
const { mockToast } = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../store/useToastStore', () => ({
  toast: mockToast,
}));

// Mock store
const { mockTasks, mockUseTaskStore } = vi.hoisted(() => {
    const tasks: any[] = [];
    const setTasks = vi.fn();
    const useTaskStore = vi.fn((selector) => {
        if (selector) {
            return selector({ tasks: tasks });
        }
        return {
            tasks: tasks,
            setTasks: setTasks,
        };
    });
    return { mockTasks: tasks, mockSetTasks: setTasks, mockUseTaskStore: useTaskStore };
});

vi.mock('../../store/useTaskStore', () => ({
  useTaskStore: mockUseTaskStore,
}));

vi.mock('../../hooks/useTaskListener', () => ({
  useTaskListener: vi.fn(),
}));

// Mock child components to simplify testing
vi.mock('../../components/InstallConfirmDialog', () => ({
  InstallConfirmDialog: ({ isOpen, onConfirm }: any) => (
    isOpen ? (
      <div data-testid="confirm-dialog">
        <button onClick={() => onConfirm({ target: 'system' })}>Confirm</button>
      </div>
    ) : null
  ),
}));

// Mock InstallProgress to avoid complex rendering
vi.mock('../../components/InstallProgress', () => ({
  InstallProgress: ({ stage, progress }: any) => (
    <div data-testid="install-progress">
      Stage: {stage}, Progress: {progress}
    </div>
  ),
}));

// Mock shareLink utility
vi.mock('../../utils/shareLink', () => ({
  parseShareLink: (id: string) => ({
    valid: true,
    id: id,
    type: 'share'
  })
}));

describe('SharePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTasks.length = 0; // Clear tasks
  });

  it('renders loading state initially', () => {
    render(<SharePreview />);
    expect(screen.getByText(/Loading shared content/i)).toBeInTheDocument();
  });

  it('renders skill info when link is resolved', async () => {
    mockInvoke.mockResolvedValueOnce({
      target_id: 'skill-123',
      created_at: Date.now(),
      metadata: {
        name: 'Test Skill',
        description: 'A test skill',
        url: 'https://github.com/test/skill',
        security_level: 'safe',
        security_score: 90,
      }
    });

    render(<SharePreview />);

    await waitFor(() => {
      expect(screen.getByText('Test Skill')).toBeInTheDocument();
      expect(screen.getByText('A test skill')).toBeInTheDocument();
    });
  });

  it('starts installation and tracks progress', async () => {
     // 1. Setup resolved skill
    mockInvoke.mockImplementation((cmd) => {
      if (cmd === 'resolve_share_link') {
        return Promise.resolve({
            target_id: 'skill-123',
            created_at: Date.now(),
            metadata: {
                name: 'Test Skill',
                url: 'https://github.com/test/skill',
                security_level: 'safe',
            }
        });
      }
      if (cmd === 'import_github_skill_with_progress') {
          return Promise.resolve('task-123');
      }
      return Promise.resolve(null);
    });

    const { rerender } = render(<SharePreview />);

    // Wait for load
    await waitFor(() => expect(screen.getByText('Test Skill')).toBeInTheDocument());

    // 2. Click Install
    fireEvent.click(screen.getByText(/Install Skill/i));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();

    // 3. Confirm Install
    await act(async () => {
        fireEvent.click(screen.getByText('Confirm'));
    });

    expect(mockInvoke).toHaveBeenCalledWith('import_github_skill_with_progress', expect.objectContaining({
        request: expect.objectContaining({
            repoUrl: 'https://github.com/test/skill',
            skipSecurityCheck: false
        })
    }));

    // 4. Simulate task update in store
    mockTasks.push({
        id: 'task-123',
        status: TaskStatus.Running,
        progress: {
            task_id: 'task-123',
            percentage: 50,
            message: 'Scanning security...',
            stage: 'scanning'
        }
    });

    // Force re-render to pick up store change
    rerender(<SharePreview />);

    await waitFor(() => {
         expect(screen.getByTestId('install-progress')).toHaveTextContent('Stage: scanning');
         expect(screen.getByTestId('install-progress')).toHaveTextContent('Progress: 50');
    });

    // Simulate Completion
    mockTasks[0] = {
        id: 'task-123',
        status: TaskStatus.Completed,
        progress: {
            task_id: 'task-123',
            percentage: 100,
            message: 'Done',
            stage: 'completed'
        }
    };

    rerender(<SharePreview />);

    await waitFor(() => {
        expect(screen.getByText(/Installation Successful/i)).toBeInTheDocument();
        expect(mockToast.success).toHaveBeenCalled();
    });
  });
});
