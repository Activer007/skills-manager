import { useState } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Info, FileWarning, ChevronDown, ChevronUp } from 'lucide-react';
import type { SecurityReport, SecurityIssue, SecurityLevel } from '../types/security';

const mapSeverity = (severity: SecurityIssue['severity']): 'critical' | 'error' | 'warning' | 'info' => {
  const severityMap: Record<SecurityIssue['severity'], 'critical' | 'error' | 'warning' | 'info'> = {
    'Critical': 'critical',
    'Error': 'error',
    'Warning': 'warning',
    'Info': 'info'
  };
  return severityMap[severity] || 'info';
};

interface SecurityReportCardProps {
  report: SecurityReport | null;
  loading?: boolean;
}

export default function SecurityReportCard({ report, loading }: SecurityReportCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex items-center gap-3">
            <span className="loading loading-spinner loading-md"></span>
            <span>正在执行安全扫描...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    if (score >= 50) return 'text-warning';
    return 'text-error';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'badge-success';
    if (score >= 70) return 'badge-warning';
    if (score >= 50) return 'badge-warning';
    return 'badge-error';
  };

  const getLevelText = (level: SecurityLevel) => {
    const levels = {
      'Safe': '安全',
      'Low': '低风险',
      'Medium': '中等风险',
      'High': '高风险',
      'Critical': '严重风险'
    };
    return levels[level] || level;
  };

  const getSeverityIcon = (severity: SecurityIssue['severity']) => {
    const mappedSeverity = mapSeverity(severity);
    switch (mappedSeverity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-error" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-error" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning" />;
      case 'info':
        return <Info className="w-5 h-5 text-info" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getSeverityText = (severity: SecurityIssue['severity']) => {
    const severities: Record<SecurityIssue['severity'], string> = {
      'Critical': '严重',
      'Error': '错误',
      'Warning': '警告',
      'Info': '信息'
    };
    return severities[severity] || severity;
  };

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
      {/* Summary Header - Always Visible */}
      <div
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-base-200/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h3 className="font-bold text-lg">安全扫描报告</h3>
            <div className="flex items-center gap-3 text-sm">
              <span className={`font-mono font-bold ${getScoreColor(report.score)}`}>
                {report.score} / 100
              </span>
              <span className={`badge ${getScoreBadge(report.score)} badge-sm`}>
                {getLevelText(report.level)}
              </span>
              <span className="text-base-content/50">
                {report.scanned_files.length} 个文件已扫描
              </span>
            </div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm btn-circle">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-base-200 animate-in slide-in-from-top-2 duration-200">
        {/* Blocked Warning */}
        {report.blocked && (
          <div className="alert alert-error mb-4">
            <XCircle className="w-6 h-6" />
            <div>
              <h4 className="font-bold">检测到严重安全风险，已阻止安装！</h4>
              <div className="text-sm mt-2">
                {report.hard_trigger_issues.map((issue, idx) => (
                  <div key={idx} className="mt-1">
                    <strong>{issue}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <FileWarning className="w-5 h-5" />
              安全建议
            </h4>
            <ul className="space-y-1">
              {report.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="opacity-60">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues List */}
        {report.issues.length > 0 && (
          <div className="collapse collapse-arrow bg-base-200">
            <input type="checkbox" />
            <div className="collapse-title font-medium flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              安全问题详情 ({report.issues.length})
            </div>
            <div className="collapse-content">
              <div className="space-y-3 mt-2 max-h-96 overflow-y-auto">
                {report.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className="border border-base-300 rounded-lg p-3 bg-base-100"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {issue.description}
                          </span>
                          <span className={`badge badge-sm ${
                            issue.severity === 'Critical' || issue.severity === 'Error'
                              ? 'badge-error'
                              : issue.severity === 'Warning'
                              ? 'badge-warning'
                              : 'badge-info'
                          }`}>
                            {getSeverityText(issue.severity)}
                          </span>
                        </div>
                        {issue.file_path && (
                          <div className="text-xs text-base-content/60">
                            📄 {issue.file_path}
                            {issue.line_number && `:${issue.line_number}`}
                          </div>
                        )}
                        {issue.code_snippet && (
                          <code className="block bg-base-300 px-2 py-1 rounded mt-2 text-xs overflow-x-auto">
                            {issue.code_snippet}
                          </code>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* No Issues */}
        {report.issues.length === 0 && !report.blocked && (
          <div className="alert alert-success">
            <CheckCircle className="w-6 h-6" />
            <span>未发现明显安全风险，该 Skill 看起来是安全的！</span>
          </div>
        )}
        </div>
      )}
    </div>
  );
}
