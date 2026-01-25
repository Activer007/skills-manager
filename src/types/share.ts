/**
 * 分享功能类型定义
 */

/**
 * 分享文本模板
 */
export interface ShareTextTemplate {
  title: string; // Skill 名称
  description: string; // Skill 描述
  link: string; // GitHub 链接或市场链接
  securityLevel: 'safe' | 'risk' | 'blocked' | 'unknown'; // 安全等级
  qualityScore?: number; // 质量评分（可选）
  source: string; // "来自 Skill Manager 分享"
}

/**
 * 平台配置
 */
export interface PlatformConfig {
  maxLength: number;
  hashtags: string[];
  template: 'compact' | 'detailed' | 'markdown';
}

/**
 * 支持的平台
 */
export type SharePlatform =
  | 'twitter'
  | 'weibo'
  | 'mastodon'
  | 'markdown'
  | 'generic';

/**
 * 分享图片配置
 */
export interface ShareCardConfig {
  // 布局
  width: number; // 默认 800
  height: number; // 默认 600

  // 内容
  title: string; // Skill 名称
  description: string; // Skill 描述
  link: string; // 安装链接
  qrCode: string; // 二维码 URL 或 data URL

  // 样式
  theme: 'light' | 'dark' | 'auto';
  accentColor: string; // 主题色
  brandLogo: string; // Skill Manager Logo

  // 质量信息
  securityLevel: 'safe' | 'risk' | 'blocked' | 'unknown';
  qualityScore?: number;

  // 元数据
  footer: string; // "来自 Skill Manager 分享"
  watermark?: boolean; // 是否添加水印
}

/**
 * 分享图片主题预设
 */
export type ShareCardTheme = 'default' | 'minimal' | 'dark';

/**
 * 分享图片中的数据结构（嵌入二维码）
 */
export interface ShareImageData {
  version: string; // 格式版本，如 "1.0"
  type: 'skill'; // 数据类型
  data: {
    id: string; // Skill ID
    name: string; // Skill 名称
    sourceUrl?: string; // GitHub 链接
    installUrl?: string; // 安装链接
    description: string; // 描述
    author?: string; // 作者
  };
  timestamp: number; // 时间戳
  signature?: string; // 可选：签名验证
}

/**
 * 从图片识别的 Skill 导入信息
 */
export interface SkillImportInfo {
  skillId: string;
  skillName: string;
  sourceUrl?: string;
  installUrl?: string;
  description: string;
}

/**
 * 图片导入状态
 */
export type ImageImportStatus =
  | 'idle' // 空闲
  | 'detecting' // 正在识别 QR 码
  | 'parsing' // 正在解析数据
  | 'validating' // 正在验证数据
  | 'confirmed' // 已确认，等待导入
  | 'importing' // 正在导入
  | 'success' // 导入成功
  | 'error'; // 错误

/**
 * 图片导入错误类型
 */
export type ImageImportError =
  | 'no_qrcode_found' // 未找到 QR 码
  | 'invalid_qr_data' // QR 码数据格式错误
  | 'invalid_share_format' // 分享格式无效
  | 'version_mismatch' // 版本不匹配
  | 'network_error' // 网络错误
  | 'import_failed' // 导入失败
  | 'unknown_error'; // 未知错误

/**
 * 图片导入状态
 */
export interface ImageImportState {
  status: ImageImportStatus;
  error?: ImageImportError;
  errorMessage?: string;
  skillInfo?: SkillImportInfo;
  previewUrl?: string;
}

// ============================================
// ShareSheet 相关类型定义 (T3-1)
// ============================================

/**
 * 分享方式
 */
export type ShareMethod = 'link' | 'text' | 'image' | 'package' | 'embed';

/**
 * 分享面板类型
 */
export type SharePanelType = ShareMethod;

/**
 * 包导出结果
 */
export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

/**
 * 包导出状态
 */
export type ExportStatus = 'idle' | 'exporting' | 'success' | 'error';

/**
 * useShare Hook 配置选项
 */
export interface UseShareOptions {
  /** 是否在挂载时自动检测修改状态 */
  autoCheckModified?: boolean;
  /** 是否在挂载时自动生成分享链接 */
  autoGenerateLink?: boolean;
  /** 默认分享主题 */
  defaultTheme?: ShareCardTheme;
  /** 默认分享平台 */
  defaultPlatform?: SharePlatform;
}

/**
 * useShare Hook 返回值
 */
export interface UseShareReturn {
  // 状态
  shareLink: string | undefined;
  isLoadingLink: boolean;
  isModified: boolean | null;
  isCheckingModified: boolean;

  // 复制链接
  copyLink: () => Promise<boolean>;
  linkCopied: boolean;

  // 文本分享
  generateText: (platform: SharePlatform) => string;
  copyText: (text: string) => Promise<boolean>;
  textCopied: boolean;
  shareToSocial: (platform: 'twitter' | 'weibo') => void;

  // 图片分享
  generateCard: (theme: ShareCardTheme) => Promise<Blob>;
  cardPreviewUrl: string | null;
  isGeneratingCard: boolean;
  downloadCard: (filename?: string) => Promise<void>;

  // 包导出
  exportPackage: (outputDir?: string) => Promise<ExportResult>;
  exportStatus: ExportStatus;
  exportResult: ExportResult | null;

  // 工具方法
  reset: () => void;
  cleanup: () => void;
}

/**
 * ShareSheet 组件 Props
 */
export interface ShareSheetProps {
  /** 要分享的 Skill */
  skill: import('./index').InstalledSkill;
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 初始面板类型 */
  initialPanel?: SharePanelType;
}

/**
 * 分享面板通用 Props
 */
export interface SharePanelProps {
  /** 要分享的 Skill */
  skill: import('./index').InstalledSkill;
  /** 分享链接 */
  shareLink: string | undefined;
  /** 是否已修改 */
  isModified: boolean | null;
  /** 语言 */
  locale: string;
}

// ============================================
// ShareLink 相关类型定义 (T3-2)
// ============================================

/**
 * 分享链接类型
 */
export type ShareLinkType = 'github' | 'local' | 'package' | 'deep';

/**
 * 分享链接可见性
 */
export type ShareLinkVisibility = 'public' | 'private' | 'unlisted';

/**
 * 分享链接数据结构
 */
export interface ShareLink {
  /** 唯一标识符 */
  id: string;
  /** 链接类型 */
  type: ShareLinkType;
  /** 关联的对象 ID (Skill ID) */
  objectId: string;
  /** Skill 名称 */
  name: string;
  /** Skill 描述 */
  description: string;
  /** 作者 */
  author?: string;
  /** 版本 */
  version?: string;
  /** 源 URL (GitHub 链接等) */
  sourceUrl?: string;
  /** 安装 URL */
  installUrl?: string;
  /** 安全等级 */
  securityLevel?: 'safe' | 'risk' | 'blocked' | 'unknown';
  /** 质量评分 */
  qualityScore?: number;
  /** 可见性 */
  visibility: ShareLinkVisibility;
  /** 创建时间 */
  createdAt: number;
  /** 过期时间 (可选) */
  expiresAt?: number;
  /** 额外元数据 */
  metadata?: Record<string, unknown>;
}

/**
 * 解析后的分享链接信息
 */
export interface ParsedShareLink {
  /** 是否有效 */
  valid: boolean;
  /** 解析的数据 */
  data?: ShareLink;
  /** 错误信息 */
  error?: string;
  /** 原始链接 */
  rawLink: string;
}

/**
 * 分享预览页面状态
 */
export type SharePreviewStatus =
  | 'loading'      // 加载中
  | 'ready'        // 就绪
  | 'installing'   // 安装中
  | 'installed'    // 已安装
  | 'error'        // 错误
  | 'expired';     // 已过期

/**
 * Share Record from Backend
 */
export interface ShareRecord {
  share_id: string;
  target_type: 'skill' | 'profile' | 'collection';
  target_id: string;
  visibility: 'unlisted' | 'public';
  created_at: string;
  expires_at?: string;
  metadata: ShareMetadata;
}

export interface ShareMetadata {
  name: string;
  description: string;
  version: string;
  author?: string;
  /** @deprecated 使用 source_url 代替 */
  url?: string;
  /** Skill 源代码 URL (GitHub 仓库链接) */
  source_url?: string;
  security_score?: number;
  security_level?: string;
}
