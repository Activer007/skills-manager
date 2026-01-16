import React from 'react';
import type { SkillScore } from '../../types/scorer';
import { QualityBadge } from './QualityBadge';
import { ScoreRadar } from './ScoreRadar';
import { SuggestionList } from './SuggestionList';
import { FileText, Code, Wrench, Users, Calendar } from 'lucide-react';

interface QualityScoreCardProps {
  score: SkillScore;
  className?: string;
}

export const QualityScoreCard: React.FC<QualityScoreCardProps> = ({ score, className }) => {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`card bg-base-100 shadow-xl ${className || ''}`}>
      <div className="card-body p-6">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="card-title text-2xl mb-1">{score.metadata.skill_name}</h2>
            <div className="text-sm text-base-content/60 flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" /> {score.metadata.author || 'Unknown Author'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {formatDate(score.metadata.analyzed_at)}
              </span>
              {score.metadata.version && (
                <span className="badge badge-sm badge-outline">v{score.metadata.version}</span>
              )}
            </div>
          </div>
          <QualityBadge grade={score.grade} score={score.total_score} size="lg" />
        </div>

        {/* Radar Chart & High Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-base-200/50 rounded-box p-4 flex items-center justify-center">
            <ScoreRadar score={score} />
          </div>
          
          <div className="grid grid-cols-1 gap-4 content-center">
            <div className="stats shadow bg-base-200 w-full">
              <div className="stat p-4">
                <div className="stat-figure text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="stat-title text-xs">Content</div>
                <div className="stat-value text-lg">{score.content_score.total.toFixed(1)} <span className="text-xs text-base-content/40">/ 50</span></div>
                <div className="stat-desc text-xs mt-1">Clarity, Depth, Docs</div>
              </div>
              <div className="stat p-4">
                <div className="stat-figure text-secondary">
                  <Code className="w-6 h-6" />
                </div>
                <div className="stat-title text-xs">Technical</div>
                <div className="stat-value text-lg">{score.technical_score.total.toFixed(1)} <span className="text-xs text-base-content/40">/ 30</span></div>
                <div className="stat-desc text-xs mt-1">Code Quality, Patterns</div>
              </div>
            </div>

            <div className="stats shadow bg-base-200 w-full">
              <div className="stat p-4">
                <div className="stat-figure text-accent">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="stat-title text-xs">Maintenance</div>
                <div className="stat-value text-lg">{score.maintenance_score.total.toFixed(1)} <span className="text-xs text-base-content/40">/ 10</span></div>
                <div className="stat-desc text-xs mt-1">Updates, Compatibility</div>
              </div>
              <div className="stat p-4">
                <div className="stat-figure text-neutral">
                  <Users className="w-6 h-6" />
                </div>
                <div className="stat-title text-xs">UX</div>
                <div className="stat-value text-lg">{score.ux_score.total.toFixed(1)} <span className="text-xs text-base-content/40">/ 10</span></div>
                <div className="stat-desc text-xs mt-1">Ease of Use</div>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"></div>

        {/* Detailed Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
             <h3 className="font-bold text-lg">Detailed Breakdown</h3>
             
             {/* Content */}
             <div className="collapse collapse-arrow bg-base-200">
               <input type="checkbox" /> 
               <div className="collapse-title font-medium flex justify-between">
                 <span>Content Quality</span>
                 <span className="opacity-70">{score.content_score.total.toFixed(1)}/50</span>
               </div>
               <div className="collapse-content text-sm space-y-2">
                 <div className="flex justify-between"><span>Clarity</span> <span>{score.content_score.clarity.total.toFixed(1)}/13</span></div>
                 <div className="flex justify-between"><span>Technical Depth</span> <span>{score.content_score.technical_depth.total.toFixed(1)}/19</span></div>
                 <div className="flex justify-between"><span>Documentation</span> <span>{score.content_score.documentation.total.toFixed(1)}/13</span></div>
                 <div className="flex justify-between"><span>Actionability</span> <span>{score.content_score.actionability.toFixed(1)}/5</span></div>
               </div>
             </div>

             {/* Technical */}
             <div className="collapse collapse-arrow bg-base-200">
               <input type="checkbox" /> 
               <div className="collapse-title font-medium flex justify-between">
                 <span>Technical Implementation</span>
                 <span className="opacity-70">{score.technical_score.total.toFixed(1)}/30</span>
               </div>
               <div className="collapse-content text-sm space-y-2">
                 <div className="flex justify-between"><span>Code Quality</span> <span>{score.technical_score.code_quality.total.toFixed(1)}/15</span></div>
                 <div className="flex justify-between"><span>Pattern Design</span> <span>{score.technical_score.pattern_design.toFixed(1)}/10</span></div>
                 <div className="flex justify-between"><span>Error Handling</span> <span>{score.technical_score.error_handling.toFixed(1)}/5</span></div>
               </div>
             </div>
          </div>

          {/* Suggestions */}
          <div>
            <SuggestionList suggestions={score.suggestions} />
          </div>
        </div>
      </div>
    </div>
  );
};
