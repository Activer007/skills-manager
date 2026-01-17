import { useState, useMemo } from 'react';
import type { MarketplaceSkill, InstalledSkill } from '../types';
import { Switch } from './ui/Switch';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { TrustShield, type TrustLevel } from './TrustShield';
import { cn } from '../utils/cn';
import { Star, GitBranch, Trash2, Settings, Plug } from 'lucide-react';

// 常量定义
const ICON_SIZE = {
    GRID: { width: 'w-16', height: 'h-16', text: 'text-3xl', margin: 'mb-4' },
    LIST: { width: 'w-12', height: 'h-12', text: 'text-xl', margin: '' }
} as const;

// 预定义的颜色池，确保可访问性和视觉一致性
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

// 颜色生成函数（从字符串生成一致的颜色）
const stringToColor = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
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
    onViewDetails
}: SkillCardProps) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleInstall = async (e: React.MouseEvent) => {
        e.stopPropagation();
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

    // 使用 useMemo 缓存颜色计算结果
    const iconColor = useMemo(() => stringToColor(skill.name), [skill.name]);
    const iconInitial = useMemo(() => skill.name.substring(0, 1).toUpperCase(), [skill.name]);

    const getTrustLevel = (score?: number): TrustLevel => {
        if (score === undefined) return 'unknown';
        if (score >= 90) return 'verified';
        if (score >= 70) return 'safe';
        if (score >= 50) return 'warning';
        return 'critical';
    };

    const trustLevel = isInstalled ? getTrustLevel((skill as InstalledSkill).securityScore) : 'unknown';

    // Icon Placeholder Generator (based on name char)
    const renderIcon = () => {
        const sizeClass = viewMode === 'grid' ? ICON_SIZE.GRID : ICON_SIZE.LIST;
        return (
            <div
                className={cn(
                    "rounded-xl flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0",
                    sizeClass.width,
                    sizeClass.height,
                    sizeClass.text,
                    sizeClass.margin
                )}
                style={{ backgroundColor: iconColor }}
            >
                {iconInitial}
            </div>
        );
    };

    if (viewMode === 'list') {
        return (
            <div 
                className="group relative flex items-center gap-4 p-4 bg-white dark:bg-base-100 rounded-xl border border-gray-100 dark:border-base-200 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={onViewDetails}
            >
                {/* Icon */}
                {renderIcon()}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate">{skill.name}</h3>
                        {isMcp && (
                            <Badge variant="info" size="xs" className="gap-1">
                                <Plug size={10} /> MCP
                            </Badge>
                        )}
                        {isInstalled && (
                            <Badge variant={isActive ? "success" : "neutral"} size="xs">
                                {isActive ? "Active" : "Disabled"}
                            </Badge>
                        )}
                        {isInstalled && (
                            <TrustShield level={trustLevel} score={(skill as InstalledSkill).securityScore} size="sm" showLabel={false} />
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
                        <span>{skill.author || 'Unknown Author'}</span>
                        {isMarketplace && (
                            <>
                                <span className="flex items-center gap-1"><Star size={12} /> {(skill as MarketplaceSkill).stars}</span>
                                <span className="flex items-center gap-1"><GitBranch size={12} /> {(skill as MarketplaceSkill).forks}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isInstalled ? (
                        <>
                             <div onClick={(e) => e.stopPropagation()} className="flex items-center">
                                <Switch
                                    checked={isActive}
                                    onChange={handleToggle}
                                    size="sm"
                                />
                             </div>
                             <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onConfigure?.(); }}>
                                <Settings size={16} />
                             </Button>
                             <Button size="sm" variant="ghost" className="text-error" onClick={(e) => { e.stopPropagation(); onUninstall?.(); }}>
                                <Trash2 size={16} />
                             </Button>
                        </>
                    ) : (
                         <Button size="sm" variant="primary" onClick={handleInstall} isLoading={isLoading}>
                            Install
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    // Grid View
    return (
        <Card 
            className="group cursor-pointer hover:-translate-y-1 transition-transform duration-300 h-full flex flex-col"
            onClick={onViewDetails}
        >
            <CardContent className="flex-1 flex flex-col p-6">
                <div className="flex justify-between items-start">
                    {renderIcon()}
                    <div className="flex flex-col items-end gap-1">
                        {isMcp && (
                            <div className="flex items-center gap-1 text-xs font-bold bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full border border-blue-200 dark:border-blue-800">
                                <Plug size={12} />
                                MCP
                            </div>
                        )}
                        {isInstalled && (
                             <TrustShield level={trustLevel} score={(skill as InstalledSkill).securityScore} size="sm" />
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
                    <div className="text-xs text-slate-400 font-medium">
                        {skill.author || 'Unknown'}
                    </div>
                    {isInstalled ? (
                         <Button size="sm" variant="outline" className="h-8 min-h-0 text-xs" onClick={(e) => { e.stopPropagation(); onViewDetails?.(); }}>
                            Open
                        </Button>
                    ) : (
                        <Button 
                            size="sm" 
                            variant="primary" 
                            className="rounded-full h-8 min-h-0 px-4 text-xs shadow-primary/20 hover:shadow-primary/40 hover:shadow-lg"
                            onClick={handleInstall}
                            isLoading={isLoading}
                        >
                            Get
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
