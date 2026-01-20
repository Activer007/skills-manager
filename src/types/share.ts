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
export type SharePlatform = 'twitter' | 'weibo' | 'mastodon' | 'generic';

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
