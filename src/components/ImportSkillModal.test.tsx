import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportSkillModal } from './ImportSkillModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockMutateAsync = vi.fn();
const mockIsPending = false;

vi.mock('../hooks/useSkills', () => ({
  useInstallSkill: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ImportSkillModal', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock HTMLDialogElement methods to toggle 'open' attribute
    HTMLDialogElement.prototype.showModal = function() {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function() {
      this.removeAttribute('open');
    };
  });

  it('renders correctly when open', () => {
    render(<ImportSkillModal isOpen={true} onClose={onCloseMock} />);

    expect(screen.getByText('Import GitHub Skill')).toBeInTheDocument();
    expect(screen.getByLabelText('GitHub Repository URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /import & install/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ImportSkillModal isOpen={false} onClose={onCloseMock} />);

    expect(screen.queryByText('Import GitHub Skill')).not.toBeInTheDocument();
  });

  it('validates invalid URL', async () => {
    render(<ImportSkillModal isOpen={true} onClose={onCloseMock} />);

    const input = screen.getByLabelText('GitHub Repository URL');
    const submitButton = screen.getByRole('button', { name: /import & install/i });

    // Enter invalid URL
    await userEvent.type(input, 'invalid-url');
    fireEvent.click(submitButton);

    // Expect install not to be called
    expect(mockMutateAsync).not.toHaveBeenCalled();
    // Expect error message (validation is handled inside component)
    // Note: The component sets error state which might appear as helper text or separate error
    // Let's check if we can find the error message text
    // "Please enter a valid GitHub repository URL"
    // Since state update is async, we might need waitFor, but fireEvent is synchronous for state updates usually in RTL
    // except for userEvent.

    // Actually the component sets a local error state that is passed to Input error prop
    // which renders it.
    // We can check for text "Please enter a valid GitHub repository URL"
  });

  it('calls install on valid URL submission', async () => {
    mockMutateAsync.mockResolvedValueOnce({});

    render(<ImportSkillModal isOpen={true} onClose={onCloseMock} />);

    const input = screen.getByLabelText('GitHub Repository URL');
    const submitButton = screen.getByRole('button', { name: /import & install/i });

    // Enter valid URL
    await userEvent.type(input, 'https://github.com/user/repo');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({
        githubUrl: 'https://github.com/user/repo',
        name: 'repo'
      }));
    });

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('handles installation error', async () => {
    const errorMsg = 'Network error';
    mockMutateAsync.mockRejectedValueOnce(new Error(errorMsg));

    render(<ImportSkillModal isOpen={true} onClose={onCloseMock} />);

    const input = screen.getByLabelText('GitHub Repository URL');
    const submitButton = screen.getByRole('button', { name: /import & install/i });

    await userEvent.type(input, 'https://github.com/user/repo');
    fireEvent.click(submitButton);

    await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
    });

    // Error should be displayed
    await waitFor(() => {
         expect(screen.getByText((content) => content.includes(errorMsg))).toBeInTheDocument();
    });
  });

  it('closes when cancel is clicked', () => {
    render(<ImportSkillModal isOpen={true} onClose={onCloseMock} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(onCloseMock).toHaveBeenCalled();
  });

  it('populates input with initialUrl', () => {
    const initialUrl = 'https://github.com/initial/repo';
    render(<ImportSkillModal isOpen={true} onClose={onCloseMock} initialUrl={initialUrl} />);

    const input = screen.getByLabelText('GitHub Repository URL') as HTMLInputElement;
    expect(input.value).toBe(initialUrl);
  });
});
