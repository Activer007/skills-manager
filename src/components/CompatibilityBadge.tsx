import { useTranslation } from 'react-i18next';
import { cn } from '../utils/cn';
import {
  Monitor,
  Command,
  Terminal,
  Cpu,
  HelpCircle
} from 'lucide-react';
import type { AgentType, CompatibilityInfo } from '../types';
import { Tooltip } from './ui/Tooltip';

interface CompatibilityBadgeProps {
  compatibility?: CompatibilityInfo;
  className?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const AgentIcon = ({ type, className }: { type: AgentType; className?: string }) => {
  switch (type) {
    case 'claude-code':
      return <Terminal className={className} />;
    case 'cursor':
      return <Command className={className} />;
    case 'windsurf':
      return <Monitor className={className} />;
    case 'v0':
      return <Cpu className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
};

const getAgentLabel = (type: AgentType): string => {
  switch (type) {
    case 'claude-code':
      return 'Claude Code';
    case 'cursor':
      return 'Cursor';
    case 'windsurf':
      return 'Windsurf';
    case 'v0':
      return 'v0';
    default:
      return 'Unknown';
  }
};

export const CompatibilityBadge = ({
  compatibility,
  className,
  size = 'sm',
  showLabel = false,
}: CompatibilityBadgeProps) => {
  const { t } = useTranslation();

  if (!compatibility || !compatibility.supportedAgents || compatibility.supportedAgents.length === 0) {
    return null;
  }

  // Default to Claude Code if not specified (legacy support)
  const agents = compatibility.supportedAgents.length > 0
    ? compatibility.supportedAgents
    : ['claude-code' as AgentType];

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {agents.map((agent) => (
        <Tooltip key={agent} content={`Compatible with ${getAgentLabel(agent)}`}>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border font-medium transition-colors",
              size === 'sm' ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
              agent === 'claude-code'
                ? "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50"
                : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700"
            )}
          >
            <AgentIcon
              type={agent}
              className={cn(size === 'sm' ? "w-3 h-3" : "w-3.5 h-3.5")}
            />
            {showLabel && <span>{getAgentLabel(agent)}</span>}
          </div>
        </Tooltip>
      ))}
    </div>
  );
};
