import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { FolderPlus, X, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Collection } from '../types/collection';

interface CollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { name: string; description?: string; color?: string; icon?: string }) => Promise<void>;
  collection?: Collection; // If provided, it's edit mode
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
];

const ICONS = ['📁', '📦', '🛠️', '🚀', '🎨', '🔒', '📚', '🤖'];

export const CollectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  collection,
}: CollectionModalProps) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const isEdit = !!collection;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [icon, setIcon] = useState(ICONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (collection) {
        setName(collection.name);
        setDescription(collection.description || '');
        setColor(collection.color || COLORS[0]);
        setIcon(collection.icon || ICONS[0]);
      } else {
        setName('');
        setDescription('');
        setColor(COLORS[0]);
        setIcon(ICONS[0]);
      }
      setError(null);
    }
  }, [isOpen, collection]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm({
        name,
        description: description.trim() || undefined,
        color,
        icon,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-xl bg-white dark:bg-base-100 shadow-2xl border border-gray-100 dark:border-base-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-primary" />
                {isEdit
                  ? (isZh ? '编辑合集' : 'Edit Collection')
                  : (isZh ? '创建新合集' : 'Create New Collection')}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  label={isZh ? '名称' : 'Name'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isZh ? '例如：Python 工具集' : 'e.g., Python Tools'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  {isZh ? '描述' : 'Description'}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea input-bordered w-full h-20 text-sm"
                  placeholder={isZh ? '可选' : 'Optional'}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    {isZh ? '颜色' : 'Color'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          color === c ? 'scale-125 ring-2 ring-offset-2 ring-primary' : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-slate-700 dark:text-slate-300">
                    {isZh ? '图标' : 'Icon'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ICONS.map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setIcon(i)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-colors ${
                          icon === i
                            ? 'bg-base-200 ring-2 ring-primary'
                            : 'hover:bg-base-200'
                        }`}
                      >
                        {i}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-error/10 text-error text-sm rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                  {isZh ? '取消' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  {isEdit
                    ? (isZh ? '保存' : 'Save')
                    : (isZh ? '创建' : 'Create')}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
