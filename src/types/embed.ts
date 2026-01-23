/**
 * 嵌入卡片类型定义
 *
 * 支持将 Skill 嵌入到各种平台（网页、博客、文档等）
 */

/**
 * 嵌入卡片格式类型
 */
export type EmbedFormat = 'markdown' | 'html' | 'bbcode';

/**
 * 嵌入卡片主题
 */
export type EmbedTheme = 'light' | 'dark' | 'auto';

/**
 * 嵌入卡片尺寸
 */
export type EmbedSize = 'compact' | 'normal' | 'full';

/**
 * 嵌入卡片配置选项
 */
export interface EmbedCardOptions {
  /** 显示格式 */
  format: EmbedFormat;

  /** 主题 */
  theme: EmbedTheme;

  /** 尺寸 */
  size: EmbedSize;

  /** 是否显示作者信息 */
  showAuthor: boolean;

  /** 是否显示版本信息 */
  showVersion: boolean;

  /** 是否显示安全等级 */
  showSecurity: boolean;

  /** 是否显示评分 */
  showRating: boolean;

  /** 是否显示安装按钮 */
  showInstallButton: boolean;

  /** 自定义 CSS 类名 */
  customClass?: string;

  /** 自定义宽度（像素或百分比） */
  customWidth?: string;
}

/**
 * 嵌入卡片数据
 */
export interface EmbedCardData {
  /** Skill 名称 */
  name: string;

  /** Skill 描述 */
  description: string;

  /** 作者 */
  author?: string;

  /** 版本 */
  version?: string;

  /** 安全等级 */
  securityLevel?: 'safe' | 'warning' | 'danger';

  /** 质量评分（0-100） */
  rating?: number;

  /** 标签 */
  tags?: string[];

  /** 安装链接 */
  installUrl?: string;

  /** 预览链接 */
  previewUrl?: string;

  /** GitHub 仓库链接 */
  repoUrl?: string;

  /** 图标 URL */
  iconUrl?: string;
}

/**
 * 嵌入卡片生成结果
 */
export interface EmbedCardResult {
  /** 生成的代码 */
  code: string;

  /** 预览 HTML（用于实时预览） */
  previewHtml: string;

  /** 格式类型 */
  format: EmbedFormat;
}

/**
 * Markdown 嵌入选项
 */
export interface MarkdownEmbedOptions {
  /** 是否使用徽章（Shields.io） */
  useBadges: boolean;

  /** 是否生成折叠区域 */
  useCollapsible: boolean;

  /** 标题级别（1-6） */
  headingLevel: number;
}

/**
 * HTML 嵌入选项
 */
export interface HtmlEmbedOptions {
  /** 是否内联 CSS */
  inlineStyles: boolean;

  /** 是否使用 Shadow DOM */
  useShadowDom: boolean;

  /** CSS 框架（none, tailwind, bootstrap） */
  cssFramework: 'none' | 'tailwind' | 'bootstrap';

  /** 是否响应式 */
  responsive: boolean;
}
