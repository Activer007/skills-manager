import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import type { ScanRecord } from '../types/security';
import { ShieldAlert, ShieldCheck, ShieldBan } from 'lucide-react';

export default function ScanHistory() {
  const { i18n } = useTranslation();
  const [history, setHistory] = useState<ScanRecord[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await invoke<ScanRecord[]>('get_scan_history', { limit: 50 });
      // Sort by date ascending for chart (API returns desc)
      setHistory(data.reverse());
    } catch (error) {
      console.error('Failed to load scan history:', error);
    }
  };

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

  const chartData = history.map(h => ({
    date: format(new Date(h.scanned_at * 1000), 'MM-dd HH:mm'),
    score: h.score,
    name: h.skill_name
  }));

  // Reverse back for table (newest first)
  const tableData = [...history].reverse();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{i18n.language === 'zh' ? '安全扫描历史' : 'Security Scan History'}</h2>

      {/* Chart */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body">
          <h3 className="card-title text-sm opacity-70 mb-4">
            {i18n.language === 'zh' ? '评分趋势 (最近50次)' : 'Score Trend (Last 50 Scans)'}
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{fontSize: 10}} />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                    contentStyle={{backgroundColor: 'var(--fallback-b1,oklch(var(--b1)/1))'}}
                    labelStyle={{color: 'var(--fallback-bc,oklch(var(--bc)/1))'}}
                />
                <Line type="monotone" dataKey="score" stroke="var(--fallback-p,oklch(var(--p)/1))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-0">
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
                {tableData.map((record) => (
                  <tr key={record.id}>
                    <td className="font-mono text-xs">
                        {format(new Date(record.scanned_at * 1000), 'yyyy-MM-dd HH:mm')}
                    </td>
                    <td className="font-semibold">{record.skill_name}</td>
                    <td>
                        <div className="radial-progress text-primary text-xs" style={{"--value": record.score, "--size": "2rem"} as any}>
                            {record.score}
                        </div>
                    </td>
                    <td className={`font-bold ${getLevelColor(record.level)}`}>{record.level}</td>
                    <td>{record.issues_count}</td>
                    <td>
                        {record.blocked ? (
                            <div className="badge badge-error gap-1">
                                <ShieldBan size={12} /> Blocked
                            </div>
                        ) : record.score >= 70 ? (
                            <div className="badge badge-success gap-1">
                                <ShieldCheck size={12} /> Safe
                            </div>
                        ) : (
                            <div className="badge badge-warning gap-1">
                                <ShieldAlert size={12} /> Risk
                            </div>
                        )}
                    </td>
                  </tr>
                ))}
                {tableData.length === 0 && (
                    <tr>
                        <td colSpan={6} className="text-center py-8 opacity-50">
                            {i18n.language === 'zh' ? '暂无扫描记录' : 'No scan history'}
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
