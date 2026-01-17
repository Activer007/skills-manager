import { useState } from 'react';
import { MarketplaceSkill, InstalledSkill } from '../types';
import { Card, CardContent } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { cn } from '../utils/cn';
import { Star, GitBranch, Trash2, Play, Pause, Settings } from 'lucide-react';

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

    const handleToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onToggle) {
             await onToggle();
        }
    };

    const isMarketplace = 'stars' in skill;
    
    // Icon Placeholder Generator (based on name char)
    const renderIcon = () => (
        <div className={cn(
            "rounded-xl flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0",
            viewMode === 'grid' ? "w-16 h-16 text-3xl mb-4" : "w-12 h-12 text-xl"
        )}
        style={{ backgroundColor: stringToColor(skill.name) }}
        >
            {skill.name.substring(0, 1).toUpperCase()}
        </div>
    );

    // Helper for color generation
    const stringToColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
        return '#' + '00000'.substring(0, 6 - c.length) + c;
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
                        {isInstalled && (
                            <Badge variant={isActive ? "success" : "neutral"} size="xs">
                                {isActive ? "Active" : "Disabled"}
                            </Badge>
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
                             <Button size="sm" variant="ghost" onClick={handleToggle} title={isActive ? "Disable" : "Enable"}>
                                {isActive ? <Pause size={16} /> : <Play size={16} />}
                             </Button>
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
                    {isMarketplace && (
                        <div className="flex items-center gap-1 text-xs font-medium bg-slate-100 dark:bg-base-200 px-2 py-1 rounded-full text-slate-600 dark:text-slate-400">
                             <Star size={12} className="fill-yellow-400 text-yellow-400" />
                             {(skill as MarketplaceSkill).stars}
                        </div>
                    )}
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
