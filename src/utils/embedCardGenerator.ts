/**
 * 嵌入卡片生成器
 *
 * 支持生成 Markdown、HTML 等多种格式的嵌入卡片
 */

import type {
  EmbedCardData,
  EmbedCardOptions,
  EmbedCardResult,
  MarkdownEmbedOptions,
  HtmlEmbedOptions,
} from '../types/embed';

/**
 * 生成 Markdown 格式的嵌入卡片
 */
export function generateMarkdownEmbed(
  data: EmbedCardData,
  options: EmbedCardOptions,
  mdOptions: MarkdownEmbedOptions = {
    useBadges: true,
    useCollapsible: false,
    headingLevel: 3,
  }
): EmbedCardResult {
  const lines: string[] = [];
  const heading = '#'.repeat(mdOptions.headingLevel);

  // 标题
  lines.push(`${heading} ${data.name}`);
  lines.push('');

  // 描述
  if (data.description) {
    lines.push(data.description);
    lines.push('');
  }

  // 徽章行
  if (mdOptions.useBadges) {
    const badges: string[] = [];

    // 版本徽章
    if (options.showVersion && data.version) {
      badges.push(
        `![Version](https://img.shields.io/badge/version-${encodeURIComponent(data.version)}-blue)`
      );
    }

    // 安全等级徽章
    if (options.showSecurity && data.securityLevel) {
      const securityColors = {
        safe: 'brightgreen',
        warning: 'yellow',
        danger: 'red',
      };
      const securityLabels = {
        safe: 'Safe',
        warning: 'Warning',
        danger: 'Danger',
      };
      badges.push(
        `![Security](https://img.shields.io/badge/security-${securityLabels[data.securityLevel]}-${securityColors[data.securityLevel]})`
      );
    }

    // 评分徽章
    if (options.showRating && data.rating !== undefined) {
      const ratingColor = data.rating >= 80 ? 'brightgreen' : data.rating >= 60 ? 'yellow' : 'red';
      badges.push(
        `![Rating](https://img.shields.io/badge/rating-${data.rating}%2F100-${ratingColor})`
      );
    }

    if (badges.length > 0) {
      lines.push(badges.join(' '));
      lines.push('');
    }
  }

  // 元数据表格
  const metadata: Array<[string, string]> = [];

  if (options.showAuthor && data.author) {
    metadata.push(['**Author**', data.author]);
  }

  if (options.showVersion && data.version) {
    metadata.push(['**Version**', data.version]);
  }

  if (options.showSecurity && data.securityLevel) {
    const securityLabels = {
      safe: '✅ Safe',
      warning: '⚠️ Warning',
      danger: '🚨 Danger',
    };
    metadata.push(['**Security**', securityLabels[data.securityLevel]]);
  }

  if (options.showRating && data.rating !== undefined) {
    const grade = getGrade(data.rating);
    metadata.push(['**Rating**', `${data.rating}/100 (${grade})`]);
  }

  if (data.tags && data.tags.length > 0) {
    metadata.push(['**Tags**', data.tags.map((tag) => `\`${tag}\``).join(', ')]);
  }

  if (metadata.length > 0) {
    metadata.forEach(([key, value]) => {
      lines.push(`${key}: ${value}`);
    });
    lines.push('');
  }

  // 链接
  const links: string[] = [];

  if (options.showInstallButton && data.installUrl) {
    links.push(`[📦 Install](${data.installUrl})`);
  }

  if (data.previewUrl) {
    links.push(`[👀 Preview](${data.previewUrl})`);
  }

  if (data.repoUrl) {
    links.push(`[📚 Repository](${data.repoUrl})`);
  }

  if (links.length > 0) {
    lines.push(links.join(' | '));
    lines.push('');
  }

  // 生成折叠区域（如果启用）
  let code = lines.join('\n');
  if (mdOptions.useCollapsible) {
    code = `<details>\n<summary>📦 ${data.name}</summary>\n\n${code}\n</details>`;
  }

  // 生成预览 HTML
  const previewHtml = markdownToHtml(code);

  return {
    code,
    previewHtml,
    format: 'markdown',
  };
}

/**
 * 生成 HTML 格式的嵌入卡片
 */
export function generateHtmlEmbed(
  data: EmbedCardData,
  options: EmbedCardOptions,
  htmlOptions: HtmlEmbedOptions = {
    inlineStyles: true,
    useShadowDom: false,
    cssFramework: 'none',
    responsive: true,
  }
): EmbedCardResult {
  const styles = generateCardStyles(options, htmlOptions);
  const cardContent = generateCardContent(data, options);

  let code: string;

  if (htmlOptions.useShadowDom) {
    // 使用 Shadow DOM 封装
    code = `
<script>
(function() {
  const template = document.createElement('template');
  template.innerHTML = \`
    <style>${styles}</style>
    ${cardContent}
  \`;

  class SkillEmbedCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.appendChild(template.content.cloneNode(true));
    }
  }

  customElements.define('skill-embed-card', SkillEmbedCard);
})();
</script>

<skill-embed-card></skill-embed-card>
    `.trim();
  } else if (htmlOptions.inlineStyles) {
    // 内联样式
    code = `
<style>
${styles}
</style>
${cardContent}
    `.trim();
  } else {
    // 外部样式（仅 HTML）
    code = cardContent;
  }

  return {
    code,
    previewHtml: cardContent,
    format: 'html',
  };
}

/**
 * 生成 BBCode 格式的嵌入卡片（用于论坛）
 */
export function generateBBCodeEmbed(
  data: EmbedCardData,
  options: EmbedCardOptions
): EmbedCardResult {
  const lines: string[] = [];

  // 标题
  lines.push(`[b][size=150]${data.name}[/size][/b]`);
  lines.push('');

  // 描述
  if (data.description) {
    lines.push(data.description);
    lines.push('');
  }

  // 元数据
  if (options.showAuthor && data.author) {
    lines.push(`[b]Author:[/b] ${data.author}`);
  }

  if (options.showVersion && data.version) {
    lines.push(`[b]Version:[/b] ${data.version}`);
  }

  if (options.showSecurity && data.securityLevel) {
    const securityLabels = {
      safe: '[color=green]✓ Safe[/color]',
      warning: '[color=orange]⚠ Warning[/color]',
      danger: '[color=red]✗ Danger[/color]',
    };
    lines.push(`[b]Security:[/b] ${securityLabels[data.securityLevel]}`);
  }

  if (options.showRating && data.rating !== undefined) {
    lines.push(`[b]Rating:[/b] ${data.rating}/100`);
  }

  lines.push('');

  // 链接
  if (options.showInstallButton && data.installUrl) {
    lines.push(`[url=${data.installUrl}]📦 Install[/url]`);
  }

  if (data.repoUrl) {
    lines.push(`[url=${data.repoUrl}]📚 Repository[/url]`);
  }

  const code = lines.join('\n');

  return {
    code,
    previewHtml: bbcodeToHtml(code),
    format: 'bbcode',
  };
}

/**
 * 生成卡片样式（CSS）
 */
function generateCardStyles(
  options: EmbedCardOptions,
  htmlOptions: HtmlEmbedOptions
): string {
  const isDark = options.theme === 'dark';
  const bgColor = isDark ? '#1f2937' : '#ffffff';
  const textColor = isDark ? '#f9fafb' : '#111827';
  const borderColor = isDark ? '#374151' : '#e5e7eb';

  let width = '100%';
  if (options.size === 'compact') {
    width = '320px';
  } else if (options.size === 'normal') {
    width = '480px';
  } else if (options.customWidth) {
    width = options.customWidth;
  }

  const maxWidth = htmlOptions.responsive ? '100%' : width;

  return `
.skill-embed-card {
  background: ${bgColor};
  border: 1px solid ${borderColor};
  border-radius: 8px;
  padding: 16px;
  max-width: ${maxWidth};
  width: ${width};
  color: ${textColor};
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.skill-embed-card__header {
  margin-bottom: 12px;
}

.skill-embed-card__title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.skill-embed-card__description {
  font-size: 14px;
  color: ${isDark ? '#d1d5db' : '#6b7280'};
  margin: 0 0 12px 0;
  line-height: 1.5;
}

.skill-embed-card__badges {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.skill-embed-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.skill-embed-card__badge--safe {
  background: ${isDark ? '#065f46' : '#d1fae5'};
  color: ${isDark ? '#a7f3d0' : '#065f46'};
}

.skill-embed-card__badge--warning {
  background: ${isDark ? '#92400e' : '#fef3c7'};
  color: ${isDark ? '#fde68a' : '#92400e'};
}

.skill-embed-card__badge--danger {
  background: ${isDark ? '#991b1b' : '#fee2e2'};
  color: ${isDark ? '#fca5a5' : '#991b1b'};
}

.skill-embed-card__meta {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}

.skill-embed-card__meta-item {
  display: flex;
  gap: 8px;
}

.skill-embed-card__meta-label {
  font-weight: 600;
  min-width: 70px;
}

.skill-embed-card__actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.skill-embed-card__button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s;
  border: 1px solid ${borderColor};
  background: ${isDark ? '#374151' : '#f9fafb'};
  color: ${textColor};
  cursor: pointer;
}

.skill-embed-card__button:hover {
  background: ${isDark ? '#4b5563' : '#f3f4f6'};
}

.skill-embed-card__button--primary {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.skill-embed-card__button--primary:hover {
  background: #2563eb;
}

@media (prefers-color-scheme: dark) {
  ${options.theme === 'auto' ? generateCardStyles({ ...options, theme: 'dark' }, htmlOptions) : ''}
}
  `.trim();
}

/**
 * 生成卡片内容（HTML）
 */
function generateCardContent(data: EmbedCardData, options: EmbedCardOptions): string {
  const parts: string[] = [];

  parts.push('<div class="skill-embed-card">');

  // Header
  parts.push('  <div class="skill-embed-card__header">');
  parts.push(`    <h3 class="skill-embed-card__title">${escapeHtml(data.name)}</h3>`);
  if (data.description) {
    parts.push(`    <p class="skill-embed-card__description">${escapeHtml(data.description)}</p>`);
  }
  parts.push('  </div>');

  // Badges
  const badges: string[] = [];
  if (options.showSecurity && data.securityLevel) {
    const securityLabels = { safe: '✅ Safe', warning: '⚠️ Warning', danger: '🚨 Danger' };
    badges.push(
      `<span class="skill-embed-card__badge skill-embed-card__badge--${data.securityLevel}">${securityLabels[data.securityLevel]}</span>`
    );
  }

  if (options.showRating && data.rating !== undefined) {
    const grade = getGrade(data.rating);
    badges.push(
      `<span class="skill-embed-card__badge">⭐ ${data.rating}/100 (${grade})</span>`
    );
  }

  if (badges.length > 0) {
    parts.push('  <div class="skill-embed-card__badges">');
    badges.forEach((badge) => parts.push(`    ${badge}`));
    parts.push('  </div>');
  }

  // Metadata
  const metadata: Array<[string, string]> = [];
  if (options.showAuthor && data.author) {
    metadata.push(['Author', escapeHtml(data.author)]);
  }
  if (options.showVersion && data.version) {
    metadata.push(['Version', escapeHtml(data.version)]);
  }
  if (data.tags && data.tags.length > 0) {
    metadata.push(['Tags', data.tags.map((tag) => `<code>${escapeHtml(tag)}</code>`).join(', ')]);
  }

  if (metadata.length > 0) {
    parts.push('  <div class="skill-embed-card__meta">');
    metadata.forEach(([label, value]) => {
      parts.push('    <div class="skill-embed-card__meta-item">');
      parts.push(`      <span class="skill-embed-card__meta-label">${label}:</span>`);
      parts.push(`      <span>${value}</span>`);
      parts.push('    </div>');
    });
    parts.push('  </div>');
  }

  // Actions
  const actions: string[] = [];
  if (options.showInstallButton && data.installUrl) {
    actions.push(
      `<a href="${escapeHtml(data.installUrl)}" class="skill-embed-card__button skill-embed-card__button--primary" target="_blank">📦 Install</a>`
    );
  }
  if (data.previewUrl) {
    actions.push(
      `<a href="${escapeHtml(data.previewUrl)}" class="skill-embed-card__button" target="_blank">👀 Preview</a>`
    );
  }
  if (data.repoUrl) {
    actions.push(
      `<a href="${escapeHtml(data.repoUrl)}" class="skill-embed-card__button" target="_blank">📚 Repo</a>`
    );
  }

  if (actions.length > 0) {
    parts.push('  <div class="skill-embed-card__actions">');
    actions.forEach((action) => parts.push(`    ${action}`));
    parts.push('  </div>');
  }

  parts.push('</div>');

  return parts.join('\n');
}

/**
 * 简单的 Markdown 转 HTML（用于预览）
 */
function markdownToHtml(markdown: string): string {
  let html = markdown;

  // 标题
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 粗体
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 代码
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // 图片（徽章）
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

  // 换行
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">${html}</div>`;
}

/**
 * BBCode 转 HTML（用于预览）
 */
function bbcodeToHtml(bbcode: string): string {
  let html = bbcode;

  html = html.replace(/\[b\](.+?)\[\/b\]/g, '<strong>$1</strong>');
  html = html.replace(/\[size=(\d+)\](.+?)\[\/size\]/g, '<span style="font-size: $1%">$2</span>');
  html = html.replace(/\[color=(\w+)\](.+?)\[\/color\]/g, '<span style="color: $1">$2</span>');
  html = html.replace(/\[url=([^\]]+)\](.+?)\[\/url\]/g, '<a href="$1" target="_blank">$2</a>');

  html = html.replace(/\n/g, '<br>');

  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6;">${html}</div>`;
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 获取评分等级
 */
function getGrade(score: number): string {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
}

/**
 * 主入口：生成嵌入卡片
 */
export function generateEmbedCard(
  data: EmbedCardData,
  options: EmbedCardOptions
): EmbedCardResult {
  switch (options.format) {
    case 'markdown':
      return generateMarkdownEmbed(data, options);
    case 'html':
      return generateHtmlEmbed(data, options);
    case 'bbcode':
      return generateBBCodeEmbed(data, options);
    default:
      throw new Error(`Unsupported format: ${options.format}`);
  }
}
