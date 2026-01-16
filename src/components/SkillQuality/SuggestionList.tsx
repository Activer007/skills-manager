import React from 'react';
import { Lightbulb, AlertTriangle, Info } from 'lucide-react';

interface SuggestionListProps {
  suggestions: string[];
  className?: string;
}

export const SuggestionList: React.FC<SuggestionListProps> = ({ suggestions, className }) => {
  if (!suggestions || suggestions.length === 0) {
    return (
      <div className={`alert alert-success ${className || ''}`}>
        <Info className="w-5 h-5" />
        <span>Great job! No specific improvements needed.</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className || ''}`}>
      <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
        <Lightbulb className="w-5 h-5 text-warning" />
        Improvement Suggestions
      </h3>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => {
          // Check if suggestion contains point value like "(+5 points)"
          const pointMatch = suggestion.match(/\(\+(\d+)\s*pts?\)/);
          const points = pointMatch ? pointMatch[1] : null;
          const cleanSuggestion = suggestion.replace(/\(\+\d+\s*pts?\)/, '').trim();

          return (
            <div key={index} className="alert bg-base-200 border-none shadow-sm py-3 px-4 flex flex-row items-start text-sm">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
              <div className="flex-1">
                <span>{cleanSuggestion}</span>
              </div>
              {points && (
                <span className="badge badge-sm badge-success gap-1 shrink-0 ml-2">
                  +{points} pts
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
