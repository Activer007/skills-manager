import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Package, Download, FolderOpen, Loader2, CheckCircle, AlertCircle, FileArchive } from 'lucide-react';
import type { SharePanelProps, ExportResult, ExportStatus } from '../../types/share';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { toast } from '../../store/useToastStore';

/**
 * 格式化文件大小
 */
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * 包导出面板
 */
export const SharePackagePanel: React.FC<SharePanelProps> = ({
  skill,
  locale,
}) => {
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const handleExport = async () => {
    setExportStatus('exporting');
    setExportResult(null);

    try {
      const result = await invoke<{
        success: boolean;
        file_path?: string;
        file_name?: string;
        file_size?: number;
        error?: string;
      }>('export_skill_package', {
        request: {
          skillPath: skill.localPath,
        }
      });

      const exportRes: ExportResult = {
        success: result.success,
        filePath: result.file_path,
        fileName: result.file_name,
        fileSize: result.file_size,
        error: result.error,
      };

      setExportResult(exportRes);
      setExportStatus(result.success ? 'success' : 'error');

      if (result.success) {
        toast.success(
          locale === 'zh'
            ? `已导出到 ${result.file_name}`
            : `Exported to ${result.file_name}`
        );
      } else {
        toast.error(result.error || (locale === 'zh' ? '导出失败' : 'Export failed'));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setExportResult({
        success: false,
        error: errorMsg,
      });
      setExportStatus('error');
      toast.error(errorMsg);
    }
  };

  const handleOpenFolder = async () => {
    if (!exportResult?.filePath) return;

    try {
      // 获取目录路径
      const dirPath = exportResult.filePath.substring(0, exportResult.filePath.lastIndexOf('/'));
      await invoke('open_url', { url: `file://${dirPath}` });
    } catch (error) {
      console.error('Failed to open folder:', error);
      toast.error(locale === 'zh' ? '无法打开文件夹' : 'Failed to open folder');
    }
  };

  return (
    <div className="border border-base-300 dark:border-base-600 rounded-lg p-4" data-testid="share-package-panel">
      {/* 说明 */}
      <div className="flex items-start gap-3 mb-4 p-3 bg-base-200 dark:bg-base-700 rounded-lg">
        <Package className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium mb-1">
            {locale === 'zh' ? '导出 Skill 包' : 'Export Skill Package'}
          </h4>
          <p className="text-sm text-base-content/70">
            {locale === 'zh'
              ? '将 Skill 打包为 .zip 文件，可用于离线分享或备份。包含 Skill 内容和元数据。'
              : 'Package the Skill as a .zip file for offline sharing or backup. Includes Skill content and metadata.'}
          </p>
        </div>
      </div>

      {/* Skill 信息 */}
      <div className="mb-4 p-3 border border-base-300 dark:border-base-600 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <FileArchive className="w-4 h-4 text-base-content/50" />
          <span className="font-medium">{skill.name}</span>
        </div>
        <p className="text-sm text-base-content/60 truncate">{skill.localPath}</p>
      </div>

      {/* 导出状态 */}
      {exportStatus === 'exporting' && (
        <div className="flex items-center justify-center gap-3 p-6 bg-base-200 dark:bg-base-700 rounded-lg">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm">
            {locale === 'zh' ? '正在导出...' : 'Exporting...'}
          </span>
        </div>
      )}

      {exportStatus === 'success' && exportResult && (
        <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-success mb-1">
                {locale === 'zh' ? '导出成功！' : 'Export Successful!'}
              </h4>
              <div className="text-sm text-base-content/70 space-y-1">
                <p>
                  <span className="font-medium">{locale === 'zh' ? '文件名：' : 'Filename: '}</span>
                  {exportResult.fileName}
                </p>
                {exportResult.fileSize && (
                  <p>
                    <span className="font-medium">{locale === 'zh' ? '大小：' : 'Size: '}</span>
                    {formatFileSize(exportResult.fileSize)}
                  </p>
                )}
                <p className="truncate">
                  <span className="font-medium">{locale === 'zh' ? '路径：' : 'Path: '}</span>
                  {exportResult.filePath}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleOpenFolder}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                {locale === 'zh' ? '打开文件夹' : 'Open Folder'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {exportStatus === 'error' && exportResult && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-error mb-1">
                {locale === 'zh' ? '导出失败' : 'Export Failed'}
              </h4>
              <p className="text-sm text-base-content/70">
                {exportResult.error || (locale === 'zh' ? '未知错误' : 'Unknown error')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {exportStatus !== 'exporting' && (
        <div className="flex justify-end mt-4">
          <Button
            onClick={handleExport}
            disabled={exportStatus === 'exporting'}
            data-testid="export-package"
          >
            <Download className="w-4 h-4 mr-2" />
            {exportStatus === 'success'
              ? (locale === 'zh' ? '重新导出' : 'Export Again')
              : (locale === 'zh' ? '导出包' : 'Export Package')}
          </Button>
        </div>
      )}

      {/* 提示信息 */}
      <div className="mt-4 text-xs text-base-content/50">
        <p>
          {locale === 'zh'
            ? '提示：导出的 .zip 文件可以通过拖拽到 Skill Master 窗口导入。'
            : 'Tip: The exported .zip file can be imported by dragging it to the Skill Master window.'}
        </p>
      </div>
    </div>
  );
};

export default SharePackagePanel;
