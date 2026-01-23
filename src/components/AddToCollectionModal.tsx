import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { FolderPlus, X, Check, Search, Plus, Folder } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useCollections, useAddCollectionItem, useCreateCollection } from '../hooks/useCollections';
import { toast } from '../store/useToastStore';
import { cn } from '../utils/cn';

interface AddToCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill: {
    id: string;
    name: string;
    path?: string;
    identifier?: string;
  } | null;
}

export const AddToCollectionModal = ({
  isOpen,
  onClose,
  skill,
}: AddToCollectionModalProps) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const { data: collections = [], isLoading } = useCollections();
  const addMutation = useAddCollectionItem();
  const createMutation = useCreateCollection();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedCollectionId(null);
      setIsCreating(false);
      setNewCollectionName('');
    }
  }, [isOpen]);

  const filteredCollections = collections.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    if (!skill || !selectedCollectionId) return;

    try {
      await addMutation.mutateAsync({
        collection_id: selectedCollectionId,
        skill_id: skill.id,
        skill_name: skill.name,
        skill_path: skill.path,
        skill_identifier: skill.identifier,
      });
      toast.success(isZh ? '已添加到合集' : 'Added to collection');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(isZh ? '添加失败' : 'Failed to add');
    }
  };

  const handleCreateAndAdd = async () => {
    if (!skill || !newCollectionName.trim()) return;

    try {
      const newCollection = await createMutation.mutateAsync({
        name: newCollectionName,
      });

      await addMutation.mutateAsync({
        collection_id: newCollection.id,
        skill_id: skill.id,
        skill_name: skill.name,
        skill_path: skill.path,
        skill_identifier: skill.identifier,
      });

      toast.success(isZh ? '已创建并添加到合集' : 'Created and added to collection');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(isZh ? '操作失败' : 'Operation failed');
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-xl bg-white dark:bg-base-100 shadow-2xl border border-gray-100 dark:border-base-200 flex flex-col max-h-[80vh]">
          <div className="p-6 flex-shrink-0 border-b border-gray-100 dark:border-base-200">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <FolderPlus className="w-5 h-5 text-primary" />
                {isZh ? '添加到合集' : 'Add to Collection'}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {skill && (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 truncate">
                {isZh ? '将以下 Skill 添加到合集：' : 'Adding skill to collection:'} <span className="font-medium text-slate-700 dark:text-slate-300">{skill.name}</span>
              </p>
            )}
          </div>

          <div className="p-4 flex-1 overflow-y-auto min-h-[200px]">
            {isCreating ? (
              <div className="space-y-4 animate-in fade-in duration-200">
                <Input
                  label={isZh ? '合集名称' : 'Collection Name'}
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder={isZh ? '例如：常用工具' : 'e.g., Daily Tools'}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleCreateAndAdd}
                    disabled={!newCollectionName.trim() || createMutation.isPending}
                    isLoading={createMutation.isPending}
                  >
                    {isZh ? '创建并添加' : 'Create & Add'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsCreating(false)}
                  >
                    {isZh ? '取消' : 'Cancel'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isZh ? '搜索合集...' : 'Search collections...'}
                    className="input input-bordered w-full pl-9 h-10 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => setIsCreating(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 hover:border-primary hover:text-primary transition-colors text-slate-500 hover:bg-slate-50 dark:hover:bg-base-200"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-base-200 flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="font-medium">{isZh ? '新建合集' : 'Create New Collection'}</span>
                  </button>

                  {isLoading ? (
                    <div className="text-center py-8 text-slate-400">
                      <span className="loading loading-spinner loading-sm"></span>
                    </div>
                  ) : filteredCollections.length > 0 ? (
                    filteredCollections.map(collection => {
                      const isSelected = selectedCollectionId === collection.id;
                      const hasSkill = collection.items?.some(item =>
                        item.skill_id === skill?.id ||
                        (skill?.identifier && item.skill_identifier === skill.identifier)
                      );

                      return (
                        <button
                          key={collection.id}
                          onClick={() => !hasSkill && setSelectedCollectionId(collection.id)}
                          disabled={!!hasSkill}
                          className={cn(
                            "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left relative",
                            isSelected
                              ? "border-primary bg-primary/5 ring-1 ring-primary"
                              : "border-gray-100 dark:border-base-200 hover:border-gray-300 dark:hover:border-base-300 hover:bg-slate-50 dark:hover:bg-base-200",
                            hasSkill && "opacity-60 cursor-not-allowed bg-gray-50 dark:bg-base-200/50"
                          )}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                            style={{ backgroundColor: collection.color || '#3b82f6' }}
                          >
                            <span className="text-white drop-shadow-sm">{collection.icon || '📁'}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {collection.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {collection.items_count} {isZh ? '个 Skill' : 'skills'}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                              <Check className="w-5 h-5" />
                            </div>
                          )}
                          {hasSkill && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-success text-xs font-medium px-2 py-1 bg-success/10 rounded-full">
                              {isZh ? '已添加' : 'Added'}
                            </div>
                          )}
                        </button>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      {isZh ? '未找到合集' : 'No collections found'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!isCreating && (
            <div className="p-4 border-t border-gray-100 dark:border-base-200 flex justify-end gap-3 bg-gray-50 dark:bg-base-200/30 rounded-b-xl">
              <Button variant="ghost" onClick={onClose}>
                {isZh ? '取消' : 'Cancel'}
              </Button>
              <Button
                variant="primary"
                onClick={handleAdd}
                disabled={!selectedCollectionId || addMutation.isPending}
                isLoading={addMutation.isPending}
              >
                {isZh ? '添加' : 'Add'}
              </Button>
            </div>
          )}
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
