import { useTranslation } from 'react-i18next';
import { Loader2, XCircle, CheckCircle } from 'lucide-react';
import { Progress } from './ui/Progress';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';

export type InstallStage = 'preparing' | 'downloading' | 'scanning' | 'installing' | 'completed' | 'error';

interface InstallProgressProps {
  stage: InstallStage;
  progress: number; // 0-100
  error?: string;
  onCancel?: () => void;
  onDone?: () => void;
  skillName: string;
}

export const InstallProgress = ({
  stage,
  progress,
  error,
  onCancel,
  onDone,
  skillName,
}: InstallProgressProps) => {
  const { i18n } = useTranslation();

  const getStageLabel = (stage: InstallStage) => {
    switch (stage) {
      case 'preparing':
        return i18n.language === 'zh' ? '准备中...' : 'Preparing...';
      case 'downloading':
        return i18n.language === 'zh' ? '下载中...' : 'Downloading...';
      case 'scanning':
        return i18n.language === 'zh' ? '安全扫描中...' : 'Security scanning...';
      case 'installing':
        return i18n.language === 'zh' ? '安装中...' : 'Installing...';
      case 'completed':
        return i18n.language === 'zh' ? '安装完成' : 'Installation completed';
      case 'error':
        return i18n.language === 'zh' ? '安装失败' : 'Installation failed';
      default:
        return '';
    }
  };

  const isCompleted = stage === 'completed';
  const isError = stage === 'error';

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-base-100 rounded-xl shadow-lg border border-gray-100 dark:border-base-300">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-50 dark:bg-base-200 flex items-center justify-center">
          {isCompleted ? (
            <CheckCircle className="w-8 h-8 text-success animate-in zoom-in duration-300" />
          ) : isError ? (
            <XCircle className="w-8 h-8 text-error animate-in zoom-in duration-300" />
          ) : (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {isCompleted
            ? (i18n.language === 'zh' ? '安装成功' : 'Installed Successfully')
            : isError
            ? (i18n.language === 'zh' ? '安装失败' : 'Installation Failed')
            : (i18n.language === 'zh' ? '正在安装' : 'Installing') + ` ${skillName}`
          }
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {error || getStageLabel(stage)}
        </p>
      </div>

      {!isCompleted && !isError && (
        <div className="mb-6 space-y-2">
          <Progress value={progress} size="md" showPercentage />
          <div className="flex justify-between text-xs text-slate-400">
            <span className={cn(progress >= 20 && "text-primary font-medium")}>
              {i18n.language === 'zh' ? '下载' : 'Download'}
            </span>
            <span className={cn(progress >= 50 && "text-primary font-medium")}>
              {i18n.language === 'zh' ? '扫描' : 'Scan'}
            </span>
            <span className={cn(progress >= 80 && "text-primary font-medium")}>
              {i18n.language === 'zh' ? '安装' : 'Install'}
            </span>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        {isCompleted ? (
          <Button variant="primary" onClick={onDone} className="min-w-[120px]">
            {i18n.language === 'zh' ? '完成' : 'Done'}
          </Button>
        ) : isError ? (
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>
              {i18n.language === 'zh' ? '关闭' : 'Close'}
            </Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              {i18n.language === 'zh' ? '重试' : 'Retry'}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            {i18n.language === 'zh' ? '取消' : 'Cancel'}
          </Button>
        )}
      </div>
    </div>
  );
};
