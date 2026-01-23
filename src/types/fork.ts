/**
 * Fork/Remix 派生体系类型定义
 */

/**
 * 派生类型
 */
export type ForkType = 'fork' | 'remix';

/**
 * 派生请求参数
 */
export interface ForkRequest {
  parent_skill_id: string;
  parent_skill_name: string;
  parent_skill_path: string;
  new_skill_name: string;
  fork_type: ForkType;
  fork_reason?: string;
  target_location: string; // "system" 或项目路径
}

/**
 * 父 Skill 信息
 */
export interface ParentSkillInfo {
  skill_id: string;
  skill_name: string;
  skill_path?: string;
  author?: string;
}

/**
 * 派生信息（用于前端显示）
 */
export interface ForkInfo {
  /** 是否为派生 Skill */
  is_fork: boolean;
  /** 父 Skill 信息 */
  parent?: ParentSkillInfo;
  /** 派生类型 */
  fork_type?: ForkType;
  /** 派生原因 */
  fork_reason?: string;
  /** 当前 Skill 被派生次数 */
  fork_count: number;
  /** 谱系深度 */
  depth: number;
}

/**
 * 谱系节点
 */
export interface LineageNode {
  skill_id: string;
  skill_name: string;
  skill_path?: string;
  author?: string;
  fork_type?: ForkType;
  created_at?: number;
  depth: number;
  children: LineageNode[];
}

/**
 * 派生统计
 */
export interface ForkStats {
  parent_skill_id: string;
  parent_skill_name: string;
  fork_count: number;
  fork_count_only: number;
  remix_count: number;
  last_forked_at?: number;
}

/**
 * 派生对话框配置
 */
export interface ForkDialogProps {
  isOpen: boolean;
  onClose: () => void;
  skill: {
    id: string;
    name: string;
    path: string;
    author?: string;
    description?: string;
  };
  onSuccess?: (newSkillPath: string) => void;
}

/**
 * 谱系树组件配置
 */
export interface LineageTreeProps {
  skillId: string;
  maxDepth?: number;
  onNodeClick?: (node: LineageNode) => void;
}
