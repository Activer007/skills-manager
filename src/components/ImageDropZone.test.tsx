import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { ImageDropZone } from './ImageDropZone';

// Mock i18next
const mockT = (key: string, options?: any) => {
  const defaults: Record<string, string> = {
    dropImageHere: '拖拽分享图片到此处',
    orClickToSelect: '或点击选择文件',
    pasteShortcut: '也可以按 Ctrl+V 粘贴',
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

describe('ImageDropZone', () => {
  const mockOnImageDrop = vi.fn();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={{ language: 'zh' } as any}>
      {children}
    </I18nextProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render drop zone with all elements', () => {
    const { container } = render(<ImageDropZone onImageDrop={mockOnImageDrop} />, { wrapper });

    // Check for text content
    expect(screen.getByText(/拖拽分享图片到此处/)).toBeInTheDocument();
    expect(screen.getByText(/或点击选择文件/)).toBeInTheDocument();
    expect(screen.getByText(/也可以按 Ctrl\+V 粘贴/)).toBeInTheDocument();

    // Check for drop zone div
    const dropZone = container.querySelector('.border-dashed');
    expect(dropZone).toBeInTheDocument();
  });

  it('should handle image file drop', () => {
    const { container } = render(<ImageDropZone onImageDrop={mockOnImageDrop} />, { wrapper });

    const dropZone = container.querySelector('.border-dashed') as HTMLElement;

    const imageFile = new File([''], 'test.png', { type: 'image/png' });
    const otherFile = new File([''], 'test.txt', { type: 'text/plain' });

    // Create a mock drop event
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as any;
    Object.assign(dropEvent, {
      dataTransfer: {
        files: [imageFile, otherFile],
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    fireEvent(dropZone, dropEvent);

    expect(mockOnImageDrop).toHaveBeenCalledWith(imageFile);
    expect(mockOnImageDrop).toHaveBeenCalledTimes(1);
  });

  it('should not handle non-image file drop', () => {
    const { container } = render(<ImageDropZone onImageDrop={mockOnImageDrop} />, { wrapper });

    const dropZone = container.querySelector('.border-dashed') as HTMLElement;

    const textFile = new File([''], 'test.txt', { type: 'text/plain' });

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as any;
    Object.assign(dropEvent, {
      dataTransfer: {
        files: [textFile],
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    fireEvent(dropZone, dropEvent);

    expect(mockOnImageDrop).not.toHaveBeenCalled();
  });

  it('should handle drag over', () => {
    const { container } = render(<ImageDropZone onImageDrop={mockOnImageDrop} />, { wrapper });

    const dropZone = container.querySelector('.border-dashed') as HTMLElement;

    const dragOverEvent = new Event('dragover', { bubbles: true, cancelable: true }) as any;
    Object.assign(dragOverEvent, {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    fireEvent(dropZone, dragOverEvent);

    expect(dragOverEvent.preventDefault).toHaveBeenCalled();
    expect(dragOverEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should handle drag leave', () => {
    const { container } = render(<ImageDropZone onImageDrop={mockOnImageDrop} />, { wrapper });

    const dropZone = container.querySelector('.border-dashed') as HTMLElement;

    const dragLeaveEvent = new Event('dragleave', { bubbles: true, cancelable: true }) as any;
    Object.assign(dragLeaveEvent, {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    fireEvent(dropZone, dragLeaveEvent);

    expect(dragLeaveEvent.preventDefault).toHaveBeenCalled();
    expect(dragLeaveEvent.stopPropagation).toHaveBeenCalled();
  });

  it('should handle click to select file', () => {
    const { container } = render(<ImageDropZone onImageDrop={mockOnImageDrop} />, { wrapper });

    const dropZone = container.querySelector('.border-dashed') as HTMLElement;

    // Find the hidden file input
    const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveClass('hidden');

    const imageFile = new File([''], 'clicked.png', { type: 'image/png' });

    // Simulate file selection
    fireEvent.change(fileInput, {
      target: { files: [imageFile] },
    });

    expect(mockOnImageDrop).toHaveBeenCalledWith(imageFile);
  });

  it('should be disabled when isDisabled is true', () => {
    const { container } = render(<ImageDropZone onImageDrop={mockOnImageDrop} isDisabled />, { wrapper });

    const dropZone = container.querySelector('.border-dashed') as HTMLElement;

    expect(dropZone).toHaveClass('opacity-50', 'cursor-not-allowed');

    const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeDisabled();
  });

  it('should not handle drop when disabled', () => {
    const { container } = render(<ImageDropZone onImageDrop={mockOnImageDrop} isDisabled />, { wrapper });

    const dropZone = container.querySelector('.border-dashed') as HTMLElement;

    const imageFile = new File([''], 'test.png', { type: 'image/png' });

    const dropEvent = new Event('drop', { bubbles: true, cancelable: true }) as any;
    Object.assign(dropEvent, {
      dataTransfer: {
        files: [imageFile],
      },
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    });

    fireEvent(dropZone, dropEvent);

    expect(mockOnImageDrop).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <ImageDropZone onImageDrop={mockOnImageDrop} className="custom-class" />,
      { wrapper }
    );

    const dropZone = container.querySelector('.custom-class');
    expect(dropZone).toBeInTheDocument();
  });

  it('should reset file input after selection', () => {
    const { container } = render(<ImageDropZone onImageDrop={mockOnImageDrop} />, { wrapper });

    const dropZone = container.querySelector('.border-dashed') as HTMLElement;
    const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;

    const imageFile = new File([''], 'test.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [imageFile] } });

    expect(fileInput.value).toBe('');
  });
});
