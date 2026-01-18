import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Trash2, RefreshCw, Database } from 'lucide-react';
import { toast } from '../store/useToastStore';
import { useTranslation } from 'react-i18next';

interface CacheStats {
  total_size: number;
  file_count: number;
  skills_count: number;
}

export const CacheStatsCard = () => {
  const { i18n } = useTranslation();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await invoke<CacheStats>('get_cache_stats');
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch cache stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    const confirmed = window.confirm(
      i18n.language === 'zh'
        ? '确定要清空所有缓存吗？这将删除所有已下载的 Skill 文件。'
        : 'Are you sure you want to clear all cache? This will delete all downloaded Skill files.'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      await invoke('clear_cache');
      toast.success(i18n.language === 'zh' ? '缓存已清空' : 'Cache cleared');
      fetchStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast.error(i18n.language === 'zh' ? '清空缓存失败' : 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
               <Database size={20} className="text-primary" />
            </div>
            <div>
               <h3 className="card-title text-base">
                 {i18n.language === 'zh' ? '本地存储' : 'Local Storage'}
               </h3>
               <p className="text-xs text-base-content/60">
                 {i18n.language === 'zh' ? 'Skill 文件缓存统计' : 'Skill files cache statistics'}
               </p>
            </div>
          </div>
          <button 
            className={`btn btn-ghost btn-sm btn-square ${loading ? 'loading' : ''}`}
            onClick={fetchStats}
            title={i18n.language === 'zh' ? '刷新' : 'Refresh'}
          >
            {!loading && <RefreshCw size={16} />}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 my-4">
          <div className="stats shadow-none bg-base-200/50">
            <div className="stat p-3 place-items-center">
              <div className="stat-title text-xs">{i18n.language === 'zh' ? '占用空间' : 'Size'}</div>
              <div className="stat-value text-lg text-primary">{stats ? formatSize(stats.total_size) : '-'}</div>
            </div>
          </div>
          <div className="stats shadow-none bg-base-200/50">
             <div className="stat p-3 place-items-center">
              <div className="stat-title text-xs">{i18n.language === 'zh' ? '文件数' : 'Files'}</div>
              <div className="stat-value text-lg text-secondary">{stats ? stats.file_count : '-'}</div>
            </div>
          </div>
          <div className="stats shadow-none bg-base-200/50">
             <div className="stat p-3 place-items-center">
              <div className="stat-title text-xs">Skills</div>
              <div className="stat-value text-lg text-accent">{stats ? stats.skills_count : '-'}</div>
            </div>
          </div>
        </div>

        <div className="card-actions justify-end">
          <button 
            className="btn btn-sm btn-error btn-outline gap-2"
            onClick={handleClearCache}
            disabled={loading || !stats || stats.total_size === 0}
          >
            <Trash2 size={16} />
            {i18n.language === 'zh' ? '清空缓存' : 'Clear Cache'}
          </button>
        </div>
      </div>
    </div>
  );
};