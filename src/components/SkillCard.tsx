import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { MarketplaceSkill, InstalledSkill } from '../types';
import { Switch } from './ui/Switch';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { TrustShield } from './TrustShield';
import { CompatibilityBadge } from './CompatibilityBadge';
import { ShareSheet } from './ShareSheet';
import { cn } from '../utils/cn';
import { scoreToTrustLevel } from '../utils/securityHelpers';
import { Star, GitBranch, Trash2, Settings, Plug, Share2, User, GitFork, FolderPlus } from 'lucide-react';

// 常量定义
const ICON_SIZE = {
    GRID: { width: 'w-16', height: 'h-16', text: 'text-3xl', margin: 'mb-4' },
    LIST: { width: 'w-12', height: 'h-12', text: 'text-xl', margin: '' }
} as const;

// Predefined color palette for consistent and accessible colors
const COLOR_PALETTE = [
    '#3b82f6', // blue-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#ef4444', // red-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
] as const;

// Function to generate a consistent color from a string
const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Use the generated hash to pick a color from the palette
    return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
};

// Helper function to calculate perceived brightness of a color
const getBrightness = (hexColor: string): number => {
    // Remove '#' if present
    const color = hexColor.startsWith('#') ? hexColor.slice(1) : hexColor;
    // Parse hex to RGB
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    // Return perceived brightness using luminosity method (YIQ)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

interface SkillCardProps {
    skill: MarketplaceSkill | InstalledSkill;
    viewMode?: 'grid' | 'list';
    isInstalled?: boolean;
    isActive?: boolean;
    onInstall?: () => Promise<void>;
    onUninstall?: () => Promise<void>;
    onToggle?: () => Promise<void>;
    onConfigure?: () => void;
    onViewDetails?: () => void;
    onShare?: () => void;
    onFork?: () => void;
    onAddToCollection?: () => void;
}

export const SkillCard = ({
    skill,
    viewMode = 'grid',
    isInstalled = false,
    isActive = true,
    onInstall,
    onUninstall,
    onToggle,
    onConfigure,
    onViewDetails,
    onShare,
    onFork,
    onAddToCollection
}: SkillCardProps) => {
    const { i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [showShareSheet, setShowShareSheet] = useState(false);
    const isZh = i18n.language === 'zh';

    // 处理分享按钮点击 - 不在这里阻止冒泡，让调用者决定
    const handleShare = () => {
        if (onShare) {
            onShare();
        } else {
            setShowShareSheet(true);
        }
    };

    const handleFork = () => {
        onFork?.();
    };

    const handleAddToCollection = () => {
        onAddToCollection?.();
    };

    const handleInstall = async () => {
        if (onInstall) {
            setIsLoading(true);
            try {
                await onInstall();
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleToggle = async () => {
        if (onToggle) {
             await onToggle();
        }
    };

    const isMarketplace = 'stars' in skill;
    const isMcp = 'isMcp' in skill && skill.isMcp;
    const isFork = 'derivedFrom' in skill && !!(skill as InstalledSkill).derivedFrom;
    const forkType = 'forkType' in skill ? (skill as InstalledSkill).forkType : undefined;
    const sourceType = isMarketplace ? (skill as MarketplaceSkill).sourceType : undefined;
    const repositoryName = isMarketplace ? (skill as MarketplaceSkill).repositoryName : undefined;
    const repositoryUrl = isMarketplace ? (skill as MarketplaceSkill).githubUrl : undefined;

    // Memoize color calculation
    const iconColor = useMemo(() => stringToColor(skill.name), [skill.name]);
    const iconInitial = useMemo(() => skill.name.substring(0, 1).toUpperCase(), [skill.name]);

    // Use unified security score conversion utility
    // Supports both Marketplace Skill and Installed Skill security scores
    const trustLevel = useMemo(() => {
        const score = skill.securityScore;
        return score !== undefined ? scoreToTrustLevel(score) : 'unknown';
    }, [skill.securityScore]);

    // Determine text color based on background brightness
    const textColor = useMemo(() => {
        const brightness = getBrightness(iconColor);
        // If brightness is high, use dark text; otherwise, use light text
        return brightness > 0.5 ? 'text-slate-900' : 'text-slate-50';
    }, [iconColor]);

    const repositoryShortName = useMemo(() => {
        if (repositoryName) {
            const parts = repositoryName.split('/');
            return parts[parts.length - 1] || repositoryName;
        }
        if (!repositoryUrl) return undefined;
        const match = repositoryUrl.match(/github\.com\/([^/]+\/[^/]+)/i);
        if (!match) return undefined;
        const repoParts = match[1].split('/');
        return repoParts[repoParts.length - 1] || match[1];
    }, [repositoryName, repositoryUrl]);

    const renderSourceBadge = () => {
        if (!sourceType) return null;
        if (sourceType === 'featured') {
            return (
                <Badge
                    variant="warning"
                    size="xs"
                    className="gap-1"
                    title={isZh ? '官方精选' : 'Featured'}
                    data-testid="source-badge-featured"
                >
                    <Star size={10} /> {isZh ? '官方精选' : 'Featured'}
                </Badge>
            );
        }

        const label = repositoryShortName || (isZh ? '用户来源' : 'User Source');
        return (
            <Badge
                variant="info"
                size="xs"
                className="gap-1"
                title={repositoryName || label}
                data-testid="source-badge-user"
            >
                <User size={10} /> {label}
            </Badge>
        );
    };


    // Icon Placeholder Generator (based on name char)
    const renderIcon = () => {
        const sizeClass = viewMode === 'grid' ? ICON_SIZE.GRID : ICON_SIZE.LIST;
        return (
            <div
                className={cn(
                    // 统一圆角：rounded-lg (12px)
                    "rounded-lg flex items-center justify-center font-bold shadow-sm flex-shrink-0",
                    sizeClass.width,
                    sizeClass.height,
                    sizeClass.text,
                    sizeClass.margin,
                    textColor // Apply calculated text color
                )}
                style={{ backgroundColor: iconColor }}
            >
                {iconInitial}
            </div>
        );
    };

    if (viewMode === 'list') {
        return (
            <>
            <div
                data-testid="skill-card"
                role="button"
                tabIndex={0}
                // 统一圆角：rounded-lg (12px)
                // 统一过渡：duration-normal (200ms)
                className={cn(
                    "group relative flex items-center gap-4 p-4 rounded-lg border transition-all duration-normal cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50",
                    // 激活状态：正常样式
                    isActive && "bg-white dark:bg-base-100 border-gray-100 dark:border-base-200 hover:shadow-md hover:border-gray-200 dark:hover:border-base-300",
                    // 禁用状态：灰色样式，降低透明度
                    !isActive && "bg-gray-50 dark:bg-base-200/50 border-gray-200 dark:border-base-300 opacity-50 hover:opacity-70"
                )}
                onClick={onViewDetails}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onViewDetails?.();
                    }
                }}
            >
                {/* Icon */}
                {renderIcon()}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate" title={skill.name}>{skill.name}</h3>
                        {isMcp && (
                            <Badge variant="info" size="xs" className="gap-1">
                                <Plug size={10} /> MCP
                            </Badge>
                        )}
                        {isFork && (
                            <Badge variant="warning" size="xs" className="gap-1" title={forkType === 'remix' ? 'Remix' : 'Fork'}>
                                <GitFork size={10} /> {forkType === 'remix' ? 'Remix' : 'Fork'}
                            </Badge>
                        )}
                        {isMarketplace && renderSourceBadge()}
                        <CompatibilityBadge compatibility={skill.compatibility} size="sm" />
                        {isInstalled && (
                            <Badge variant={isActive ? "success" : "neutral"} size="xs">
                                {isActive ? "Active" : "Disabled"}
                            </Badge>
                        )}
                        {/* Display TrustShield - supports both Marketplace and Installed Skills */}
                        {skill.securityScore !== undefined && (
                            <TrustShield level={trustLevel} score={skill.securityScore} size="sm" showLabel={true} />
                        )}
                        {'version' in skill && (
                             <Badge variant="outline" size="xs" className="text-slate-400 font-normal">
                                v{(skill as InstalledSkill).version || '1.0.0'}
                            </Badge>
                        )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 pr-4">
                        {skill.description}
                    </p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                            {(skill as MarketplaceSkill).authorAvatar ? (
                                <img
                                    src={(skill as MarketplaceSkill).authorAvatar}
                                    alt={skill.author}
                                    className="w-4 h-4 rounded-full"
                                    onError={(e) => {
                                        // Fallback to icon if image fails
                                        e.currentTarget.style.display = 'none';
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <User size={12} className={cn("text-slate-400", (skill as MarketplaceSkill).authorAvatar ? "hidden" : "")} />
                            <span>{skill.author || 'Unknown Author'}</span>
                        </div>
                        {isMarketplace && (
                            <>
                                <span className="flex items-center gap-1"><Star size={12} /> {(skill as MarketplaceSkill).stars}</span>
                                <span className="flex items-center gap-1"><GitBranch size={12} /> {(skill as MarketplaceSkill).forks}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-base-100 pl-2 shadow-sm rounded-l-lg border-l border-t border-b border-gray-100 dark:border-base-200 absolute right-4 py-1.5 px-2">
                    {isInstalled ? (
                        <>
                             <div
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center px-1"
                                data-testid="skill-switch"
                                title={isActive ? (isZh ? '禁用 Skill' : 'Disable Skill') : (isZh ? '启用 Skill' : 'Enable Skill')}
                             >
                                <Switch
                                    checked={isActive}
                                    onChange={handleToggle}
                                    size="sm"
                                />
                             </div>
                             <div className="h-4 w-px bg-gray-200 dark:bg-base-300 mx-1" />
                             <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-base-200"
                                onClick={(e) => { e.stopPropagation(); onConfigure?.(); }}
                                title={isZh ? '设置' : 'Settings'}
                                data-testid="settings-button"
                             >
                                <Settings size={16} />
                             </Button>
                             <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-base-200"
                                onClick={(e) => { e.stopPropagation(); handleShare(); }}
                                title={isZh ? '分享' : 'Share'}
                                data-testid="share-button"
                             >
                                <Share2 size={16} />
                             </Button>
                             <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-base-200"
                                onClick={(e) => { e.stopPropagation(); handleAddToCollection(); }}
                                title={isZh ? '添加到合集' : 'Add to Collection'}
                                data-testid="add-to-collection-button"
                             >
                                <FolderPlus size={16} />
                             </Button>
                             <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-base-200"
                                onClick={(e) => { e.stopPropagation(); handleFork(); }}
                                title={isZh ? 'Fork/Remix' : 'Fork/Remix'}
                                data-testid="fork-button"
                             >
                                <GitFork size={16} />
                             </Button>
                             <Button
                                size="sm"
                                variant="error"
                                className="h-8 w-8 p-0"
                                onClick={(e) => { e.stopPropagation(); onUninstall?.(); }}
                                title={isZh ? '卸载' : 'Uninstall'}
                                data-testid="uninstall-button"
                             >
                                <Trash2 size={16} />
                             </Button>
                        </>
                    ) : (
                        <Button size="sm" variant="primary" onClick={handleInstall} isLoading={isLoading} data-testid="install-button">
                            Install
                        </Button>
                    )}
                </div>
            </div>
            {/* ShareSheet */}
            {showShareSheet && (
                <ShareSheet
                    skill={skill as InstalledSkill}
                    isOpen={showShareSheet}
                    onClose={() => setShowShareSheet(false)}
                />
            )}
        </>
        );
    }

    // Grid View
    return (
        <>
        <Card
            data-testid="skill-card"
            className="group cursor-pointer hover:-translate-y-1 transition-transform duration-300 h-full flex flex-col"
            onClick={onViewDetails}
        >
            <CardContent className="flex-1 flex flex-col p-6">
                <div className="flex justify-between items-start">
                    {renderIcon()}
                    <div className="flex flex-col items-end gap-1">
                        <CompatibilityBadge compatibility={skill.compatibility} size="sm" />
                        {isMcp && (
                            <div className="flex items-center gap-1 text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                                <Plug size={12} />
                                MCP
                            </div>
                        )}
                        {isFork && (
                            <div className="flex items-center gap-1 text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800" title={forkType === 'remix' ? 'Remix' : 'Fork'}>
                                <GitFork size={12} />
                                {forkType === 'remix' ? 'Remix' : 'Fork'}
                            </div>
                        )}
                        {isMarketplace && renderSourceBadge()}
                        {/* Display TrustShield - supports both Marketplace and Installed Skills */}
                        {skill.securityScore !== undefined && (
                             <TrustShield level={trustLevel} score={skill.securityScore} size="sm" showLabel={false} />
                        )}
                        {isMarketplace && (
                            <div className="flex items-center gap-1 text-xs font-medium bg-slate-100 dark:bg-base-200 px-2 py-1 rounded-full text-slate-600 dark:text-slate-400">
                                <Star size={12} className="fill-yellow-400 text-yellow-400" />
                                {(skill as MarketplaceSkill).stars}
                            </div>
                        )}
                    </div>
                </div>

                <h3 className="font-bold text-lg mb-2 text-slate-900 dark:text-slate-100 line-clamp-1" title={skill.name}>{skill.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 flex-1">
                    {skill.description}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-base-200">
                    <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                        {(skill as MarketplaceSkill).authorAvatar ? (
                            <img
                                src={(skill as MarketplaceSkill).authorAvatar}
                                alt={skill.author}
                                className="w-4 h-4 rounded-full"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                            />
                        ) : null}
                        <User size={12} className={cn("text-slate-400", (skill as MarketplaceSkill).authorAvatar ? "hidden" : "")} />
                        {skill.author || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-2">
                        {isInstalled && (
                            <>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-full h-8 min-h-0 px-3 text-xs"
                                    onClick={(e) => { e.stopPropagation(); handleAddToCollection(); }}
                                    title={isZh ? '添加到合集' : 'Add to Collection'}
                                    data-testid="add-to-collection-button"
                                >
                                    <FolderPlus size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-full h-8 min-h-0 px-3 text-xs"
                                    onClick={(e) => { e.stopPropagation(); handleFork(); }}
                                    title={isZh ? 'Fork/Remix' : 'Fork/Remix'}
                                    data-testid="fork-button"
                                >
                                    <GitFork size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-full h-8 min-h-0 px-3 text-xs"
                                    onClick={(e) => { e.stopPropagation(); handleShare(); }}
                                    title={isZh ? '分享' : 'Share'}
                                    data-testid="share-button"
                                >
                                    <Share2 size={14} />
                                </Button>
                            </>
                        )}
                        {isInstalled ? (
                            onUninstall ? (
                                <Button
                                    size="sm"
                                    variant="error"
                                    className="rounded-full h-8 min-h-0 px-4 text-xs"
                                    onClick={(e) => { e.stopPropagation(); onUninstall?.(); }}
                                    title={isZh ? '卸载' : 'Uninstall'}
                                    data-testid="uninstall-button"
                                >
                                    Uninstall
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 min-h-0 text-xs"
                                    onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}
                                    title={isZh ? '查看详情' : 'View details'}
                                    data-testid="open-button"
                                >
                                    Open
                                </Button>
                            )
                        ) : (
                            <Button
                                size="sm"
                                variant="primary"
                                className="rounded-full h-8 min-h-0 px-4 text-xs shadow-primary/20 hover:shadow-primary/40 hover:shadow-lg"
                                onClick={(e) => { e.stopPropagation(); handleInstall(); }}
                                isLoading={isLoading}
                                title={isZh ? '安装 Skill' : 'Install skill'}
                                data-testid="install-button"
                            >
                                Get
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
        {/* ShareSheet */}
        {showShareSheet && (
            <ShareSheet
                skill={skill as InstalledSkill}
                isOpen={showShareSheet}
                onClose={() => setShowShareSheet(false)}
            />
        )}
    </>
    );
};
