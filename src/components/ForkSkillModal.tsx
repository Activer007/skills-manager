import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { GitFork, AlertTriangle, X } from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import type { InstalledSkill } from '../types';

interface ForkSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string, forkType: 'fork' | 'remix') => Promise<void>;
  skill: InstalledSkill;
}

export const ForkSkillModal = ({
  isOpen,
  onClose,
  onConfirm,
  skill,
}: ForkSkillModalProps) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [newName, setNewName] = useState('');
  const [forkType, setForkType] = useState<'fork' | 'remix'>('fork');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewName(`${skill.name}-fork`);
      setForkType('fork');
      setError(null);
    }
  }, [isOpen, skill.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm(newName, forkType);
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
                <GitFork className="w-5 h-5 text-primary" />
                {isZh ? 'Fork Skill' : 'Fork Skill'}
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
                <label className="block text-sm font-medium mb-1">
                  {isZh ? '新 Skill 名称' : 'New Skill Name'}
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="my-awesome-skill"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  {isZh ? 'Fork 类型' : 'Fork Type'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForkType('fork')}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      forkType === 'fork'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-base-300 hover:border-primary/50'
                    )}
                  >
                    <div className="font-medium mb-1">Fork</div>
                    <div className="text-xs text-base-content/60">
                      {isZh
                        ? '直接复制，用于修改或修复'
                        : 'Direct copy for modifications or fixes'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForkType('remix')}
                    className={cn(
                      'p-3 rounded-lg border text-left transition-all',
                      forkType === 'remix'
                        ? 'border-secondary bg-secondary/5 ring-1 ring-secondary'
                        : 'border-base-300 hover:border-secondary/50'
                    )}
                  >
                    <div className="font-medium mb-1">Remix</div>
                    <div className="text-xs text-base-content/60">
                      {isZh
                        ? '基于此 Skill 创建新功能'
                        : 'Create new features based on this skill'}
                    </div>
                  </button>
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
                  {isZh ? '创建 Fork' : 'Create Fork'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
