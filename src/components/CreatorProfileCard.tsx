import React from 'react';
import { useTranslation } from 'react-i18next';
import { Github, Globe, Award, CheckCircle, UserPlus, UserCheck, Edit } from 'lucide-react';
import type { Creator } from '../types/creator';
import { Button } from './ui/Button';

interface CreatorProfileCardProps {
  creator: Creator;
  onFollow?: () => void;
  onUnfollow?: () => void;
  onEdit?: () => void;
  isFollowingLoading?: boolean;
}

export const CreatorProfileCard: React.FC<CreatorProfileCardProps> = ({
  creator,
  onFollow,
  onUnfollow,
  onEdit,
  isFollowingLoading,
}) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  return (
    <div className="bg-base-100 border border-base-200 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-24 h-24 rounded-full bg-base-200 overflow-hidden ring-4 ring-base-100 shadow-md">
            {creator.avatar_url ? (
              <img
                src={creator.avatar_url}
                alt={creator.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-base-content/30">
                {creator.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {creator.verified && (
            <div className="absolute bottom-0 right-0 bg-blue-500 text-white p-1 rounded-full ring-2 ring-base-100" title={isZh ? '已认证创作者' : 'Verified Creator'}>
              <CheckCircle size={16} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                {creator.name}
              </h2>
              <p className="text-base-content/60 mt-1 max-w-lg">
                {creator.bio || (isZh ? '暂无简介' : 'No biography available')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Edit size={16} className="mr-1" />
                  {isZh ? '编辑' : 'Edit'}
                </Button>
              )}

              {creator.is_followed ? (
                <Button
                  variant="outline"
                  onClick={onUnfollow}
                  isLoading={isFollowingLoading}
                  className="group"
                >
                  <UserCheck size={18} className="mr-2 group-hover:hidden" />
                  <span className="group-hover:hidden">{isZh ? '已关注' : 'Following'}</span>
                  <span className="hidden group-hover:inline text-error">{isZh ? '取消关注' : 'Unfollow'}</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={onFollow}
                  isLoading={isFollowingLoading}
                >
                  <UserPlus size={18} className="mr-2" />
                  {isZh ? '关注' : 'Follow'}
                </Button>
              )}
            </div>
          </div>

          {/* Stats & Links */}
          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-1.5 text-sm text-base-content/70 bg-base-200/50 px-3 py-1.5 rounded-full">
              <Award size={16} className="text-amber-500" />
              <span className="font-semibold">{creator.skill_count}</span>
              <span>{isZh ? '个作品' : 'Skills'}</span>
            </div>

            {creator.github_url && (
              <a
                href={creator.github_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-base-content/70 hover:text-primary transition-colors bg-base-200/50 px-3 py-1.5 rounded-full"
              >
                <Github size={16} />
                <span>GitHub</span>
              </a>
            )}

            {creator.website_url && (
              <a
                href={creator.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-base-content/70 hover:text-primary transition-colors bg-base-200/50 px-3 py-1.5 rounded-full"
              >
                <Globe size={16} />
                <span>Website</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
