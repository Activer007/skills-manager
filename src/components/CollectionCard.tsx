import React from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, MoreVertical, Edit, Trash2, Calendar, Layers, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Collection } from '../types/collection';
import { cn } from '../utils/cn';

interface CollectionCardProps {
  collection: Collection;
  onEdit?: (collection: Collection) => void;
  onDelete?: (collection: Collection) => void;
  onShare?: (collection: Collection) => void;
}

export const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  onEdit,
  onDelete,
  onShare,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isZh = i18n.language === 'zh';

  const handleClick = () => {
    navigate(`/collections/${collection.id}`);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(isZh ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div
      className="group relative bg-base-100 border border-base-200 rounded-xl p-4 hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
      onClick={handleClick}
    >
      {/* 图标和标题 */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          collection.color ? `bg-${collection.color}-100 text-${collection.color}-600` : "bg-primary/10 text-primary"
        )}>
          {collection.icon ? (
            <span className="text-xl">{collection.icon}</span>
          ) : (
            <Folder className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base truncate pr-6">{collection.name}</h3>
          <p className="text-xs text-base-content/60 line-clamp-1">
            {collection.description || (isZh ? '暂无描述' : 'No description')}
          </p>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="flex items-center gap-4 text-xs text-base-content/50 mb-4">
        <div className="flex items-center gap-1">
          <Layers className="w-3 h-3" />
          <span>{collection.items_count || 0} {isZh ? '个 Skill' : 'Skills'}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(collection.updated_at)}</span>
        </div>
      </div>

      {/* 操作菜单 */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="dropdown dropdown-end">
          <button
            tabIndex={0}
            className="btn btn-ghost btn-xs btn-square"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          <ul
            tabIndex={0}
            className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-200"
          >
            <li>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare?.(collection);
                }}
                className="flex items-center gap-2"
              >
                <Share2 className="w-3 h-3" />
                {isZh ? '分享' : 'Share'}
              </button>
            </li>
            <li>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(collection);
                }}
                className="flex items-center gap-2"
              >
                <Edit className="w-3 h-3" />
                {isZh ? '编辑' : 'Edit'}
              </button>
            </li>
            <li>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(collection);
                }}
                className="flex items-center gap-2 text-error"
              >
                <Trash2 className="w-3 h-3" />
                {isZh ? '删除' : 'Delete'}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
