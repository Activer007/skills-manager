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

  // 来源信息（可选）
  repositoryId?: string;
  repositoryName?: string;
  sourceType?: 'featured' | 'user';
  priority?: number;
  skillPath?: string;
}

export type AgentType = 'claude-code' | 'cursor' | 'windsurf' | 'v0' | 'unknown';

/**
 * Skill 来源类型
 * - official: claude-ai 官方仓库（如 https://github.com/anthropics/skills）
 * - featured: 精选仓库（高质量推荐）
 * - user: 用户自定义仓库
 */
export type SourceType = 'official' | 'featured' | 'user';
export type SourceFilter = 'all' | SourceType;

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
  author?: string;
  status: 'safe' | 'unsafe' | 'unknown';

  // Additional optional properties for enhanced type safety
  securityLevel?: 'safe' | 'risk' | 'blocked' | 'unknown';
  qualityScore?: number;
  sourceUrl?: string;

  type: 'system' | 'project';
  version?: string;
  enabled?: boolean;
  config?: Record<string, unknown>;
  securityScore?: number;
  securityIssues?: SecurityIssue[];
  derivedFrom?: string;
  forkType?: 'fork' | 'remix';

  // ✅ 新增字段 (v2.1) - 快照模式支持
  marketplaceSkillId?: string;  // 关联到市场 Skill ID（可选）
  originalRepositoryId?: string;  // 原始仓库 ID
  originalRepositoryName?: string;  // 原始仓库名称
  originalRepositoryUrl?: string;  // 原始仓库 URL
  originalSkillPath?: string;  // 原始 Skill 路径
  originalAuthor?: string;  // 原始作者
  originalSourceType?: 'featured' | 'user';  // 原始来源类型
  installedAt?: number;  // ✅ 新增：安装时间戳（Unix timestamp 秒）
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

// 定义后端返回的仓库结构 (v2.1)
export interface Repository {
  id: string;
  url: string;
  name: string;
  description?: string;

  // ✅ 新增字段 (v2.1)
  /**
   * 来源类型
   * - official: claude-ai 官方仓库（https://github.com/anthropics/skills）
   * - featured: 精选仓库（高质量推荐）
   * - user: 用户自定义仓库
   */
  sourceType: 'official' | 'featured' | 'user';
  /**
   * 优先级（数值越小优先级越高）
   * - official: 5（最高优先级）
   * - featured: 10
   * - user: 100
   */
  priority: number;
  scanStatus: 'pending' | 'scanning' | 'success' | 'failed';  // 扫描状态
  etag?: string;  // GitHub API ETag 用于缓存

  // Original fields
  enabled: boolean;
  scanSubdirs: boolean; // 注意：后端是 snake_case，前端通常用 camelCase，但 Tauri 默认序列化可能保留 snake_case，需要确认
  addedAt: number;      // Unix timestamp (ms)
  lastScanned?: number; // Unix timestamp (ms)
  cachePath?: string;
  cachedCommitSha?: string;

  // Legacy field (kept for backwards compatibility)
  featured: boolean;  // 映射到 sourceType='featured'
  category: RepositoryCategory;
}

// 对应 Rust 的 AddRepositoryRequest
export interface AddRepositoryPayload {
  url: string;
  name?: string;
  description?: string;
  scanSubdirs?: boolean;
  autoScan?: boolean; // ✅ 新增：是否自动扫描（默认 true）
}

// 对应 Rust 的 RepositoryResponse
export interface RepositoryResponse {
  success: boolean;
  message: string;
  repositoryId?: string;
  taskId?: string; // ✅ 新增：后台扫描任务 ID（如果启用了 autoScan）
}

// ✅ 新增：删除仓库的详细结果
export interface DeleteRepositoryResult {
  success: boolean;
  message: string;
  repositoryId?: string;
  deletedSkillsCount: number;
  retainedInstalledSkillsCount: number;
}

// ✅ 新增：市场筛选参数
export interface MarketplaceFilter {
  sourceType?: 'featured' | 'user' | 'all';
  minQuality?: number;
  minStars?: number;
  tags?: string[];
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

// ✅ 新增：API 错误响应
export interface ApiErrorResponse {
  code: string;
  message: string;
  helpUrl?: string;
}

// ✅ 新增：扫描结果（对应 Rust 的 ScanResult）
export interface ScanResult {
  repositoryId: string;
  totalFound: number;
  syncedCount: number;
  failedCount: number;
  syncedSkills: string[];
  errors: SkillSyncError[];
  durationMs: number;
}

// ✅ 新增：Skill 同步错误
export interface SkillSyncError {
  skillIdentifier: string;
  message: string;
  code?: string;
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

// ============================================
// Marketplace Database Types (Backend API)
// ============================================

/**
 * Marketplace skill DTO returned from backend API
 * Corresponds to Rust's MarketplaceSkillDTO (v2.1)
 */
export interface MarketplaceSkillDTO {
  // Basic information
  id: string;
  name: string;
  author?: string;
  description?: string;

  // Metadata
  github_url?: string;
  version?: string;  // ✅ 新增：Skill 版本号
  stars: number;
  forks: number;
  updated_at: number;

  // Tags (parsed as array)
  tags: string[];
  security_score?: number;
  compatibility?: CompatibilityInfo;

  // ✅ 新增：来源信息（Source Information）
  repositoryId: string;
  repositoryName: string;
  sourceType: 'featured' | 'user';  // ✅ 新增：来源类型
  priority: number;  // ✅ 新增：优先级（精选=10，用户=100）
  skillPath: string;  // ✅ 新增：在仓库中的路径

  // Sync information
  discoveredAt: number;  // ✅ 新增：发现时间戳
  syncedAt: number;  // ✅ 新增：同步时间戳
}

/**
 * Parameters for listing marketplace skills
 */
export interface ListMarketplaceParams {
  tagFilter?: string;
  minStars?: number;
  limit?: number;
  offset?: number;
  searchQuery?: string;
  sourceType?: SourceFilter;
}

/**
 * Result of marketplace import operation
 */
export interface MarketplaceImportResult {
  total_count: number;
  success_count: number;
  error_count: number;
  skipped_count: number;
}

/**
 * Marketplace statistics
 */
export interface MarketplaceStats {
  total_skills: number;
  total_stars: number;
  last_updated: number;
}
