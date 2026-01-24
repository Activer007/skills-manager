import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PageLoader } from '../components/ui/PageLoader';
import { EmptyState } from '../components/ui/EmptyState';
import { CreatorProfileCard } from '../components/CreatorProfileCard';
import { EditCreatorModal } from '../components/EditCreatorModal';
import { useCreator, useFollowCreator, useUnfollowCreator, useUpdateCreator } from '../hooks/useCreator';
import { CreatorSkillsList } from '../components/CreatorSkillsList';
import { toast } from '../store/useToastStore';

export const CreatorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const { data: creator, isLoading, isError } = useCreator(id || null);
  const followMutation = useFollowCreator();
  const unfollowMutation = useUnfollowCreator();
  const updateMutation = useUpdateCreator();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleFollow = async () => {
    if (!creator) return;
    try {
      await followMutation.mutateAsync(creator.id);
      toast.success(isZh ? '已关注' : 'Followed');
    } catch (error) {
      toast.error(isZh ? '关注失败' : 'Failed to follow');
    }
  };

  const handleUnfollow = async () => {
    if (!creator) return;
    try {
      await unfollowMutation.mutateAsync(creator.id);
      toast.success(isZh ? '已取消关注' : 'Unfollowed');
    } catch (error) {
      toast.error(isZh ? '取消关注失败' : 'Failed to unfollow');
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      await updateMutation.mutateAsync(data);
      toast.success(isZh ? '资料已更新' : 'Profile updated');
    } catch (error) {
      throw error; // Let modal handle error
    }
  };

  if (isLoading) return <PageLoader />;

  if (isError || !creator) {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyState
          title={isZh ? '创作者不存在' : 'Creator not found'}
          description={isZh ? '无法找到该创作者信息' : 'Could not find information for this creator'}
          action={
            <Button onClick={() => navigate(-1)} variant="outline">
              {isZh ? '返回' : 'Go Back'}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-6 pl-0 hover:pl-2 transition-all gap-2"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={16} />
        {isZh ? '返回' : 'Back'}
      </Button>

      <CreatorProfileCard
        creator={creator}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onEdit={() => setIsEditModalOpen(true)}
        isFollowingLoading={followMutation.isPending || unfollowMutation.isPending}
      />

      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4 px-1">{isZh ? '作品列表' : 'Skills'}</h3>
        <CreatorSkillsList creatorName={creator.name} />
      </div>

      <EditCreatorModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdate}
        creator={creator}
      />
    </div>
  );
};

export default CreatorProfile;
