import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ModalDialog, { type ModalDialogProps } from './ModalDialog';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: ({ className }: { className: string }) => <div data-testid="alert-icon" className={className} />,
  CheckCircle: ({ className }: { className: string }) => <div data-testid="check-icon" className={className} />,
  XCircle: ({ className }: { className: string }) => <div data-testid="x-circle-icon" className={className} />,
  Info: ({ className }: { className: string }) => <div data-testid="info-icon" className={className} />,
  Loader2: ({ className }: { className: string }) => <div data-testid="loader-icon" className={className} />,
}));

// Mock react-dom createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

const defaultProps: ModalDialogProps = {
  isOpen: true,
  title: 'Test Modal',
  message: 'Test message',
};

describe('ModalDialog', () => {
  it('returns null when not open', () => {
    const { container } = render(<ModalDialog {...defaultProps} isOpen={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders confirm modal by default', () => {
    render(<ModalDialog {...defaultProps} />);

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });

  it('renders success modal', () => {
    render(<ModalDialog {...defaultProps} type="success" />);

    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('renders error modal', () => {
    render(<ModalDialog {...defaultProps} type="error" />);

    expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
  });

  it('renders info modal', () => {
    render(<ModalDialog {...defaultProps} type="info" />);

    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });

  it('renders destructive confirm modal', () => {
    render(<ModalDialog {...defaultProps} type="confirm" isDestructive={true} />);

    const icon = screen.getByTestId('alert-icon');
    expect(icon).toHaveClass('text-red-500');
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ModalDialog {...defaultProps} onConfirm={onConfirm} />);

    const confirmButton = screen.getByText(/confirm/i);
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ModalDialog {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when backdrop is clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(<ModalDialog {...defaultProps} onCancel={onCancel} />);

    const backdrop = container.querySelector('.bg-black\\/40');
    expect(backdrop).toBeInTheDocument();

    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onCancel).toHaveBeenCalledTimes(1);
    }
  });

  it('does not call onCancel when backdrop is clicked during loading', () => {
    const onCancel = vi.fn();
    const { container } = render(<ModalDialog {...defaultProps} onCancel={onCancel} isLoading={true} />);

    const backdrop = container.querySelector('.bg-black\\/40');

    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onCancel).not.toHaveBeenCalled();
    }
  });

  it('shows loading spinner when isLoading is true', () => {
    const { container } = render(<ModalDialog {...defaultProps} onConfirm={vi.fn()} isLoading={true} />);

    // When loading, button shows spinner with animate-spin class
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('uses custom confirm and cancel text', () => {
    render(
      <ModalDialog
        {...defaultProps}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
        confirmText="Delete"
        cancelText="Keep"
      />
    );

    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('hides cancel button when loading', () => {
    render(
      <ModalDialog
        {...defaultProps}
        type="confirm"
        onCancel={vi.fn()}
        isLoading={true}
      />
    );

    expect(screen.queryByText(/cancel/i)).not.toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <ModalDialog {...defaultProps}>
        <div data-testid="custom-content">Custom content</div>
      </ModalDialog>
    );

    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });

  it('disables confirm button when loading', () => {
    const onConfirm = vi.fn();
    render(<ModalDialog {...defaultProps} onConfirm={onConfirm} isLoading={true} />);

    // When loading, the confirm button is disabled and shows a spinner
    const confirmButton = screen.getByTestId('modal-confirm-button');
    expect(confirmButton).toBeDisabled();
    expect(confirmButton.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('disables cancel button when loading', () => {
    const onCancel = vi.fn();
    render(<ModalDialog {...defaultProps} onCancel={onCancel} isLoading={true} />);

    const cancelButton = screen.queryByText(/cancel/i);
    expect(cancelButton).not.toBeInTheDocument();
  });

  it('applies destructive styling to confirm button', () => {
    render(<ModalDialog {...defaultProps} type="confirm" isDestructive={true} onConfirm={vi.fn()} />);

    const confirmButton = screen.getByTestId('modal-confirm-button');
    expect(confirmButton).toHaveClass('btn-error');
  });

  it('applies normal styling to confirm button when not destructive', () => {
    render(<ModalDialog {...defaultProps} type="confirm" isDestructive={false} onConfirm={vi.fn()} />);

    const confirmButton = screen.getByTestId('modal-confirm-button');
    expect(confirmButton).toHaveClass('btn-primary');
  });

  it('only shows confirm button when onCancel is not provided for confirm type', () => {
    render(<ModalDialog {...defaultProps} type="confirm" onConfirm={vi.fn()} />);

    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    expect(screen.getByText(/confirm/i)).toBeInTheDocument();
  });

  it('shows both buttons for confirm type with onCancel', () => {
    render(
      <ModalDialog
        {...defaultProps}
        type="confirm"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    expect(screen.getByText(/confirm/i)).toBeInTheDocument();
  });
});
