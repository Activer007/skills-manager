import { InstalledSkill } from '../types';

/**
 * Generate Markdown Badge code (Shields.io style)
 */
export const generateMarkdownBadge = (skill: InstalledSkill, link: string): string => {
  const nameEncoded = encodeURIComponent(skill.name.replace(/-/g, '--').replace(/_/g, '__'));
  // Blue badge for skill name
  const badgeUrl = `https://img.shields.io/badge/Skill-${nameEncoded}-blue?logo=claude`;
  return `[![Skill: ${skill.name}](${badgeUrl})](${link})`;
};

/**
 * Generate HTML Card code (Inline styles for portability)
 */
export const generateHtmlCard = (skill: InstalledSkill, link: string): string => {
  const safeName = skill.name.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeDesc = skill.description.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const initial = safeName.charAt(0).toUpperCase();

  return `<!-- Skill Manager Card -->
<div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; max-width: 320px; font-family: system-ui, -apple-system, sans-serif; background: white; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
    <div style="background-color: #4f46e5; color: white; width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 20px;">
      ${initial}
    </div>
    <div>
      <div style="font-weight: 700; color: #1e293b; font-size: 16px;">${safeName}</div>
      <div style="font-size: 12px; color: #64748b;">${skill.version ? `v${skill.version}` : 'Latest'}</div>
    </div>
  </div>
  <p style="color: #475569; font-size: 14px; margin: 0 0 16px 0; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
    ${safeDesc}
  </p>
  <a href="${link}" target="_blank" style="display: block; background-color: #4f46e5; color: white; padding: 10px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500; text-align: center; transition: background-color 0.2s;">
    View Skill
  </a>
</div>`;
};

/**
 * Generate JSON-LD structured data
 */
export const generateJsonLd = (skill: InstalledSkill, link: string): string => {
  const data = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": skill.name,
    "description": skill.description,
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Any",
    "url": link,
    "author": {
      "@type": "Person",
      "name": skill.author || "Unknown"
    },
    "softwareVersion": skill.version || "1.0.0",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };
  return JSON.stringify(data, null, 2);
};
