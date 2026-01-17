import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImportSkillModal } from './ImportSkillModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => options?.defaultValue || key,
    i18n: { language: 'en' },
  }),
}));

const mockMutateAsync = vi.fn();
// We need to be able to change this for different tests, so we might need a more flexible mock
// But for now let's keep it simple and override implementation in tests if needed
const mockUseInstallSkill = {
  mutateAsync: mockMutateAsync,
  isPending: false,
};

vi.mock('../hooks/useSkills', () => ({
  useInstallSkill: () => mockUseInstallSkill,
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
    // Reset mock implementation
    mockMutateAsync.mockImplementation(() => Promise.resolve({}));
    
    // Mock HTMLDialogElement methods to toggle 'open' attribute
    // This is needed because the Modal component likely uses <dialog>
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function() {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function() {
        this.removeAttribute('open');
      };
    }
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
    
    // Check for error message (localized default value)
    expect(screen.getByDisplayValue('invalid-url')).toHaveAttribute('aria-invalid', 'true');
    // Note: The specific error message might be rendered in a way that's hard to target directly without knowing the structure
    // But we know validation failed if mutateAsync wasn't called
  });

  it('calls install on valid URL submission', async () => {
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

    // We can't easily check for the toast or error message since implementation details might vary
    // But checking that it was called is a start. 
    // If the component sets a local error state that is displayed:
    await waitFor(() => {
       // The component sets error state which should be visible
       // We search for the error message part
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
