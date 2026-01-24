import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { ImageImportModal } from './ImageImportModal';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock toast
vi.mock('../store/useToastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useImageImport hook
vi.mock('../hooks/useImageImport', () => ({
  useImageImport: vi.fn(),
}));

const { useImageImport } = await import('../hooks/useImageImport');

// Mock i18next
const mockT = (key: string, options?: any) => {
  const defaults: Record<string, string> = {
    importFromImage: '从图片导入 Skill',
    cancel: '取消',
    confirmImport: '确认导入',
    detectingQRCode: '正在识别二维码...',
    qrCodeDetected: '识别成功！',
    importFailed: '导入失败',
    importingSkill: '正在导入 Skill...',
    skillName: '名称：',
    description: '描述：',
    source: '来源：',
  };
  return options?.defaultValue || defaults[key] || key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      language: 'zh',
    },
  }),
  I18nextProvider: ({ children }: any) => children,
}));

// Mock HTMLDialogElement methods
HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

describe('ImageImportModal', () => {
  let queryClient: QueryClient;
  const mockOnClose = vi.fn();

  const mockImageFile = new File([''], 'test-share.png', { type: 'image/png' });

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        mutations: {
          retry: false,
        },
        queries: {
          retry: false,
        },
      },
    });

    vi.clearAllMocks();

    // Default mock for useImageImport
    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: null,
      skillInfo: null,
      error: null,
      isPending: false,
      handleImage: vi.fn(),
      confirmImport: vi.fn(),
      cleanup: vi.fn(),
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={{ language: 'zh' } as any}>
        {children}
      </I18nextProvider>
    </QueryClientProvider>
  );

  it('should render modal when open', () => {
    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    expect(screen.getByText(/从图片导入 Skill/)).toBeInTheDocument();
  });

  it('should not render modal when closed', () => {
    const { container } = render(
      <ImageImportModal isOpen={false} onClose={mockOnClose} imageFile={null} />,
      { wrapper }
    );

    // Modal should not be in DOM when closed
    expect(container.firstChild).toBe(null);
  });

  it('should call handleImage when opened with image file', async () => {
    const mockHandleImage = vi.fn();
    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: null,
      skillInfo: null,
      error: null,
      isPending: true,
      handleImage: mockHandleImage,
      confirmImport: vi.fn(),
      cleanup: vi.fn(),
    });

    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    await waitFor(() => {
      expect(mockHandleImage).toHaveBeenCalledWith(mockImageFile, 'zh');
    });
  });

  it('should show loading state when detecting QR code', () => {
    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: null,
      skillInfo: null,
      error: null,
      isPending: true,
      handleImage: vi.fn(),
      confirmImport: vi.fn(),
      cleanup: vi.fn(),
    });

    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    expect(screen.getByText(/正在识别二维码/)).toBeInTheDocument();
  });

  it('should show error state when parsing fails', () => {
    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: 'blob:error-preview',
      skillInfo: null,
      error: { type: 'no_qrcode_found', message: '未在图片中识别到二维码' },
      isPending: false,
      handleImage: vi.fn(),
      confirmImport: vi.fn(),
      cleanup: vi.fn(),
    });

    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    expect(screen.getByText('导入失败')).toBeInTheDocument();
    expect(screen.getByText('未在图片中识别到二维码')).toBeInTheDocument();
  });

  it('should show success state with skill info', () => {
    const mockSkillInfo = {
      skillId: 'test-skill-123',
      skillName: 'Test Skill',
      sourceUrl: 'https://github.com/test/skill',
      description: 'A test skill for import',
    };

    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: 'blob:test-preview',
      skillInfo: mockSkillInfo,
      error: null,
      isPending: false,
      handleImage: vi.fn(),
      confirmImport: vi.fn(),
      cleanup: vi.fn(),
    });

    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    expect(screen.getByText('识别成功！')).toBeInTheDocument();
    expect(screen.getByText('Test Skill')).toBeInTheDocument();
    expect(screen.getByText('A test skill for import')).toBeInTheDocument();
  });

  it('should show image preview when available', () => {
    const mockSkillInfo = {
      skillId: 'test-skill',
      skillName: 'Test',
      description: 'Test',
    };

    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: 'blob:test-image',
      skillInfo: mockSkillInfo,
      error: null,
      isPending: false,
      handleImage: vi.fn(),
      confirmImport: vi.fn(),
      cleanup: vi.fn(),
    });

    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    const image = screen.getByAltText('Share Card');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', 'blob:test-image');
  });

  it('should call confirmImport when confirm button clicked', async () => {
    const mockConfirmImport = vi.fn();
    const mockSkillInfo = {
      skillId: 'test-skill',
      skillName: 'Test',
      description: 'Test',
    };

    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: null,
      skillInfo: mockSkillInfo,
      error: null,
      isPending: false,
      handleImage: vi.fn(),
      confirmImport: mockConfirmImport,
      cleanup: vi.fn(),
    });

    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    const confirmButton = screen.getByText('确认导入');
    await userEvent.click(confirmButton);

    expect(mockConfirmImport).toHaveBeenCalled();
  });

  it('should show importing state during import', () => {
    const mockSkillInfo = {
      skillId: 'test-skill',
      skillName: 'Test',
      description: 'Test',
    };

    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: null,
      skillInfo: mockSkillInfo,
      error: null,
      isPending: true,
      handleImage: vi.fn(),
      confirmImport: vi.fn(),
      cleanup: vi.fn(),
    });

    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    expect(screen.getByText('正在导入 Skill...')).toBeInTheDocument();
  });

  it('should call cleanup when modal closes', () => {
    const mockCleanup = vi.fn();

    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: null,
      skillInfo: null,
      error: null,
      isPending: false,
      handleImage: vi.fn(),
      confirmImport: vi.fn(),
      cleanup: mockCleanup,
    });

    const { rerender } = render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    // Close modal
    rerender(
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={{ language: 'zh' } as any}>
          <ImageImportModal isOpen={false} onClose={mockOnClose} imageFile={null} />
        </I18nextProvider>
      </QueryClientProvider>
    );

    expect(mockCleanup).toHaveBeenCalled();
  });

  it('should call onClose when cancel button clicked', async () => {
    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: null,
      skillInfo: null,
      error: null,
      isPending: false,
      handleImage: vi.fn(),
      confirmImport: vi.fn(),
      cleanup: vi.fn(),
    });

    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    const cancelButton = screen.getByText('取消');
    await userEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable cancel button during import', () => {
    const mockSkillInfo = {
      skillId: 'test-skill',
      skillName: 'Test',
      description: 'Test',
    };

    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: null,
      skillInfo: mockSkillInfo,
      error: null,
      isPending: true,
      handleImage: vi.fn(),
      confirmImport: vi.fn(),
      cleanup: vi.fn(),
    });

    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    const cancelButton = screen.getByText('取消');
    expect(cancelButton).toBeDisabled();
  });

  it('should not show confirm button when there is no skill info', () => {
    vi.mocked(useImageImport).mockReturnValue({
      previewUrl: null,
      skillInfo: null,
      error: null,
      isPending: false,
      handleImage: vi.fn(),
      confirmImport: vi.fn(),
      cleanup: vi.fn(),
    });

    render(
      <ImageImportModal isOpen={true} onClose={mockOnClose} imageFile={mockImageFile} />,
      { wrapper }
    );

    expect(screen.queryByText('确认导入')).not.toBeInTheDocument();
  });
});
