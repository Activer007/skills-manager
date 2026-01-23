import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useFeaturedRepositories,
  useRefreshFeatured,
  useAddRepository,
  useRepositories,
} from '../hooks/useRepositories';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { toast as appToast } from '../store/useToastStore';
import { Plus, Check, Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface FeaturedRepositoriesProps {
  categoryIds?: string[];
  defaultExpandedCategories?: string[];
}

export function FeaturedRepositories({
  categoryIds,
  defaultExpandedCategories = ['official', 'community'],
}: FeaturedRepositoriesProps) {
  const { t, i18n } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState<string[]>(defaultExpandedCategories);

  const { data: config, isLoading } = useFeaturedRepositories();
  const refreshMutation = useRefreshFeatured();
  const { data: existingRepos } = useRepositories();
  const addMutation = useAddRepository();

  const isAdded = (url: string) => {
    return existingRepos?.some((repo) => repo.url.toLowerCase() === url.toLowerCase()) || false;
  };

  const getLocalizedText = (text: Record<string, string>) => {
    return text[i18n.language] || text['en'] || '';
  };

  // 分类过滤
  const categories = (() => {
    if (!config?.categories) return [];
    if (!categoryIds || categoryIds.length === 0) return config.categories;

    const byId = new Map(config.categories.map((c) => [c.id, c]));
    return categoryIds.map((id) => byId.get(id)).filter(Boolean) as typeof config.categories;
  })();

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 bg-muted/5 rounded-lg border border-dashed">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
      </div>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* 刷新按钮 */}
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          {refreshMutation.isPending ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          {t('repositories.featured.refresh')}
        </Button>
      </div>

      {/* 分类列表 */}
      {categories.map((category) => (
        <div key={category.id} className="border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden">
          {/* 分类头部 */}
          <button
            className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 transition-colors"
            onClick={() => toggleCategory(category.id)}
          >
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                {getLocalizedText(category.name)}
              </h3>
              <Badge variant="secondary" size="sm" className="h-5 px-1.5 min-w-[1.25rem]">
                {category.repositories.length}
              </Badge>
            </div>
            {expandedCategories.includes(category.id) ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* 仓库列表 */}
          {expandedCategories.includes(category.id) && (
            <div className="divide-y divide-border">
              {category.repositories.map((repo) => (
                <div key={repo.url} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{repo.name}</h4>
                      {repo.featured && (
                        <Badge variant="default" size="sm" className="text-[10px] h-4 px-1">
                          {t('repositories.featured')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {getLocalizedText(repo.description)}
                    </p>
                    {repo.tags && repo.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {repo.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-[10px] bg-muted text-muted-foreground rounded-full border"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    <Button
                      size="sm"
                      variant={isAdded(repo.url) ? "secondary" : "outline"}
                      onClick={() => {
                        addMutation.mutate(
                          {
                            url: repo.url,
                            name: repo.name,
                            scanSubdirs: repo.scan_subdirs // 从配置中读取是否扫描子目录
                          },
                          {
                            onSuccess: (data) => {
                              if (data.success) {
                                appToast.success(t('repositories.toast.added'));
                              } else {
                                appToast.error(data.message);
                              }
                            },
                            onError: (error) => {
                              appToast.error(`${t('repositories.toast.error')}: ${error}`);
                            },
                          }
                        );
                      }}
                      disabled={isAdded(repo.url) || addMutation.isPending}
                      className={isAdded(repo.url) ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400" : ""}
                    >
                      {isAdded(repo.url) ? (
                        <>
                          <Check className="w-3 h-3 mr-1.5" />
                          {t('repositories.added')}
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3 mr-1.5" />
                          {t('repositories.add')}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
