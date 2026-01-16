import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { SkillScore } from '../../types/scorer';
import { QualityBadge } from './QualityBadge';
import { ScoreRadar } from './ScoreRadar';
import { SuggestionList } from './SuggestionList';

interface QualityScoreCardProps {
  score: SkillScore;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

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

export const QualityScoreCard: React.FC<QualityScoreCardProps> = ({ score, isLoading, error, className }) => {
  const { i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (isLoading) {
    return (
      <div className="card bg-base-200 animate-pulse p-4" data-testid="loading-skeleton">
        <div className="h-4 bg-base-300 rounded w-3/4 mb-4"></div>
        <div className="h-32 bg-base-300 rounded mb-4"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error shadow-lg text-sm" data-testid="error-alert">
        <AlertTriangle size={16} />
        <span>{error}</span>
      </div>
    );
  }

  if (!score) return null;

  return (
    <div className={`card bg-base-100 border border-base-200 shadow-sm overflow-hidden ${className || ''}`}>
      {/* Summary Header - Always Visible */}
      <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-base-200/50 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <QualityBadge grade={score.grade} score={score.total_score} size="lg" />
          <div>
            <h3 className="font-bold text-lg">
              {score.metadata.skill_name}
            </h3>
            <div className="text-sm opacity-70 flex items-center gap-2">
              <span className="font-mono font-bold text-primary">{score.total_score.toFixed(1)}</span> / 100
              <span className="text-xs ml-2">v{score.metadata.version}</span>
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

            {/* Left Column: Radar & Scores */}
            <div className="space-y-4">
              <div className="bg-base-200/50 rounded-box p-4 flex items-center justify-center h-64">
                 <ScoreRadar score={score} />
              </div>

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
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
                  {i18n.language === 'zh' ? '技术实现' : 'Technical Implementation'}
                  <div className="badge badge-sm badge-ghost font-mono">30 pts</div>
                </h4>
                <div className="pl-2 border-l-2 border-base-300 space-y-1">
                  <ScoreBar
                    value={score.technical_score.total}
                    max={30}
                    label={i18n.language === 'zh' ? '总分' : 'Total'}
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Suggestions & Metadata */}
            <div className="flex flex-col h-full">
              <div className="bg-base-200/50 rounded-lg p-4 flex-1">
                <SuggestionList suggestions={score.suggestions} />
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
