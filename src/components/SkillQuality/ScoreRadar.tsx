import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import type { SkillScore } from '../../types/scorer';

interface ScoreRadarProps {
  score: SkillScore;
  className?: string;
}

export const ScoreRadar: React.FC<ScoreRadarProps> = ({ score, className }) => {
  const data = [
    {
      subject: 'Content',
      score: (score.content_score.total / 50) * 100,
      fullMark: 100,
    },
    {
      subject: 'Technical',
      score: (score.technical_score.total / 30) * 100,
      fullMark: 100,
    },
    {
      subject: 'Maintenance',
      score: (score.maintenance_score.total / 10) * 100,
      fullMark: 100,
    },
    {
      subject: 'UX',
      score: (score.ux_score.total / 10) * 100,
      fullMark: 100,
    },
  ];

  return (
    <div className={`w-full h-64 ${className || ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="oklch(var(--b3))" />
          <PolarAngleAxis 
            dataKey="subject" 
            tick={{ fill: 'oklch(var(--bc))', fontSize: 12 }} 
          />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Skill Quality"
            dataKey="score"
            stroke="oklch(var(--p))"
            fill="oklch(var(--p))"
            fillOpacity={0.6}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'oklch(var(--b1))', 
              borderColor: 'oklch(var(--b3))',
              borderRadius: '0.5rem',
              color: 'oklch(var(--bc))'
            }}
            formatter={(value: any) => [`${Number(value).toFixed(1)}%`, 'Score']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
