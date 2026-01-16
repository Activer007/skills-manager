import React from 'react';

interface QualityBadgeProps {
  grade: string;
  score: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const QualityBadge: React.FC<QualityBadgeProps> = ({ 
  grade, 
  score, 
  className,
  size = 'md' 
}) => {
  const getColorClass = (g: string) => {
    switch (g.toUpperCase()) {
      case 'S': return 'badge-success text-success-content';
      case 'A': return 'badge-info text-info-content';
      case 'B': return 'badge-warning text-warning-content';
      case 'C': return 'badge-error text-error-content';
      case 'D': return 'badge-neutral text-neutral-content';
      default: return 'badge-ghost';
    }
  };

  const sizeClass = {
    'sm': 'badge-sm text-xs',
    'md': 'badge-md',
    'lg': 'badge-lg text-lg px-4 py-3',
  }[size];

  return (
    <div 
      className={`badge ${getColorClass(grade)} ${sizeClass} font-bold gap-2 ${className || ''}`}
      title={`Total Score: ${score.toFixed(1)}`}
    >
      <span>{grade}</span>
      {size !== 'sm' && <span className="opacity-80 border-l border-current/20 pl-2 text-[0.9em]">{score.toFixed(0)}</span>}
    </div>
  );
};
