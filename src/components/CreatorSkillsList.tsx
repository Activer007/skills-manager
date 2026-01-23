import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSkills } from '../hooks/useSkills';
import { SkillCard } from './SkillCard';
import { EmptyState } from './ui/EmptyState';
import { FolderOpen } from 'lucide-react';
import { getLocalizedDescription } from '../utils/i18n';
import { SkeletonCard } from './SkeletonCard';

interface CreatorSkillsListProps {
  creatorName: string;
}

export const CreatorSkillsList: React.FC<CreatorSkillsListProps> = ({ creatorName }) => {
  const { i18n } = useTranslation();
  const { data: installedSkills = [], isLoading } = useSkills();

  const creatorSkills = React.useMemo(() => {
    return installedSkills.filter(skill => {
      // Case-insensitive comparison for author name
      return skill.author?.toLowerCase() === creatorName.toLowerCase();
    });
  }, [installedSkills, creatorName]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard count={3} />
      </div>
    );
  }

  if (creatorSkills.length === 0) {
    return (
      <div className="p-8 text-center text-base-content/50 bg-base-100 rounded-xl border border-base-200 border-dashed">
        <EmptyState
          icon={<FolderOpen className="w-12 h-12 text-base-content/20 mb-4" />}
          title={i18n.language === 'zh' ? '暂无公开作品' : 'No public skills yet'}
          description={i18n.language === 'zh' ? '该创作者尚未发布任何 Skill' : 'This creator has not published any skills yet'}
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {creatorSkills.map(skill => (
        <SkillCard
          key={skill.id}
          skill={{
            ...skill,
            description: getLocalizedDescription(skill, i18n.language)
          }}
          viewMode="grid"
          isInstalled={true}
          isActive={skill.enabled ?? true}
          // On profile page, we might just want to show the card, or allow view details
          // For now, let's keep it simple
        />
      ))}
    </div>
  );
};
