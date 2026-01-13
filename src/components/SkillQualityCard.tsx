import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { SkillScore } from '../types/scorer';

interface SkillQualityCardProps {
  score: SkillScore;
  isLoading?: boolean;
  error?: string | null;
}

const GradeBadge = ({ grade }: { grade: string }) => {
  let colorClass = 'badge-ghost';
  if (grade === 'S') colorClass = 'badge-primary';
  else if (grade === 'A') colorClass = 'badge-success';
  else if (grade === 'B') colorClass = 'badge-info';
  else if (grade === 'C') colorClass = 'badge-warning';
  else if (grade === 'D') colorClass = 'badge-error';

  return (
    <div className={`badge ${colorClass} badge-lg text-lg font-bold w-12 h-12 rounded-full`}>
      {grade}
    </div>
  );
};

const ScoreBar = ({ value, max, label }: { value: number; max: number; label: string }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  let progressColor = 'progress-primary';
  if (percentage < 60) progressColor = 'progress-error';
  else if (percentage < 80) progressColor = 'progress-warning';
  else if (percentage >= 80) progressColor = 'progress-success';

  return (
    <div className="w-full mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(1)} / {max}</span>
      </div>
      <progress
        className={`progress ${progressColor} w-full h-2 bg-base-300`}
        value={value}
        max={max}
      ></progress>
    </div>
  );
};

const SkillQualityCard: React.FC<SkillQualityCardProps> = ({ score, isLoading, error }) => {
  const { i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="card bg-base-200 animate-pulse p-4">
        <div className="h-4 bg-base-300 rounded w-3/4 mb-4"></div>
        <div className="h-32 bg-base-300 rounded mb-4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error shadow-lg text-sm">
        <AlertTriangle size={16} />
        <span>{error}</span>
      </div>
    );
  }

  if (!score) return null;

  return (
    <div className="card bg-base-100 border border-base-200 shadow-sm overflow-hidden">
      {/* Summary Header - Always Visible */}
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-base-200/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <GradeBadge grade={score.grade} />
          <div>
            <h3 className="font-bold text-lg">
              {i18n.language === 'zh' ? '质量评分' : 'Quality Score'}
            </h3>
            <div className="text-sm opacity-70 flex items-center gap-2">
              <span className="font-mono font-bold text-primary">{score.total_score.toFixed(1)}</span> / 100
              <span className="text-xs ml-2">• v{score.metadata.analyzer_version}</span>
            </div>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm btn-circle">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-base-200 pt-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Left Column: Scores */}
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                  {i18n.language === 'zh' ? '内容质量' : 'Content Quality'}
                  <div className="badge badge-sm badge-ghost font-mono">50 pts</div>
                </h4>
                <div className="pl-2 border-l-2 border-base-300 space-y-1">
                  <ScoreBar
                    value={score.content_score.total}
                    max={50}
                    label={i18n.language === 'zh' ? '总分' : 'Total'}
                  />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs opacity-70 mt-1">
                    <div className="flex justify-between">
                      <span>{i18n.language === 'zh' ? '清晰度' : 'Clarity'}</span>
                      <span>{score.content_score.clarity.total.toFixed(1)}/13</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{i18n.language === 'zh' ? '技术深度' : 'Tech Depth'}</span>
                      <span>{score.content_score.technical_depth.total.toFixed(1)}/19</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{i18n.language === 'zh' ? '文档' : 'Docs'}</span>
                      <span>{score.content_score.documentation.total.toFixed(1)}/13</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{i18n.language === 'zh' ? '可操作性' : 'Actionable'}</span>
                      <span>{score.content_score.actionability.toFixed(1)}/5</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                  {i18n.language === 'zh' ? '技术实现' : 'Technical'}
                  <div className="badge badge-sm badge-ghost font-mono">30 pts</div>
                </h4>
                <div className="pl-2 border-l-2 border-base-300 space-y-1">
                  <ScoreBar
                    value={score.technical_score.total}
                    max={30}
                    label={i18n.language === 'zh' ? '总分' : 'Total'}
                  />
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs opacity-70 mt-1">
                    <div className="flex justify-between">
                      <span>{i18n.language === 'zh' ? '代码质量' : 'Code Quality'}</span>
                      <span>{score.technical_score.code_quality.total.toFixed(1)}/15</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{i18n.language === 'zh' ? '模式设计' : 'Patterns'}</span>
                      <span>{score.technical_score.pattern_design.toFixed(1)}/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{i18n.language === 'zh' ? '错误处理' : 'Error Handling'}</span>
                      <span>{score.technical_score.error_handling.toFixed(1)}/5</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    {i18n.language === 'zh' ? '维护性' : 'Maintenance'}
                    <div className="badge badge-sm badge-ghost font-mono">10 pts</div>
                  </h4>
                  <ScoreBar
                    value={score.maintenance_score.total}
                    max={10}
                    label=""
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                    {i18n.language === 'zh' ? '用户体验' : 'UX'}
                    <div className="badge badge-sm badge-ghost font-mono">10 pts</div>
                  </h4>
                  <ScoreBar
                    value={score.ux_score.total}
                    max={10}
                    label=""
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Suggestions & Metadata */}
            <div className="flex flex-col h-full">
              <div className="bg-base-200/50 rounded-lg p-4 flex-1">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                  <Info size={16} />
                  {i18n.language === 'zh' ? '改进建议' : 'Suggestions'}
                </h4>

                {score.suggestions.length > 0 ? (
                  <ul className="space-y-2">
                    {score.suggestions.slice(0, 5).map((suggestion, idx) => (
                      <li key={idx} className="text-xs flex gap-2 items-start">
                        <span className="text-warning mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                    {score.suggestions.length > 5 && (
                      <li className="text-xs text-base-content/50 italic pt-1">
                        {i18n.language === 'zh'
                          ? `还有 ${score.suggestions.length - 5} 条建议...`
                          : `And ${score.suggestions.length - 5} more suggestions...`}
                      </li>
                    )}
                  </ul>
                ) : (
                  <div className="flex items-center gap-2 text-success text-sm py-4">
                    <CheckCircle size={20} />
                    <span>{i18n.language === 'zh' ? '暂无改进建议，做得很好！' : 'No suggestions, great job!'}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-base-content/40 flex justify-between items-end">
                <div>
                  <div>Analyzer v{score.metadata.analyzer_version}</div>
                  <div>{new Date(score.metadata.analyzed_at).toLocaleString()}</div>
                </div>
                {score.metadata.author && <div>By {score.metadata.author}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkillQualityCard;
