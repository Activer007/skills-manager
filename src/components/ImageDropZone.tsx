import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '../utils/cn';

interface ImageDropZoneProps {
  onImageDrop: (file: File) => void;
  isDisabled?: boolean;
  className?: string;
}

export const ImageDropZone = ({ onImageDrop, isDisabled = false, className }: ImageDropZoneProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'zh' ? 'zh' : 'en';
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (isDisabled) return;

      const files = Array.from(e.dataTransfer.files);
      const imageFile = files.find((file) => file.type.startsWith('image/'));

      if (imageFile) {
        onImageDrop(imageFile);
      }
    },
    [isDisabled, onImageDrop]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDisabled) {
      setIsDragging(true);
    }
  }, [isDisabled]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        onImageDrop(file);
      }
      // 重置 input 以允许选择同一文件
      e.target.value = '';
    },
    [onImageDrop]
  );

  const handleClick = useCallback(() => {
    if (!isDisabled) {
      fileInputRef.current?.click();
    }
  }, [isDisabled]);

  return (
    <div
      className={cn(
        'relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer',
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-slate-50 dark:hover:bg-base-200/50',
        isDisabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
    >
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isDisabled}
      />

      {/* 内容 */}
      <div className="flex flex-col items-center gap-3">
        {/* 图标 */}
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center transition-colors',
            isDragging ? 'bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-base-200 text-slate-400 dark:text-slate-500'
          )}
        >
          {isDragging ? <Upload size={32} /> : <ImageIcon size={32} />}
        </div>

        {/* 文本 */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('dropImageHere', { defaultValue: language === 'zh' ? '拖拽分享图片到此处' : 'Drop share image here' })}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('orClickToSelect', { defaultValue: language === 'zh' ? '或点击选择文件' : 'or click to select file' })}
          </p>
        </div>

        {/* 提示 */}
        <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <span>📷</span>
          <span>{t('pasteShortcut', { defaultValue: language === 'zh' ? '也可以按 Ctrl+V 粘贴' : 'Or press Ctrl+V to paste' })}</span>
        </div>
      </div>
    </div>
  );
};
