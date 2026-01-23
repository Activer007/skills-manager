import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Plus, Settings, Trash2, GripVertical, ExternalLink, Share2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/PageLoader';
import { CollectionModal } from '../components/CollectionModal';
import { ShareCollectionModal } from '../components/ShareCollectionModal';
import { CollectionItem, Collection } from '../types/collection';
import { toast } from '../store/useToastStore';
import { cn } from '../utils/cn';

export const CollectionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const [collection, setCollection] = useState<Collection | null>(null);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const fetchCollection = async () => {
    if (!id) return;
    try {
      const data = await invoke<Collection | null>('get_collection', { id });
      if (data) {
        setCollection(data);
        if (data.items) {
          setItems(data.items);
        }
      } else {
        toast.error(isZh ? '合集不存在' : 'Collection not found');
        navigate('/collections');
      }
    } catch (err) {
      console.error('Failed to fetch collection:', err);
      toast.error(isZh ? '加载失败' : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection();
  }, [id]);

  const handleUpdate = async (data: any) => {
    if (!collection) return;
    try {
      await invoke('update_collection', { request: { id: collection.id, ...data } });
      toast.success(isZh ? '更新成功' : 'Updated successfully');
      fetchCollection();
    } catch (err) {
      toast.error(isZh ? '更新失败' : 'Update failed');
    }
  };

  const handleRemoveItem = async (skillId: string) => {
    if (!collection) return;
    if (!confirm(isZh ? '确定要从合集中移除此 Skill 吗？' : 'Remove this skill from collection?')) {
      return;
    }

    try {
      await invoke('remove_collection_item', {
        request: {
          collection_id: collection.id,
          skill_id: skillId
        }
      });
      toast.success(isZh ? '已移除' : 'Removed');
      fetchCollection();
    } catch (err) {
      toast.error(isZh ? '移除失败' : 'Failed to remove');
    }
  };

  if (isLoading) return <PageLoader />;
  if (!collection) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          className="mb-4 pl-0 hover:pl-2 transition-all gap-2"
          onClick={() => navigate('/collections')}
        >
          <ArrowLeft size={16} />
          {isZh ? '返回合集列表' : 'Back to Collections'}
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "w-16 h-16 rounded-xl flex items-center justify-center text-3xl shadow-sm shrink-0",
                !collection.color && "bg-primary/10 text-primary"
              )}
              style={collection.color ? { backgroundColor: `${collection.color}20`, color: collection.color } : undefined}
            >
              {collection.icon || '📁'}
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{collection.name}</h1>
              <p className="text-base-content/60 max-w-2xl">
                {collection.description || (isZh ? '暂无描述' : 'No description')}
              </p>
              <div className="flex gap-4 mt-4 text-sm text-base-content/50">
                <span>{items.length} {isZh ? '个 Skill' : 'Skills'}</span>
                <span>•</span>
                <span>{isZh ? '创建于' : 'Created'}: {new Date(collection.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsShareModalOpen(true)}>
              <Share2 size={18} className="mr-2" />
              {isZh ? '分享' : 'Share'}
            </Button>
            <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
              <Settings size={18} className="mr-2" />
              {isZh ? '设置' : 'Settings'}
            </Button>
            <Button variant="primary">
              <Plus size={18} className="mr-2" />
              {isZh ? '添加 Skill' : 'Add Skill'}
            </Button>
          </div>
        </div>
      </div>

      {/* Skills List */}
      <div className="bg-base-100 rounded-xl border border-base-200 shadow-sm overflow-hidden">
        {items.length > 0 ? (
          <div className="divide-y divide-base-200">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 hover:bg-base-50 transition-colors group"
              >
                <div className="cursor-move text-base-content/20 hover:text-base-content/50">
                  <GripVertical size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{item.skill_name}</h3>
                    {item.note && (
                      <span className="text-xs bg-base-200 px-2 py-0.5 rounded text-base-content/60">
                        {item.note}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-base-content/50 font-mono truncate">
                    {item.skill_identifier}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/skill/${encodeURIComponent(item.skill_id)}`)}
                  >
                    <ExternalLink size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error hover:bg-error/10"
                    onClick={() => handleRemoveItem(item.skill_id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title={isZh ? '合集为空' : 'Collection is empty'}
            description={isZh ? '去浏览 Skills 并添加到此合集' : 'Browse skills and add them to this collection'}
            action={
              <Button onClick={() => navigate('/')} variant="outline" className="mt-4">
                {isZh ? '浏览 Skills' : 'Browse Skills'}
              </Button>
            }
          />
        )}
      </div>

      <CollectionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onConfirm={handleUpdate}
        collection={collection}
      />

      <ShareCollectionModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        collection={collection}
      />
    </div>
  );
};

export default CollectionDetail;
