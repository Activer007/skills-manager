import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useRepositories,
  useAddRepository,
  useDeleteRepository,
  useScanRepository,
  useToggleRepository
} from '../hooks/useRepositories';
import type { RepositoryCategory } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import ModalDialog from '../components/common/ModalDialog';
import { Card } from '../components/ui/Card';
import { toast as appToast } from '../store/useToastStore';
import { Switch } from '../components/ui/Switch';
import {
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Loader2,
  GitBranch,
  Calendar,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { FeaturedRepositories } from '../components/FeaturedRepositories';

export default function RepositoriesPage() {
  const { t, i18n } = useTranslation();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [scanSubdirs, setScanSubdirs] = useState(false);
  const [scanningRepoId, setScanningRepoId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const { data: repositories, isLoading, error, refetch } = useRepositories();
  const addMutation = useAddRepository();
  const deleteMutation = useDeleteRepository();
  const scanMutation = useScanRepository();
  const toggleMutation = useToggleRepository();

  // 从 URL 自动提取 owner 作为默认名称
  const handleUrlChange = (url: string) => {
    setNewRepoUrl(url);
    if (!newRepoName && url.includes('github.com/')) {
      const parts = url.split('/');
      // https://github.com/owner/repo
      if (parts.length >= 5) {
        const owner = parts[parts.length - 2];
        const repo = parts[parts.length - 1].replace('.git', '');
        // 默认使用 repo 名，如果想用 owner 名也可以
        setNewRepoName(repo || owner);
      }
    }
  };

  const handleAddRepository = () => {
    if (!newRepoUrl) return;

    addMutation.mutate(
      { url: newRepoUrl, name: newRepoName, scanSubdirs },
      {
        onSuccess: (data) => {
          if (data.success) {
            setShowAddForm(false);
            setNewRepoUrl('');
            setNewRepoName('');
            setScanSubdirs(false);
            appToast.success(t('repositories.toast.added'));

            // 自动触发扫描
            if (data.repositoryId) {
              handleScanRepository(data.repositoryId);
            }
          } else {
            appToast.error(data.message);
          }
        },
        onError: (error) => {
          appToast.error(`${t('repositories.toast.error')}: ${error}`);
        },
      }
    );
  };

  const handleDeleteRepository = (repoId: string, repoName: string) => {
    setDeleteConfirm({ id: repoId, name: repoName });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate(deleteConfirm.id, {
        onSuccess: (data) => {
          if (data.success) {
            appToast.success(t('repositories.toast.deleted'));
          } else {
            appToast.error(data.message);
          }
          setDeleteConfirm(null);
        },
        onError: (error) => {
          appToast.error(`${t('repositories.toast.deleteError')}: ${error}`);
          setDeleteConfirm(null);
        },
      });
    }
  };

  const handleScanRepository = (repoId: string) => {
    setScanningRepoId(repoId);
    scanMutation.mutate(repoId, {
      onSuccess: () => {
        setScanningRepoId(null);
        appToast.success(t('repositories.toast.foundSkills'));
      },
      onError: (error) => {
        setScanningRepoId(null);
        appToast.error(`${t('repositories.toast.scanError')}: ${error}`);
      },
    });
  };

  const handleToggleEnabled = (repoId: string, currentEnabled: boolean) => {
    toggleMutation.mutate({ id: repoId, enabled: !currentEnabled }, {
      onSuccess: (data) => {
        if (data.success) {
          appToast.success(t(currentEnabled ? 'repositories.toast.disabled' : 'repositories.toast.enabled'));
        }
      }
    });
  };

  const formatDate = (timestamp: number) => {
    try {
      // Fallback to undefined (browser default) if language is C or invalid
      const locale = (i18n.language && i18n.language !== 'C') ? i18n.language : undefined;
      return new Date(timestamp).toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      // Fallback to simple date string if toLocaleDateString fails
      return new Date(timestamp).toISOString().split('T')[0];
    }
  };

  const getCategoryBadgeVariant = (category: RepositoryCategory) => {
    switch (category) {
      case 'official': return 'primary';
      case 'community': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <p>{t('common.error')}: {error.message}</p>
        <Button variant="outline" className="mt-4" onClick={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{t('repositories.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('repositories.subtitle', { count: repositories?.length || 0 })}
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          {t('repositories.add')}
        </Button>
      </div>

      {/* 精选仓库部分 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-primary" />
          {t('repositories.featured.title')}
        </h2>
        <FeaturedRepositories />
      </div>

      {/* 仓库列表 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-primary" />
          {t('repositories.myRepositories')}
        </h2>

        <div className="grid gap-4">
          {repositories?.map((repo) => (
            <Card key={repo.id} className={`p-4 transition-all hover:shadow-md ${!repo.enabled ? 'opacity-70 bg-muted/30' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <h3 className="font-semibold text-lg truncate">{repo.name}</h3>
                    {repo.featured && (
                      <Badge variant="secondary" size="sm">{t('repositories.featuredBadge')}</Badge>
                    )}
                    <Badge variant={getCategoryBadgeVariant(repo.category)} size="sm">
                      {repo.category}
                    </Badge>
                    {!repo.enabled && (
                      <Badge variant="error" size="sm">{t('common.disabled')}</Badge>
                    )}
                  </div>

                  <a
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors truncate w-fit"
                  >
                    {repo.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {repo.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {repo.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {t('repositories.addedAt')}: {formatDate(repo.addedAt)}
                    </div>
                    {repo.lastScanned ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('repositories.lastScanned')}: {formatDate(repo.lastScanned)}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <Loader2 className="w-3 h-3" />
                        {t('repositories.neverScanned')}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-center">
                  <div className="flex items-center mr-2">
                    <Switch
                      checked={repo.enabled}
                      onChange={() => handleToggleEnabled(repo.id, repo.enabled)}
                      size="sm"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleScanRepository(repo.id)}
                    disabled={!repo.enabled || scanningRepoId === repo.id || scanMutation.isPending}
                    title={t('repositories.scan')}
                  >
                    {scanningRepoId === repo.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="sr-only sm:not-sr-only sm:ml-2">{t('repositories.scan')}</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRepository(repo.id, repo.name)}
                    disabled={deleteMutation.isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    title={t('repositories.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {repositories?.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-muted rounded-xl bg-muted/10">
              <GitBranch className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium">{t('repositories.empty')}</p>
              <Button
                variant="link"
                onClick={() => setShowAddForm(true)}
                className="mt-2"
              >
                {t('repositories.addFirst')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 添加仓库模态框 */}
      <ModalDialog
        isOpen={showAddForm}
        onCancel={() => setShowAddForm(false)}
        title={t('repositories.addDialog.title')}
        message=""
      >
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('repositories.addDialog.url')} <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="https://github.com/owner/repo"
              value={newRepoUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              {t('repositories.addDialog.urlHelp')}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('repositories.addDialog.name')}
            </label>
            <Input
              placeholder={t('repositories.addDialog.namePlaceholder')}
              value={newRepoName}
              onChange={(e) => setNewRepoName(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              checked={scanSubdirs}
              onChange={setScanSubdirs}
            />
            <label
              htmlFor="scan-subdirs"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {t('repositories.addDialog.scanSubdirs')}
            </label>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleAddRepository}
              disabled={!newRepoUrl || addMutation.isPending}
            >
              {addMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {t('repositories.add')}
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* 删除确认模态框 */}
      <ModalDialog
        isOpen={!!deleteConfirm}
        onCancel={() => setDeleteConfirm(null)}
        title={t('repositories.delete')}
        message={
          <div className="text-sm text-muted-foreground">
             {t('repositories.deleteConfirm', { name: deleteConfirm?.name, defaultValue: `Are you sure you want to delete ${deleteConfirm?.name}?` })}
          </div>
        }
        confirmText={t('repositories.delete')}
        cancelText={t('common.cancel')}
        onConfirm={confirmDelete}
        type="confirm"
        isDestructive
      />
    </div>
  );
}
