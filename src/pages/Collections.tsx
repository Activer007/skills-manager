import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FolderOpen, Loader2 } from 'lucide-react';
import { useCollections, useCreateCollection, useUpdateCollection, useDeleteCollection } from '../hooks/useCollections';
import { CollectionCard } from '../components/CollectionCard';
import { CollectionModal } from '../components/CollectionModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import type { Collection } from '../types/collection';
import { toast } from '../store/useToastStore';
import ModalDialog from '../components/common/ModalDialog';

const Collections = () => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const { data: collections = [], isLoading } = useCollections();
  const createMutation = useCreateCollection();
  const updateMutation = useUpdateCollection();
  const deleteMutation = useDeleteCollection();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<Collection | null>(null);

  const handleCreate = async (data: { name: string; description?: string; color?: string; icon?: string }) => {
    await createMutation.mutateAsync(data);
    toast.success(isZh ? '合集创建成功' : 'Collection created successfully');
  };

  const handleUpdate = async (data: { name: string; description?: string; color?: string; icon?: string }) => {
    if (!editingCollection) return;
    await updateMutation.mutateAsync({ id: editingCollection.id, ...data });
    toast.success(isZh ? '合集更新成功' : 'Collection updated successfully');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await deleteMutation.mutateAsync(deleteConfirm.id);
    toast.success(isZh ? '合集已删除' : 'Collection deleted');
    setDeleteConfirm(null);
  };

  const openCreateModal = () => {
    setEditingCollection(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (collection: Collection) => {
    setEditingCollection(collection);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {isZh ? '我的合集' : 'My Collections'}
          </h2>
          <p className="text-base-content/60">
            {isZh ? '组织和管理您的常用 Skill 组合' : 'Organize and manage your favorite skill sets'}
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus size={18} className="mr-2" />
          {isZh ? '新建合集' : 'New Collection'}
        </Button>
      </div>

      {collections.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {collections.map((collection) => (
            <CollectionCard
              key={collection.id}
              collection={collection}
              onClick={() => {
                // TODO: Navigate to collection detail page
                // navigate(`/collections/${collection.id}`);
                toast.info(isZh ? '详情页开发中' : 'Detail view coming soon');
              }}
              onEdit={() => openEditModal(collection)}
              onDelete={() => setDeleteConfirm(collection)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FolderOpen />}
          title={isZh ? '暂无合集' : 'No Collections'}
          description={isZh ? '创建一个合集来组织您的 Skills' : 'Create a collection to organize your skills'}
          action={
            <Button variant="outline" onClick={openCreateModal}>
              {isZh ? '创建第一个合集' : 'Create First Collection'}
            </Button>
          }
        />
      )}

      <CollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={editingCollection ? handleUpdate : handleCreate}
        collection={editingCollection}
      />

      <ModalDialog
        isOpen={!!deleteConfirm}
        title={isZh ? '删除合集' : 'Delete Collection'}
        message={
          isZh
            ? `确定要删除合集 "${deleteConfirm?.name}" 吗？其中的 Skills 不会被卸载。`
            : `Are you sure you want to delete "${deleteConfirm?.name}"? The skills within it will not be uninstalled.`
        }
        confirmText={isZh ? '删除' : 'Delete'}
        cancelText={isZh ? '取消' : 'Cancel'}
        isDestructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        type="confirm"
      />
    </div>
  );
};

export default Collections;
