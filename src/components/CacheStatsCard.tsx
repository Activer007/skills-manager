import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { RefreshCw, Trash2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface CacheStats {
  hit_rate: number;
  hits: number;
  misses: number;
  current_size: number;
  capacity: number;
}

export function CacheStatsCard() {
  const { i18n } = useTranslation();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await invoke<CacheStats>('get_cache_stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch cache stats:', err);
    }
  };

  const handleClear = async () => {
    try {
      setLoading(true);
      await invoke('clear_cache');
      toast.success(i18n.language === 'zh' ? '缓存已清空' : 'Cache cleared');
      await fetchStats();
    } catch {
      toast.error(i18n.language === 'zh' ? '清空缓存失败' : 'Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Poll every 30s (cache stats change infrequently, no need for 5s polling)
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return null;

  return (
    <div className="card bg-base-100 shadow-sm border border-base-200">
      <div className="card-body">
        <h3 className="card-title text-lg flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Database size={20} className="text-primary" />
            {i18n.language === 'zh' ? '系统缓存' : 'System Cache'}
          </div>
          <div className="flex gap-2">
            <button 
              className="btn btn-ghost btn-sm btn-square" 
              onClick={fetchStats}
              title={i18n.language === 'zh' ? '刷新' : 'Refresh'}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button 
              className="btn btn-ghost btn-sm btn-square text-error" 
              onClick={handleClear}
              disabled={loading}
              title={i18n.language === 'zh' ? '清空缓存' : 'Clear Cache'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="stat p-2 place-items-center bg-base-200/50 rounded-lg">
            <div className="stat-title text-xs">{i18n.language === 'zh' ? '命中率' : 'Hit Rate'}</div>
            <div className="stat-value text-xl">{(stats.hit_rate * 100).toFixed(1)}%</div>
            <div className="stat-desc text-xs">Target: &gt;80%</div>
          </div>
          
          <div className="stat p-2 place-items-center bg-base-200/50 rounded-lg">
            <div className="stat-title text-xs">{i18n.language === 'zh' ? '命中次数' : 'Hits'}</div>
            <div className="stat-value text-xl text-success">{stats.hits}</div>
          </div>

          <div className="stat p-2 place-items-center bg-base-200/50 rounded-lg">
            <div className="stat-title text-xs">{i18n.language === 'zh' ? '未命中次数' : 'Misses'}</div>
            <div className="stat-value text-xl text-warning">{stats.misses}</div>
          </div>
          
          <div className="stat p-2 place-items-center bg-base-200/50 rounded-lg">
            <div className="stat-title text-xs">{i18n.language === 'zh' ? '缓存容量' : 'Capacity'}</div>
            <div className="stat-value text-xl">{stats.current_size} <span className="text-sm opacity-50">/ {stats.capacity}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
