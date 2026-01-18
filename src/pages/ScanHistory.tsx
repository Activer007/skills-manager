import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, ShieldCheck, ShieldBan, RefreshCw, Search, Download, History } from 'lucide-react';

import type { ScanRecord } from '../types/security';
import { isSafeScore, isRiskScore } from '../types/security';
import { toast } from '../store/useToastStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { EmptyState } from '../components/ui/EmptyState';
import { CircularProgress } from '../components/ui/Progress';

export default function ScanHistory() {
  const { i18n } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'All' | 'Safe' | 'Risk' | 'Blocked'>('All');

  // Use TanStack Query for automatic refetching and caching
  const { data: history = [], refetch, isRefetching } = useQuery({
    queryKey: ['scan-history'],
    queryFn: async () => {
      // Increase limit to allow more history for analysis
      const data = await invoke<ScanRecord[]>('get_scan_history', { limit: 100 });
      // API returns desc, reverse for chart (ascending)
      return data.reverse();
    },
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Auto-refresh every minute
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Safe': return 'text-success';
      case 'Low': return 'text-info';
      case 'Medium': return 'text-warning';
      case 'High':
      case 'Critical': return 'text-error';
      default: return 'text-base-content';
    }
  };

  const chartData = useMemo(() => history.map(h => ({
    date: format(new Date(h.scanned_at), 'MM-dd HH:mm'),
    score: h.score,
    name: h.skill_name
  })), [history]);

  // Filter logic
  const filteredData = useMemo(() => {
    // Reverse back for table (newest first)
    const reversed = [...history].reverse();
    
    return reversed.filter(record => {
      const matchesSearch = record.skill_name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesLevel = true;
      if (levelFilter === 'Safe') {
        matchesLevel = isSafeScore(record.score) && !record.blocked;
      } else if (levelFilter === 'Risk') {
        matchesLevel = isRiskScore(record.score) && !record.blocked;
      } else if (levelFilter === 'Blocked') {
        matchesLevel = record.blocked;
      }

      return matchesSearch && matchesLevel;
    });
  }, [history, searchTerm, levelFilter]);

  const handleExportCSV = () => {
    try {
      const headers = ['Time', 'Skill', 'Score', 'Level', 'Issues', 'Status'];
      const rows = filteredData.map(r => [
        format(new Date(r.scanned_at), 'yyyy-MM-dd HH:mm:ss'),
        r.skill_name,
        r.score,
        r.level,
        r.issues_count,
        r.blocked ? 'Blocked' : 'Allowed'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scan_history_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(i18n.language === 'zh' ? '导出成功' : 'Export successful');
    } catch (err) {
      console.error('Export failed', err);
      toast.error(i18n.language === 'zh' ? '导出失败' : 'Export failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">{i18n.language === 'zh' ? '安全扫描历史' : 'Security Scan History'}</h2>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredData.length === 0}
          >
            <Download className="w-4 h-4" />
            {i18n.language === 'zh' ? '导出 CSV' : 'Export CSV'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            title={i18n.language === 'zh' ? '刷新' : 'Refresh'}
            isLoading={isRefetching}
          >
            {!isRefetching && <RefreshCw className="w-4 h-4" />}
            {i18n.language === 'zh' ? '刷新' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Chart */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body">
          <h3 className="card-title text-sm opacity-70 mb-4">
            {i18n.language === 'zh' ? '评分趋势 (最近100次)' : 'Score Trend (Last 100 Scans)'}
          </h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{fontSize: 10}} />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                    contentStyle={{backgroundColor: 'var(--fallback-b1,oklch(var(--b1)/1))'}}
                    labelStyle={{color: 'var(--fallback-bc,oklch(var(--bc)/1))'}}
                />
                <Line type="monotone" dataKey="score" stroke="var(--fallback-p,oklch(var(--p)/1))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters & List */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-0">
          {/* Toolbar */}
          <div className="p-4 border-b border-base-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/50" />
              <Input
                type="text"
                className="input-sm pl-9"
                placeholder={i18n.language === 'zh' ? '搜索 Skill...' : 'Search Skill...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label={i18n.language === 'zh' ? '搜索 Skill' : 'Search Skill'}
              />
            </div>

            <div className="w-full sm:w-auto">
              <Tabs value={levelFilter} onValueChange={(value) => setLevelFilter(value as 'All' | 'Safe' | 'Risk' | 'Blocked')}>
                <TabsList variant="pills" className="w-full sm:w-auto">
                  <TabsTrigger value="All">{i18n.language === 'zh' ? '全部' : 'All'}</TabsTrigger>
                  <TabsTrigger value="Safe">Safe (≥70)</TabsTrigger>
                  <TabsTrigger value="Risk">Risk (&lt;70)</TabsTrigger>
                  <TabsTrigger value="Blocked">Blocked</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>{i18n.language === 'zh' ? '时间' : 'Time'}</th>
                  <th>Skill</th>
                  <th>{i18n.language === 'zh' ? '评分' : 'Score'}</th>
                  <th>{i18n.language === 'zh' ? '级别' : 'Level'}</th>
                  <th>{i18n.language === 'zh' ? '问题数' : 'Issues'}</th>
                  <th>{i18n.language === 'zh' ? '状态' : 'Status'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map((record) => (
                  <tr key={record.id}>
                    <td className="font-mono text-xs whitespace-nowrap">
                        {format(new Date(record.scanned_at), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="font-semibold max-w-[200px] truncate" title={record.skill_name}>
                      {record.skill_name}
                    </td>
                    <td>
                        <CircularProgress
                          value={record.score}
                          size="sm"
                          showPercentage={true}
                          colorScheme={record.score >= 70 ? 'green' : record.score >= 50 ? 'orange' : 'red'}
                        />
                    </td>
                    <td className={`font-bold ${getLevelColor(record.level)}`}>{record.level}</td>
                    <td>{record.issues_count}</td>
                    <td>
                        {record.blocked ? (
                            <div className="badge badge-error gap-1 badge-sm">
                                <ShieldBan size={12} /> Blocked
                            </div>
                        ) : isSafeScore(record.score) ? (
                            <div className="badge badge-success gap-1 badge-sm">
                                <ShieldCheck size={12} /> Safe
                            </div>
                        ) : (
                            <div className="badge badge-warning gap-1 badge-sm">
                                <ShieldAlert size={12} /> Risk
                            </div>
                        )}
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                    <tr>
                        <td colSpan={6} className="p-0">
                            <EmptyState
                                variant="minimal"
                                size="sm"
                                icon={searchTerm || levelFilter !== 'All' ? <Search /> : <History />}
                                title={searchTerm || levelFilter !== 'All'
                                  ? (i18n.language === 'zh' ? '未找到匹配的记录' : 'No matching records')
                                  : (i18n.language === 'zh' ? '暂无扫描记录' : 'No scan history')}
                                description={searchTerm || levelFilter !== 'All'
                                  ? (i18n.language === 'zh' ? '尝试调整搜索关键词或筛选条件' : 'Try adjusting your search or filters')
                                  : (i18n.language === 'zh' ? '开始扫描您的 Skills 吧' : 'Start scanning your skills')}
                            />
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
