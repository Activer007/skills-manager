import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkillStore } from '../store/useSkillStore';
import { toast } from '../store/useToastStore';
import { Button } from '../components/ui/Button';

/**
 * Marketplace Data Management Page
 *
 * This page provides functionality to:
 * - Import marketplace data from JSON to database
 * - View import statistics
 * - Clear marketplace data
 */
const MarketplaceDataManagement = () => {
  const { i18n } = useTranslation();

  const {
    isImportingMarketplace: isImporting,
    marketplaceImportResult: importResult,
    marketplaceStats: stats,
    importMarketplaceData,
    fetchMarketplaceStats,
    clearMarketplaceData
  } = useSkillStore();

  const handleImport = async () => {
    if (isImporting) return;

    try {
      const result = await importMarketplaceData();

      // Show success message
      if (i18n.language === 'zh') {
        toast.success(`导入完成！成功: ${result.success_count}, 失败: ${result.error_count}`);
      } else {
        toast.success(`Import completed! Success: ${result.success_count}, Failed: ${result.error_count}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (i18n.language === 'zh') {
        toast.error(`导入失败: ${errorMessage}`);
      } else {
        toast.error(`Import failed: ${errorMessage}`);
      }
    }
  };

  const handleClearData = async () => {
    if (i18n.language === 'zh') {
      if (!confirm('确定要清除所有 Marketplace 数据吗？此操作无法撤销。')) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to clear all marketplace data? This action cannot be undone.')) {
        return;
      }
    }

    try {
      await clearMarketplaceData();

      if (i18n.language === 'zh') {
        toast.success('Marketplace 数据已清除');
      } else {
        toast.success('Marketplace data cleared');
      }
    } catch (error) {
      console.error('Failed to clear data:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (i18n.language === 'zh') {
        toast.error(`清除失败: ${errorMessage}`);
      } else {
        toast.error(`Failed to clear: ${errorMessage}`);
      }
    }
  };

  // Load stats on mount
  useEffect(() => {
    fetchMarketplaceStats();
  }, [fetchMarketplaceStats]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {i18n.language === 'zh' ? 'Marketplace 数据管理' : 'Marketplace Data Management'}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {i18n.language === 'zh'
              ? '从 JSON 文件导入 Marketplace 数据到数据库，或管理现有数据。'
              : 'Import marketplace data from JSON file to database, or manage existing data.'}
          </p>
        </div>

        {/* Stats Card */}
        <div className="bg-white dark:bg-base-200 rounded-lg border border-gray-200 dark:border-base-300 p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {i18n.language === 'zh' ? '数据库统计' : 'Database Statistics'}
          </h2>

          {stats ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-base-300 p-4 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {i18n.language === 'zh' ? '总 Skill 数' : 'Total Skills'}
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats.total_skills.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-base-300 p-4 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {i18n.language === 'zh' ? '总 Stars' : 'Total Stars'}
                </div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {stats.total_stars.toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500 dark:text-slate-400">
              {i18n.language === 'zh' ? '暂无数据' : 'No data available'}
            </div>
          )}
        </div>

        {/* Import Result Card */}
        {importResult && (
          <div className="bg-white dark:bg-base-200 rounded-lg border border-gray-200 dark:border-base-300 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              {i18n.language === 'zh' ? '导入结果' : 'Import Result'}
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="text-sm text-green-700 dark:text-green-400">
                  {i18n.language === 'zh' ? '成功' : 'Success'}
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                  {importResult.success_count.toLocaleString()}
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div className="text-sm text-red-700 dark:text-red-400">
                  {i18n.language === 'zh' ? '失败' : 'Failed'}
                </div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">
                  {importResult.error_count.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm text-slate-600 dark:text-slate-400">
              {i18n.language === 'zh'
                ? `总计: ${importResult.total_count.toLocaleString()} 条记录`
                : `Total: ${importResult.total_count.toLocaleString()} records`}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={isImporting}
            isLoading={isImporting}
          >
            {i18n.language === 'zh' ? '导入数据' : 'Import Data'}
          </Button>

          <Button
            variant="outline"
            onClick={fetchMarketplaceStats}
          >
            {i18n.language === 'zh' ? '刷新统计' : 'Refresh Stats'}
          </Button>

          <Button
            variant="ghost"
            onClick={handleClearData}
            className="text-error hover:bg-error/10"
          >
            {i18n.language === 'zh' ? '清除数据' : 'Clear Data'}
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong className="block mb-2">
              {i18n.language === 'zh' ? 'ℹ️ 说明' : 'ℹ️ Information'}
            </strong>
            <ul className="list-disc list-inside space-y-1">
              <li>
                {i18n.language === 'zh'
                  ? '导入操作会从 public/data/marketplace.json 读取数据并存储到数据库。'
                  : 'Import reads data from public/data/marketplace.json and stores it in the database.'}
              </li>
              <li>
                {i18n.language === 'zh'
                  ? '重复导入是安全的，数据库会自动更新现有记录。'
                  : 'Duplicate imports are safe, the database will automatically update existing records.'}
              </li>
              <li>
                {i18n.language === 'zh'
                  ? '导入后，Marketplace 页面将从数据库加载数据，而不是 JSON 文件。'
                  : 'After import, the Marketplace page will load data from the database instead of the JSON file.'}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceDataManagement;
