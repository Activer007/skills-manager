import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import type { InstalledSkill } from '../types';
import type { ShareCardConfig, ShareCardTheme, ShareImageData } from '../types/share';

/**
 * 分享卡片主题预设
 */
export const CARD_THEMES: Record<ShareCardTheme, Partial<ShareCardConfig>> = {
  default: {
    width: 800,
    height: 600,
    theme: 'light',
    accentColor: '#3B82F6',
    watermark: true,
  },
  minimal: {
    width: 600,
    height: 400,
    theme: 'light',
    accentColor: '#000000',
    watermark: false,
  },
  dark: {
    width: 800,
    height: 600,
    theme: 'dark',
    accentColor: '#8B5CF6',
    watermark: true,
  },
};

/**
 * 生成二维码
 */
export const generateQRCode = async (url: string): Promise<string> => {
  return await QRCode.toDataURL(url, {
    width: 200,
    margin: 0,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
};

/**
 * 编码分享数据
 */
export const encodeShareData = (data: ShareImageData): string => {
  const json = JSON.stringify(data);
  return btoa(encodeURIComponent(json));
};

/**
 * 生成分享数据
 */
export const generateShareData = (skill: InstalledSkill): ShareImageData => {
  return {
    version: '1.0',
    type: 'skill',
    data: {
      id: skill.id,
      name: skill.name,
      sourceUrl: skill.sourceUrl,
      installUrl: skill.sourceUrl || `skills-manager://install?id=${skill.id}`,
      description: skill.description.substring(0, 100),
    },
    timestamp: Date.now(),
  };
};

/**
 * 生成包含数据的二维码
 */
export const generateSkillQRCode = async (skill: InstalledSkill): Promise<string> => {
  const shareData = generateShareData(skill);
  const encodedData = encodeShareData(shareData);

  return await QRCode.toDataURL(encodedData, {
    width: 300,
    margin: 0,
    errorCorrectionLevel: 'M',
  });
};

/**
 * 生成安装链接
 */
const generateInstallLink = (skill: InstalledSkill): string => {
  if (skill.sourceUrl) {
    return skill.sourceUrl;
  }
  return `skills-manager://install?id=${skill.id}`;
};

/**
 * HTML 转义函数，防止 XSS
 */
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * 生成卡片 HTML
 */
const generateCardHTML = (config: ShareCardConfig): string => {
  const isDark = config.theme === 'dark';
  const textColor = isDark ? '#ffffff' : '#1a1a1a';
  const subtextColor = isDark ? '#a0a0a0' : '#666666';

  const securityColors: Record<string, string> = {
    safe: '#10B981',
    risk: '#F59E0B',
    blocked: '#EF4444',
    unknown: '#6B7280',
  };

  const securityLabels: Record<string, string> = {
    safe: '✅ 安全',
    risk: '⚠️ 有风险',
    blocked: '🚫 已阻止',
    unknown: '❓ 未知',
  };

  return `
    <div style="
      width: 100%;
      height: 100%;
      padding: 40px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      position: relative;
      background: ${isDark ? '#1a1a1a' : '#ffffff'};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <!-- 顶部：Logo + 品牌标识 -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 30px;
      ">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="
            width: 40px;
            height: 40px;
            background: ${config.accentColor};
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 20px;
          ">SM</div>
          <div>
            <div style="font-weight: 600; color: ${textColor}; font-size: 16px;">Skills Manager</div>
            <div style="font-size: 12px; color: ${subtextColor};">Claude Code Skills</div>
          </div>
        </div>
        <div style="
          padding: 6px 12px;
          background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'};
          border-radius: 20px;
          font-size: 12px;
          color: ${subtextColor};
        ">Skill Share</div>
      </div>

      <!-- 中间：主要内容 -->
      <div style="
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;
      ">
        <!-- 标题 -->
        <h1 style="
          margin: 0;
          font-size: 32px;
          font-weight: 700;
          color: ${textColor};
          line-height: 1.3;
        ">${escapeHtml(config.title)}</h1>

        <!-- 描述 -->
        <p style="
          margin: 0;
          font-size: 16px;
          color: ${subtextColor};
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        ">${escapeHtml(config.description)}</p>

        <!-- 质量徽章 -->
        <div style="display: flex; gap: 10px;">
          <div style="
            padding: 8px 16px;
            background: ${securityColors[config.securityLevel]}20;
            border: 1px solid ${securityColors[config.securityLevel]};
            border-radius: 8px;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: ${securityColors[config.securityLevel]};
            font-weight: 500;
          ">
            <span style="font-size: 18px;">
              ${config.securityLevel === 'safe' ? '✅' :
                config.securityLevel === 'risk' ? '⚠️' :
                config.securityLevel === 'blocked' ? '🚫' : '❓'}
            </span>
            ${securityLabels[config.securityLevel]}
          </div>

          ${config.qualityScore ? `
            <div style="
              padding: 8px 16px;
              background: ${config.accentColor}20;
              border: 1px solid ${config.accentColor};
              border-radius: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 14px;
              color: ${config.accentColor};
              font-weight: 500;
            ">
              <span style="font-size: 18px;">⭐</span>
              ${config.qualityScore}/100
            </div>
          ` : ''}
        </div>

        <!-- 二维码区域 -->
        <div style="
          display: flex;
          align-items: center;
          gap: 20px;
          margin-top: auto;
        ">
          <div id="qrcode" style="
            width: 120px;
            height: 120px;
            background: white;
            padding: 10px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          ">
            <img
              id="qrcode-img"
              src="${config.qrCode}"
              style="width: 100%; height: 100%; object-fit: contain;"
              alt="QR Code"
            />
          </div>

          <div style="flex: 1;">
            <div style="
              font-size: 14px;
              color: ${textColor};
              font-weight: 500;
              margin-bottom: 6px;
            ">扫码安装 Skill</div>
            <div style="
              font-size: 12px;
              color: ${subtextColor};
              word-break: break-all;
            ">${escapeHtml(config.link)}</div>
          </div>
        </div>
      </div>

      <!-- 底部：页脚 -->
      <div style="
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 12px;
        color: ${subtextColor};
      ">
        <div>${config.footer}</div>
        <div>github.com/activer007/skills-manager</div>
      </div>

      ${config.watermark ? `
        <!-- 水印 -->
        <div style="
          position: absolute;
          bottom: 50%;
          right: -30px;
          transform: rotate(-30deg);
          font-size: 80px;
          font-weight: 900;
          color: ${isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'};
          pointer-events: none;
          white-space: nowrap;
          user-select: none;
        ">SKILL MANAGER</div>
      ` : ''}
    </div>
  `;
};

/**
 * 等待图片加载完成
 */
const waitForImages = (container: HTMLElement): Promise<void> => {
  const images = container.querySelectorAll('img');
  const promises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // 即使失败也继续
    });
  });
  return Promise.all(promises).then(() => {});
};

/**
 * 生成分享卡片图片
 */
export const generateShareCard = async (
  skill: InstalledSkill,
  theme: ShareCardTheme = 'default'
): Promise<Blob> => {
  const themeConfig = CARD_THEMES[theme];
  const qrCode = await generateSkillQRCode(skill);

  const config: ShareCardConfig = {
    ...themeConfig,
    width: themeConfig.width || 800,
    height: themeConfig.height || 600,
    title: skill.name,
    description: skill.description,
    link: skill.sourceUrl || generateInstallLink(skill),
    qrCode,
    theme: themeConfig.theme || 'light',
    accentColor: themeConfig.accentColor || '#3B82F6',
    brandLogo: '',
    securityLevel: skill.status,
    qualityScore: skill.qualityScore,
    footer: '来自 Skill Manager 分享',
    watermark: themeConfig.watermark || false,
  };

  // 1. 创建临时 DOM 元素
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: ${config.width}px;
    height: ${config.height}px;
  `;

  // 2. 生成卡片内容
  container.innerHTML = generateCardHTML(config);
  document.body.appendChild(container);

  try {
    // 3. 等待图片加载
    await waitForImages(container);

    // 4. 使用 html2canvas 转换
    const canvas = await html2canvas(container, {
      width: config.width,
      height: config.height,
      scale: 2, // Retina 屏幕支持
      useCORS: true,
      allowTaint: false,
      backgroundColor: config.theme === 'dark' ? '#1a1a1a' : '#ffffff',
      logging: false,
    });

    // 5. 转换为 Blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
  } finally {
    // 6. 清理临时元素
    document.body.removeChild(container);
  }
};
