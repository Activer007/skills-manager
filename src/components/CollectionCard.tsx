import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { Folder, Trash2, Edit2, Clock } from 'lucide-react';
import type { Collection } from '../types/collection';
import { cn } from '../utils/cn';

interface CollectionCardProps {
  collection: Collection;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const CollectionCard = ({
  collection,
  onClick,
  onEdit,
  onDelete
}: CollectionCardProps) => {
  const { i18n } = useTranslation();

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card
      className="group cursor-pointer hover:-translate-y-1 transition-transform duration-300 h-full flex flex-col"
      onClick={onClick}
    >
      <CardContent className="flex-1 flex flex-col p-6">
        <div className="flex justify-between items-start mb-4">
          <div
            className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center text-xl shadow-sm",
              !collection.color && "bg-primary/10 text-primary"
            )}
            style={collection.color ? { backgroundColor: `${collection.color}20`, color: collection.color } : undefined}
          >
            {collection.icon ? (
              <span>{collection.icon}</span>
            ) : (
              <Folder size={24} />
            )}
          </div>
          <Badge variant="neutral" size="sm">
            {collection.itemsCount || 0} items
          </Badge>
        </div>

        <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100 line-clamp-1">
          {collection.name}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
          {collection.description || (i18n.language === 'zh' ? '暂无描述' : 'No description')}
        </p>

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-base-200">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock size={12} />
            <span>{formatDate(collection.updatedAt)}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              onClick={(e) => { e.stopPropagation(); onEdit?.(); }}
            >
              <Edit2 size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-error hover:bg-error/10"
              onClick={(e) => { e.stopPropagation(); onDelete?.(); }}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
