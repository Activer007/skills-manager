import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { Package, X, Download, CheckCircle, AlertCircle, FolderOpen } from 'lucide-react';
import { Button } from './ui/Button';
import { useExportCollection } from '../hooks/useCollections';
import type { Collection } from '../types/collection';
import { invoke } from '@tauri-apps/api/core';
import type { ExportResult } from '../types/share';

interface ShareCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  collection: Collection;
}

export const ShareCollectionModal = ({
  isOpen,
  onClose,
  collection,
}: ShareCollectionModalProps) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const exportMutation = useExportCollection();
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const handleExport = async () => {
    try {
      const result = await exportMutation.mutateAsync({
        collectionId: collection.id,
      });
      setExportResult(result);
    } catch (error) {
      console.error(error);
    }
  };

  const handleOpenFolder = async () => {
    if (!exportResult?.filePath) return;
    try {
      // Get directory path
      const path = exportResult.filePath;
      const separator = path.includes('\\') ? '\\' : '/';
      const dirPath = path.substring(0, path.lastIndexOf(separator));
      await invoke('open_url', { url: `file://${dirPath}` });
    } catch (error) {
      console.error('Failed to open folder:', error);
    }
  };

  const handleClose = () => {
    setExportResult(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-xl bg-white dark:bg-base-100 shadow-2xl border border-gray-100 dark:border-base-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Package className="w-5 h-5 text-primary" />
                {isZh ? '导出合集包' : 'Export Collection Package'}
              </Dialog.Title>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-base-50 dark:bg-base-200/50 rounded-lg border border-base-200 dark:border-base-300">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">{collection.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {collection.items_count} {isZh ? '个 Skill' : 'Skills'}
              </p>
            </div>

            {exportResult?.success ? (
              <div className="mb-6 p-4 bg-success/10 border border-success/30 rounded-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-success mb-1">
                      {isZh ? '导出成功！' : 'Export Successful!'}
                    </h4>
                    <div className="text-sm text-base-content/70 space-y-1">
                      <p className="truncate" title={exportResult.filePath}>
                        <span className="font-medium">{isZh ? '路径：' : 'Path: '}</span>
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
                      {isZh ? '打开文件夹' : 'Open Folder'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : exportResult?.error || exportMutation.isError ? (
              <div className="mb-6 p-4 bg-error/10 border border-error/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-error mb-1">
                      {isZh ? '导出失败' : 'Export Failed'}
                    </h4>
                    <p className="text-sm text-base-content/70">
                      {exportResult?.error || (exportMutation.error as Error)?.message || (isZh ? '未知错误' : 'Unknown error')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
                {isZh
                  ? '将此合集及其所有 Skills 打包为一个 .zip 文件，方便分享给他人或备份。包含所有 Skill 的内容和配置。'
                  : 'Package this collection and all its skills into a single .zip file for sharing or backup. Includes content and configuration for all skills.'}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={handleClose}>
                {isZh ? '关闭' : 'Close'}
              </Button>
              {!exportResult?.success && (
                <Button
                  variant="primary"
                  onClick={handleExport}
                  disabled={exportMutation.isPending}
                  isLoading={exportMutation.isPending}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isZh ? '开始导出' : 'Start Export'}
                </Button>
              )}
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
