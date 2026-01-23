import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '@headlessui/react';
import { User, X, Save, AlertTriangle } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import type { Creator, UpdateCreatorRequest } from '../types/creator';

interface EditCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: UpdateCreatorRequest) => Promise<void>;
  creator: Creator;
}

export const EditCreatorModal = ({
  isOpen,
  onClose,
  onSave,
  creator,
}: EditCreatorModalProps) => {
  const { i18n } = useTranslation();
  const isZh = i18n.language === 'zh';

  const [name, setName] = useState(creator.name);
  const [bio, setBio] = useState(creator.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(creator.avatar_url || '');
  const [githubUrl, setGithubUrl] = useState(creator.github_url || '');
  const [websiteUrl, setWebsiteUrl] = useState(creator.website_url || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when creator changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(creator.name);
      setBio(creator.bio || '');
      setAvatarUrl(creator.avatar_url || '');
      setGithubUrl(creator.github_url || '');
      setWebsiteUrl(creator.website_url || '');
      setError(null);
    }
  }, [isOpen, creator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        id: creator.id,
        name,
        bio: bio.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
        github_url: githubUrl.trim() || undefined,
        website_url: websiteUrl.trim() || undefined,
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
                <User className="w-5 h-5 text-primary" />
                {isZh ? '编辑资料' : 'Edit Profile'}
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
                  placeholder={isZh ? '你的名字' : 'Your name'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
                  {isZh ? '简介' : 'Bio'}
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="textarea input-bordered w-full h-24 text-sm"
                  placeholder={isZh ? '介绍一下你自己...' : 'Tell us about yourself...'}
                />
              </div>

              <div>
                <Input
                  label={isZh ? '头像 URL' : 'Avatar URL'}
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="GitHub"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/..."
                />
                <Input
                  label={isZh ? '个人网站' : 'Website'}
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://..."
                />
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
                  <Save size={18} className="mr-2" />
                  {isZh ? '保存' : 'Save'}
                </Button>
              </div>
            </form>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};
