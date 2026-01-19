import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { Progress } from './ui/Progress';
import { useInstallSkill } from '../hooks/useSkills';
import { toast } from '../store/useToastStore';
import { Download, AlertTriangle } from 'lucide-react';
import type { MarketplaceSkill } from '../types';

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
  const installTimerRef = useRef<number | null>(null);
  const installMutation = useInstallSkill();

  useEffect(() => {
    if (isOpen) {
      setUrl(initialUrl || '');
      setError('');
      setInstallProgress(0);
      setIsInstalling(false);
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
                    ? '请输入 GitHub 仓库链接。支持完整仓库链接或子目录链接。安装前会自动进行安全扫描。'
                    : 'Enter the GitHub repository URL. Full repository URLs or subdirectory links are supported. Security scan will be performed before installation.' })}
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
