import type { InstalledSkill } from '../types';

const getConfigString = (
  config: Record<string, unknown> | undefined,
  key: string
): string | undefined => {
  const value = config?.[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const resolveSkillLink = (skill: InstalledSkill): string | undefined => {
  const extendedSkill = skill as typeof skill & {
    sourceUrl?: string;
    githubUrl?: string;
  };
  const config = skill.config as Record<string, unknown> | undefined;

  return (
    getConfigString({ sourceUrl: extendedSkill.sourceUrl }, 'sourceUrl') ||
    getConfigString({ githubUrl: extendedSkill.githubUrl }, 'githubUrl') ||
    getConfigString(config, 'repoUrl') ||
    getConfigString(config, 'githubUrl') ||
    getConfigString(config, 'sourceUrl') ||
    getConfigString(config, 'installUrl')
  );
};
