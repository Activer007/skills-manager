import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { GitFork, Wand2, AlertTriangle, X, FolderOpen } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { Button } from './ui/Button';
import { cn } from '../utils/cn';
import type { InstalledSkill } from '../types';
import type { ForkRequest, ForkType } from '../types/fork';
import { toast } from '../store/useToastStore';

interface ForkSkillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (newName: string, forkType: ForkType) => Promise<void>;
  skill: InstalledSkill;
  onSuccess?: (newPath: string) => void;
}

export const ForkSkillModal = ({
  isOpen,
  onClose,
  onConfirm,
  skill,
  onSuccess,
}: ForkSkillModalProps) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const [newName, setNewName] = useState('');
  const [forkType, setForkType] = useState<ForkType>('fork');
  const [forkReason, setForkReason] = useState('');
  const [targetLocation, setTargetLocation] = useState<'system' | 'custom'>('system');
  const [customPath, setCustomPath] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewName(`${skill.name}-fork`);
      setForkType('fork');
      setForkReason('');
      setTargetLocation('system');
      setCustomPath('');
      setError(null);
    }
  }, [isOpen, skill.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setError(isZh ? '请输入新 Skill 名称' : 'Please enter a new skill name');
      return;
    }

    if (targetLocation === 'custom' && !customPath.trim()) {
      setError(isZh ? '请输入目标路径' : 'Please enter target path');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 如果提供了 onConfirm 回调，使用旧的方式
      if (onConfirm) {
        await onConfirm(newName, forkType);
        onClose();
        return;
      }

      // 使用新的后端 API
      const request: ForkRequest = {
        parent_skill_id: skill.path, // 使用路径作为 ID
        parent_skill_name: skill.name,
        parent_skill_path: skill.path,
        new_skill_name: newName.trim(),
        fork_type: forkType,
        fork_reason: forkReason.trim() || undefined,
        target_location: targetLocation === 'system' ? 'system' : customPath,
      };

      const newPath = await invoke<string>('fork_skill', { request });

      toast.success(
        isZh
          ? `成功${forkType === 'fork' ? '派生' : '混创'} Skill: ${newName}`
          : `Successfully ${forkType === 'fork' ? 'forked' : 'remixed'} skill: ${newName}`
      );

      onSuccess?.(newPath);
      onClose();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      toast.error(isZh ? `派生失败: ${errorMsg}` : `Fork failed: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 dark:bg-black/50" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full rounded-xl bg-white dark:bg-base-100 shadow-2xl border border-gray-100 dark:border-base-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
                <GitFork className="w-5 h-5 text-primary" />
                {isZh ? '派生 Skill' : 'Fork Skill'}
              </Dialog.Title>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 原始 Skill 信息 */}
            <div className="bg-base-200 rounded-lg p-3 mb-4">
              <div className="text-xs text-base-content/60 mb-1">
                {isZh ? '原始 Skill' : 'Original Skill'}
              </div>
              <div className="font-medium">{skill.name}</div>
              {skill.author && (
                <div className="text-sm text-base-content/60">
                  {isZh ? '作者' : 'Author'}: {skill.author}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Fork 类型选择 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isZh ? '派生类型' : 'Fork Type'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForkType('fork')}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      forkType === 'fork'
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-base-300 hover:border-primary/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <GitFork className="w-4 h-4" />
                      <span className="font-medium">Fork</span>
                    </div>
                    <div className="text-xs text-base-content/60">
                      {isZh
                        ? '完整复制，用于修复、定制、扩展'
                        : 'Full copy for fixes, customization'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setForkType('remix')}
                    className={cn(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      forkType === 'remix'
                        ? 'border-secondary bg-secondary/5 ring-1 ring-secondary'
                        : 'border-base-300 hover:border-secondary/50'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Wand2 className="w-4 h-4" />
                      <span className="font-medium">Remix</span>
                    </div>
                    <div className="text-xs text-base-content/60">
                      {isZh
                        ? '混合创作，用于组合、创新'
                        : 'Mixed creation for innovation'}
                    </div>
                  </button>
                </div>
              </div>

              {/* 新 Skill 名称 */}
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

              {/* 派生原因（可选） */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {isZh ? '派生原因（可选）' : 'Fork Reason (Optional)'}
                </label>
                <textarea
                  value={forkReason}
                  onChange={(e) => setForkReason(e.target.value)}
                  className="textarea textarea-bordered w-full h-16"
                  placeholder={isZh ? '描述为什么要派生...' : 'Describe why forking...'}
                />
              </div>

              {/* 目标位置 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {isZh ? '保存位置' : 'Save Location'}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="location"
                      className="radio radio-primary radio-sm"
                      checked={targetLocation === 'system'}
                      onChange={() => setTargetLocation('system')}
                    />
                    <span className="text-sm">
                      {isZh ? '系统目录 (~/.claude/skills)' : 'System (~/.claude/skills)'}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="location"
                      className="radio radio-primary radio-sm"
                      checked={targetLocation === 'custom'}
                      onChange={() => setTargetLocation('custom')}
                    />
                    <span className="text-sm">{isZh ? '自定义路径' : 'Custom path'}</span>
                  </label>
                </div>
                {targetLocation === 'custom' && (
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      className="input input-bordered input-sm flex-1"
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                      placeholder={isZh ? '输入项目路径...' : 'Enter project path...'}
                    />
                    <button type="button" className="btn btn-sm btn-outline">
                      <FolderOpen className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {error && (
                <div className="p-3 bg-error/10 text-error text-sm rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                  {isZh ? '取消' : 'Cancel'}
                </Button>
                <Button type="submit" variant="primary" isLoading={isSubmitting}>
                  {forkType === 'fork' ? <GitFork className="w-4 h-4 mr-1" /> : <Wand2 className="w-4 h-4 mr-1" />}
                  {isZh
                    ? forkType === 'fork' ? '创建 Fork' : '创建 Remix'
                    : forkType === 'fork' ? 'Create Fork' : 'Create Remix'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
