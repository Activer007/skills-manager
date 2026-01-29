import { AlertCircle, X, Clock } from 'lucide-react';
import { cn } from '../utils/cn';
import { useTranslation } from 'react-i18next';

interface TokenConfigBannerProps {
  onDismiss: (type: 'never' | 'later') => void;
  className?: string;
}

export const TokenConfigBanner = ({ onDismiss, className }: TokenConfigBannerProps) => {
  const { i18n } = useTranslation();

  return (
    <div
      className={cn(
        'relative bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 shadow-sm',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />

        <div className="flex-1">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
            {i18n.language === 'zh' ? '提示：配置 GitHub Token 可提升体验' : 'Tip: Configure GitHub Token for Better Experience'}
          </h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            {i18n.language === 'zh'
              ? '配置 GitHub Personal Access Token 可获得更高的 API 限额（每小时 5000 次请求），避免频繁限流。您可以在 GitHub 设置中创建 Token 并配置到相应的工具中。'
              : 'Configure GitHub Personal Access Token to get higher API rate limits (5000 requests/hour) and avoid throttling. You can create a token in GitHub settings and configure it in your tools.'}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onDismiss('later')}
              className="btn btn-sm btn-primary"
            >
              <Clock size={14} />
              {i18n.language === 'zh' ? '稍后提醒' : 'Remind Later'}
            </button>

            <button
              onClick={() => onDismiss('never')}
              className="btn btn-sm btn-ghost text-blue-600 dark:text-blue-400"
            >
              {i18n.language === 'zh' ? '不再显示' : "Don't Show Again"}
            </button>
          </div>
        </div>

        <button
          onClick={() => onDismiss('never')}
          className="text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded p-1 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
