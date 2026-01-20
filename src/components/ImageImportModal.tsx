import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Loader2, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useImageImport } from '../hooks/useImageImport';

interface ImageImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
}

export const ImageImportModal = ({ isOpen, onClose, imageFile }: ImageImportModalProps) => {
  const { t, i18n } = useTranslation();
  const language = i18n.language === 'zh' ? 'zh' : 'en';

  const { previewUrl, skillInfo, error, isPending, handleImage, confirmImport, cleanup } =
    useImageImport({
      onSuccess: () => {
        onClose();
      },
    });

  // Modal 打开时自动解析图片
  useEffect(() => {
    if (isOpen && imageFile) {
      handleImage(imageFile, language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, imageFile]);

  // Modal 关闭时清理资源
  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('importFromImage', { defaultValue: language === 'zh' ? '从图片导入 Skill' : 'Import Skill from Image' })}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            {t('cancel', { defaultValue: language === 'zh' ? '取消' : 'Cancel' })}
          </Button>
          {skillInfo && (
            <Button variant="primary" onClick={confirmImport} disabled={isPending} isLoading={isPending}>
              <Download size={16} className="mr-2" />
              {t('confirmImport', { defaultValue: language === 'zh' ? '确认导入' : 'Confirm Import' })}
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        {/* 解析中状态 */}
        {isPending && !skillInfo && !error && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('detectingQRCode', { defaultValue: language === 'zh' ? '正在识别二维码...' : 'Detecting QR code...' })}
            </p>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {t('importFailed', { defaultValue: language === 'zh' ? '导入失败' : 'Import Failed' })}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error.message}</p>
            </div>
          </div>
        )}

        {/* 成功状态 */}
        {skillInfo && !error && (
          <>
            {/* 图片预览 */}
            {previewUrl && (
              <div className="flex justify-center">
                <img
                  src={previewUrl}
                  alt="Share Card"
                  className="max-w-full h-auto rounded-lg shadow-md border border-slate-200 dark:border-base-300"
                  style={{ maxHeight: '200px' }}
                />
              </div>
            )}

            {/* Skill 信息卡片 */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="text-green-500 shrink-0 mt-0.5" size={20} />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  {t('qrCodeDetected', { defaultValue: language === 'zh' ? '识别成功！' : 'QR Code Detected!' })}
                </p>
                <div className="space-y-1 text-sm text-green-700 dark:text-green-400">
                  <p>
                    <span className="font-medium">{t('skillName', { defaultValue: language === 'zh' ? '名称：' : 'Name: ' })}</span>
                    {skillInfo.skillName}
                  </p>
                  <p>
                    <span className="font-medium">{t('description', { defaultValue: language === 'zh' ? '描述：' : 'Description: ' })}</span>
                    {skillInfo.description}
                  </p>
                  {(skillInfo.sourceUrl || skillInfo.installUrl) && (
                    <p className="break-all">
                      <span className="font-medium">{t('source', { defaultValue: language === 'zh' ? '来源：' : 'Source: ' })}</span>
                      {skillInfo.sourceUrl || skillInfo.installUrl}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 导入中状态 */}
            {isPending && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="animate-spin text-primary" size={20} />
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('importingSkill', { defaultValue: language === 'zh' ? '正在导入 Skill...' : 'Importing Skill...' })}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
