import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';
import { useInstallSkill } from '../hooks/useSkills';
import { toast } from '../store/useToastStore';
import { Download, AlertTriangle, ChevronDown, ChevronUp, Image as ImageIcon, Upload } from 'lucide-react';
import type { MarketplaceSkill } from '../types';
import { importSkillFromImage } from '../utils/qrCodeImporter';
import { cn } from '../utils/cn';

interface ImportSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUrl?: string;
}

export const ImportSkillModal = ({ isOpen, onClose, initialUrl }: ImportSkillModalProps) => {
  const { t, i18n } = useTranslation();
  const [url, setUrl] = useState(initialUrl || '');
  const [error, setError] = useState('');
  const [installProgress, setInstallProgress] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showImageDrop, setShowImageDrop] = useState(false);
  const [isParsingImage, setIsParsingImage] = useState(false);
  const [imageError, setImageError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const installTimerRef = useRef<number | null>(null);
  const installMutation = useInstallSkill();

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl || '');
      setError('');
      setInstallProgress(0);
      setIsInstalling(false);
      setShowImageDrop(false);
      setImageError('');
    } else if (installTimerRef.current) {
      window.clearInterval(installTimerRef.current);
      installTimerRef.current = null;
    }
  }, [isOpen, initialUrl]);

  useEffect(() => {
    return () => {
      if (installTimerRef.current) {
        window.clearInterval(installTimerRef.current);
        installTimerRef.current = null;
      }
    };
  }, []);

  const validateUrl = (value: string) => {
    if (!value) return false;
    // Basic GitHub URL validation
    const githubRegex = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\/(tree|blob)\/[\w.-]+(\/.*)?)?$/;
    return githubRegex.test(value);
  };

  const startInstallProgress = () => {
    if (installTimerRef.current) {
      window.clearInterval(installTimerRef.current);
    }
    let current = 0;
    setInstallProgress(0);
    setIsInstalling(true);
    installTimerRef.current = window.setInterval(() => {
      const delta = Math.max(2, Math.round(Math.random() * 8));
      current = Math.min(current + delta, 90);
      setInstallProgress(current);
    }, 320);
  };

  const stopInstallProgress = () => {
    if (installTimerRef.current) {
      window.clearInterval(installTimerRef.current);
      installTimerRef.current = null;
    }
  };

  // 处理图片文件
  const handleImageDrop = async (file: File) => {
    setIsParsingImage(true);
    setImageError('');

    const result = await importSkillFromImage(file, i18n.language === 'zh' ? 'zh' : 'en');

    if (result.success && result.skillInfo) {
      // 优先使用 sourceUrl，回退到 installUrl
      const extractedUrl = result.skillInfo.sourceUrl || result.skillInfo.installUrl;
      if (extractedUrl) {
        setUrl(extractedUrl);
        toast.success(i18n.language === 'zh' ? '成功识别二维码！' : 'QR code detected successfully!');
      } else {
        setImageError(i18n.language === 'zh' ? '二维码中未找到有效的链接' : 'No valid link found in QR code');
      }
    } else {
      setImageError(result.errorMessage || (i18n.language === 'zh' ? '无法识别二维码' : 'Failed to detect QR code'));
    }

    setIsParsingImage(false);
  };

  // 处理文件拖拽
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((file) => file.type.startsWith('image/'));

    if (imageFile) {
      handleImageDrop(imageFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageDrop(file);
    }
    // 重置 input
    e.target.value = '';
  };

  const handleInstall = async () => {
    if (!validateUrl(url)) {
      setError(t('invalidUrl', { defaultValue: i18n.language === 'zh' ? '请输入有效的 GitHub 仓库链接' : 'Please enter a valid GitHub repository URL' }));
      return;
    }

    setError('');

    // Extract name from URL for confirmation message
    const skillName = url.split('/').filter(Boolean).pop()?.replace(/\.git$/, '') || 'Skill';

    // Construct a temporary MarketplaceSkill object
    // Since we're importing directly, we don't have all metadata yet
    const tempSkill: MarketplaceSkill = {
      id: url,
      name: skillName,
      description: 'Imported from GitHub',
      author: 'Unknown',
      authorAvatar: '',
      githubUrl: url,
      stars: 0,
      forks: 0,
      updatedAt: Date.now(),
      hasMarketplace: false,
      path: '',
      branch: 'main', // Default, backend handles actual branch detection
      isMcp: false
    };

    try {
      startInstallProgress();
      await installMutation.mutateAsync(tempSkill);
      setInstallProgress(100);
      toast.success(i18n.language === 'zh' ? `${skillName} 安装成功！` : `${skillName} installed successfully!`);
      onClose();
      setUrl('');
    } catch (err: unknown) {
      console.error('Import failed:', err);
      // Error is handled in the mutation or UI, but we can set local error state if needed
      // The hook might throw, so catch it here to prevent crash
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Check if it was blocked by security scan (usually returns specific message)
      if (errorMessage.includes('Security check blocked')) {
        setError(i18n.language === 'zh' ? '安全检查阻止了安装：发现高风险代码' : 'Installation blocked by security check: High risk patterns detected');
      } else {
        setError(i18n.language === 'zh' ? `安装失败: ${errorMessage}` : `Installation failed: ${errorMessage}`);
      }
    } finally {
      stopInstallProgress();
      window.setTimeout(() => {
        setIsInstalling(false);
        setInstallProgress(0);
      }, 300);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('importGithubSkill', { defaultValue: i18n.language === 'zh' ? '导入 GitHub Skill' : 'Import GitHub Skill' })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={installMutation.isPending || isInstalling}>
            {t('cancel', { defaultValue: i18n.language === 'zh' ? '取消' : 'Cancel' })}
          </Button>
          <Button
            variant="primary"
            onClick={handleInstall}
            isLoading={installMutation.isPending}
            disabled={!url || !!error || isInstalling}
          >
            <Download size={16} className="mr-2" />
            {t('importAndInstall', { defaultValue: i18n.language === 'zh' ? '导入并安装' : 'Import & Install' })}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="text-blue-500 shrink-0 mt-0.5" size={18} />
            <div className="text-sm text-blue-700 dark:text-blue-300">
                {t('githubImportNotice', { defaultValue: i18n.language === 'zh'
                    ? '请输入 GitHub 仓库链接或拖拽包含二维码的分享图片。安装前会自动进行安全扫描。'
                    : 'Enter the GitHub repository URL or drag & drop an image with QR code. Security scan will be performed before installation.' })}
            </div>
        </div>

        <Input
          id="github-url-input"
          label={t('githubRepoUrl', { defaultValue: i18n.language === 'zh' ? 'GitHub 仓库链接' : 'GitHub Repository URL' })}
          placeholder="https://github.com/username/repo/tree/main/path/to/skill"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError('');
          }}
          error={error}
          disabled={installMutation.isPending || isInstalling}
          autoFocus
        />

        {/* 图片导入区域 */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowImageDrop(!showImageDrop)}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
          >
            {showImageDrop ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span className="font-medium">
              {i18n.language === 'zh' ? '或从分享图片导入' : 'Or import from share image'}
            </span>
            <span className="text-xs">📷</span>
          </button>

          {showImageDrop && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={cn(
                'relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer',
                'border-slate-300 dark:border-slate-600 hover:border-primary hover:bg-slate-50 dark:hover:bg-base-200/50',
                isParsingImage && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isParsingImage}
              />

              {!isParsingImage ? (
                <>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-base-200 flex items-center justify-center text-slate-400 dark:text-slate-500">
                      <ImageIcon size={24} />
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {i18n.language === 'zh' ? '拖拽分享图片到此处' : 'Drop share image here'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {i18n.language === 'zh' ? '或点击选择文件' : 'or click to select file'}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2"
                    >
                      <Upload size={14} className="mr-2" />
                      {i18n.language === 'zh' ? '选择图片' : 'Select Image'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {i18n.language === 'zh' ? '正在识别二维码...' : 'Detecting QR code...'}
                  </p>
                </div>
              )}

              {imageError && (
                <div className="mt-3 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
                  {imageError}
                </div>
              )}
            </div>
          )}
        </div>

        {isInstalling && (
          <div className="rounded-lg border border-slate-200 dark:border-base-300 bg-slate-50 dark:bg-base-200/40 p-4 space-y-2">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {i18n.language === 'zh' ? '正在导入并安装…' : 'Importing and installing…'}
            </div>
            <Progress
              value={installProgress}
              showPercentage
              size="sm"
              colorScheme="blue"
              label={i18n.language === 'zh' ? '导入进度' : 'Import progress'}
            />
            <p className="text-xs text-slate-500">
              {i18n.language === 'zh'
                ? '进度为模拟值，完成后会自动刷新'
                : 'Progress is simulated and will complete automatically.'}
            </p>
          </div>
        )}

        <div className="text-xs text-slate-400">
            {t('example', { defaultValue: i18n.language === 'zh' ? '示例:' : 'Example:' })} <br/>
            <code className="bg-slate-100 dark:bg-base-200 px-1 py-0.5 rounded">https://github.com/example/skills/tree/main/my-skill</code>
        </div>
      </div>
    </Modal>
  );
};
