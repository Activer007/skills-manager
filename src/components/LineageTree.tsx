/**
 * LineageTree 谱系可视化组件
 * 显示 Skill 的派生关系树
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GitFork, Wand2, ChevronRight, ChevronDown, User, Calendar, Loader2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import type { LineageNode, ForkType } from '../types/fork';
import { cn } from '../utils/cn';

interface LineageTreeProps {
  skillId: string;
  maxDepth?: number;
  onNodeClick?: (node: LineageNode) => void;
  className?: string;
}

export const LineageTree: React.FC<LineageTreeProps> = ({
  skillId,
  maxDepth = 5,
  onNodeClick,
  className,
}) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [lineage, setLineage] = useState<LineageNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLineage = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await invoke<LineageNode>('get_skill_lineage', {
          skillId,
          maxDepth,
        });
        setLineage(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchLineage();
  }, [skillId, maxDepth]);

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-base-content/60">
          {isZh ? '加载谱系...' : 'Loading lineage...'}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4 bg-error/10 text-error rounded-lg', className)}>
        {isZh ? '加载失败: ' : 'Failed to load: '}{error}
      </div>
    );
  }

  if (!lineage) {
    return (
      <div className={cn('p-4 text-base-content/60 text-center', className)}>
        {isZh ? '无谱系数据' : 'No lineage data'}
      </div>
    );
  }

  return (
    <div className={cn('p-4', className)}>
      <TreeNode node={lineage} isRoot onNodeClick={onNodeClick} isZh={isZh} />
    </div>
  );
};

interface TreeNodeProps {
  node: LineageNode;
  isRoot?: boolean;
  onNodeClick?: (node: LineageNode) => void;
  isZh: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, isRoot, onNodeClick, isZh }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleDateString();
  };

  const getForkIcon = (forkType?: ForkType) => {
    if (forkType === 'remix') {
      return <Wand2 className="w-4 h-4 text-secondary" />;
    }
    return <GitFork className="w-4 h-4 text-primary" />;
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors',
          'hover:bg-base-200',
          isRoot && 'bg-primary/10 border border-primary/20'
        )}
        onClick={() => onNodeClick?.(node)}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="p-1 hover:bg-base-300 rounded"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Fork 类型图标 */}
        {!isRoot && getForkIcon(node.fork_type)}

        {/* 节点信息 */}
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{node.skill_name}</div>
          <div className="flex items-center gap-3 text-xs text-base-content/60">
            {node.author && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {node.author}
              </span>
            )}
            {node.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(node.created_at)}
              </span>
            )}
            {node.fork_type && (
              <span className={cn(
                'px-1.5 py-0.5 rounded text-xs',
                node.fork_type === 'fork' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
              )}>
                {node.fork_type === 'fork' ? 'Fork' : 'Remix'}
              </span>
            )}
          </div>
        </div>

        {/* 深度标签 */}
        {isRoot && (
          <span className="px-2 py-1 bg-primary text-primary-content text-xs rounded">
            {isZh ? '原始' : 'Original'}
          </span>
        )}
      </div>

      {/* 子节点 */}
      {hasChildren && expanded && (
        <div className="ml-6 pl-4 border-l-2 border-base-300 mt-1 space-y-1">
          {node.children.map((child, index) => (
            <TreeNode
              key={`${child.skill_id}-${index}`}
              node={child}
              onNodeClick={onNodeClick}
              isZh={isZh}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default LineageTree;
