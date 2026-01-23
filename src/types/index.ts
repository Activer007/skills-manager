import type { SecurityIssue } from './security';

export interface MarketplaceSkill {
  id: string;
  name: string;
  author: string;
  authorAvatar: string;
  description: string;
  descriptionZh?: string; // 中文描述（可选）
  descriptionEn?: string; // 英文描述（可选）
  githubUrl: string;
  stars: number;
  forks: number;
  updatedAt: number;
  hasMarketplace: boolean;
  path: string;
  branch: string;
  tags?: string[];
  isMcp?: boolean;
  configSchema?: Record<string, unknown>;
  previews?: string[];
  // 安全评分（可选，来自缓存或预扫描）
  securityScore?: number;
  securityIssues?: SecurityIssue[];
  compatibility?: CompatibilityInfo;
}

export type AgentType = 'claude-code' | 'cursor' | 'windsurf' | 'v0' | 'unknown';

export interface CompatibilityInfo {
  supportedAgents: AgentType[];
  minVersion?: string;
  os?: ('windows' | 'macos' | 'linux')[];
  requiresMcp?: boolean;
}

export interface InstalledSkill extends Partial<MarketplaceSkill> {
  id: string;
  name: string;
  description: string;
  descriptionZh?: string; // 中文描述（可选）
  descriptionEn?: string; // 英文描述（可选）
  installDate: number;
  localPath: string;
  status: 'safe' | 'unsafe' | 'unknown';
  type: 'system' | 'project';
  version?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  securityScore?: number;
  securityIssues?: SecurityIssue[];
  derivedFrom?: string;
  forkType?: 'fork' | 'remix';
}

export interface SkillManifest {
  name: string;
  description: string;
  descriptionZh?: string; // 中文描述（可选）
  descriptionEn?: string; // 英文描述（可选）
  derivedFrom?: string;
  forkType?: 'fork' | 'remix';
  [key: string]: unknown;
}

export interface ExportResult {
  success: boolean;
  message: string;
  filePath?: string;
}

// 定义仓库类别
export type RepositoryCategory = 'official' | 'community' | 'custom';

// 定义后端返回的仓库结构
export interface Repository {
  id: string;
  url: string;
  name: string;
  description?: string;
  enabled: boolean;
  scanSubdirs: boolean; // 注意：后端是 snake_case，前端通常用 camelCase，但 Tauri 默认序列化可能保留 snake_case，需要确认
  addedAt: number;      // Unix timestamp (ms)
  lastScanned?: number; // Unix timestamp (ms)
  cachePath?: string;
  cachedCommitSha?: string;
  featured: boolean;
  category: RepositoryCategory;
}

// 对应 Rust 的 AddRepositoryRequest
export interface AddRepositoryPayload {
  url: string;
  name?: string;
  description?: string;
  scanSubdirs?: boolean;
}

// 对应 Rust 的 RepositoryResponse
export interface RepositoryResponse {
  success: boolean;
  message: string;
  repositoryId?: string;
}

// 精选仓库相关接口
export interface FeaturedRepository {
  url: string;
  name: string;
  description: Record<string, string>; // 多语言 map: { "en": "...", "zh": "..." }
  tags: string[];
  featured: boolean;
  scan_subdirs: boolean;
}

export interface FeaturedCategory {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  repositories: FeaturedRepository[];
}

export interface FeaturedRepositoriesConfig {
  version: string;
  last_updated: string;
  categories: FeaturedCategory[];
}
