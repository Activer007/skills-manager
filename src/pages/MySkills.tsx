import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSkills, useUninstallSkill, useImportSkill, useImportLocalSkill } from '../hooks/useSkills';
import { useSkillConfig } from '../hooks/useSkillConfig';
import { useBatchSkillQuality } from '../hooks/useSkillQuality';
import { Github, HardDrive, Plus, FolderOpen, FileText, Settings, Shield, History, ToyBrick } from 'lucide-react';
import type { InstalledSkill, MarketplaceSkill } from '../types';
import { getLocalizedDescription } from '../utils/i18n';
import { invoke } from '@tauri-apps/api/core';
import { ConfigForm, type ConfigSchema } from '../components/ConfigForm';
import { toast } from '../store/useToastStore';
import { SkillCard } from '../components/SkillCard';
import { Button } from '../components/ui/Button';
import { SlideOver } from '../components/ui/SlideOver';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { cn } from '../utils/cn';
import { SkeletonCard } from '../components/SkeletonCard';
import { QualityScoreCard } from '../components/SkillQuality/QualityScoreCard';
import SecurityReportCard from '../components/SecurityReportCard';
import type { SkillScore } from '../types/scorer';
import type { SecurityReport } from '../types/security';
import { inferSchemaFromValues } from '../utils/schemaInference';
import ModalDialog from '../components/common/ModalDialog';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return JSON.stringify(error);
};

const mockSchema: ConfigSchema = {
  enableFeature: {
    type: 'boolean',
    label: 'Enable Advanced Features',
    description: 'Turn on experimental capabilities',
    default: true
  },
  logLevel: {
    type: 'enum',
    label: 'Log Level',
    options: ['info', 'warn', 'error', 'debug'],
    default: 'info'
  },
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Enter your API key here',
    required: true
  },
  maxRetries: {
    type: 'number',
    label: 'Max Retries',
    default: 3
  }
};

type SlideTab = 'overview' | 'config' | 'security' | 'hooks' | 'changelog';

const MySkills = () => {
  const { t, i18n } = useTranslation();
  const { data: installedSkills = [], isLoading } = useSkills();
  const uninstallMutation = useUninstallSkill();
  const importGithubMutation = useImportSkill();
  const importLocalMutation = useImportLocalSkill();
  const queryClient = useQueryClient();

  // Fetch quality scores for all skills
  const skillPaths = React.useMemo(() => installedSkills.map(s => s.localPath), [installedSkills]);
  const { data: qualityScores = [] } = useBatchSkillQuality(skillPaths);

  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'project'>('all');
  const [selectedSkill, setSelectedSkill] = useState<InstalledSkill | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeSlideTab, setActiveSlideTab] = useState<SlideTab>('overview');
  const [skillContent, setSkillContent] = useState<string>('');
  const [skillScore, setSkillScore] = useState<SkillScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'github' | 'local' | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importPath, setImportPath] = useState('');
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [isScanningSecurity, setIsScanningSecurity] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
  } | null>(null);

  // Load config for selected skill
  const { config: skillConfig, updateConfig, isUpdating: isConfigUpdating } = useSkillConfig(selectedSkill ? selectedSkill.id : null);

  const activeSchema = React.useMemo(() => {
    // 1. Priority: Schema defined in SKILL.md (backend parsed)
    if (selectedSkill?.configSchema && Object.keys(selectedSkill.configSchema).length > 0) {
        const schema = selectedSkill.configSchema as ConfigSchema;
        if (!schema.enabled) {
          return {
            enabled: {
              type: 'boolean' as const,
              label: i18n.language === 'zh' ? '启用此 Skill' : 'Enable this Skill',
              description: i18n.language === 'zh' ? '切换此 Skill 的启用状态' : 'Toggle this skill on or off',
              default: true
            },
            ...schema
          };
        }
        return schema;
    }

    // 2. Fallback: Infer from current config values
    if (skillConfig && Object.keys(skillConfig).length > 0) {
      const schema = inferSchemaFromValues(skillConfig);
      if (!schema.enabled) {
        return {
          enabled: {
            type: 'boolean' as const,
            label: i18n.language === 'zh' ? '启用此 Skill' : 'Enable this Skill',
            description: i18n.language === 'zh' ? '切换此 Skill 的启用状态' : 'Toggle this skill on or off',
            default: true
          },
          ...schema
        };
      }
      return schema;
    }

    // 3. Last resort: Mock schema (for dev/demo)
    return {
      enabled: {
        type: 'boolean' as const,
        label: i18n.language === 'zh' ? '启用此 Skill' : 'Enable this Skill',
        description: i18n.language === 'zh' ? '切换此 Skill 的启用状态' : 'Toggle this skill on or off',
        default: true
      },
      ...mockSchema
    };
  }, [skillConfig, selectedSkill, i18n.language]);

  // Create a map of path -> score
  const scoreMap = React.useMemo(() => {
    const map = new Map<string, SkillScore | null>();
    skillPaths.forEach((path, index) => {
      if (index < qualityScores.length) {
        map.set(path, qualityScores[index]);
      }
    });
    return map;
  }, [qualityScores, skillPaths]);


  const handleUninstall = (skill: InstalledSkill) => {
    if (uninstallMutation.isPending) return;

    setConfirmDialog({
      title: i18n.language === 'zh' ? '确认删除' : 'Confirm Deletion',
      message: (
        <div className="space-y-3 text-left text-sm text-slate-600 dark:text-slate-400">
          <p>
            {i18n.language === 'zh'
              ? `你确定要删除 Skill "${skill.name}" 吗？`
              : `Are you sure you want to delete the skill "${skill.name}"?`}
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>{i18n.language === 'zh' ? 'Skill 文件夹及所有文件' : 'Skill folder and all files'}</li>
            <li>{i18n.language === 'zh' ? '相关配置信息' : 'Related configuration'}</li>
          </ul>
          <p className="font-medium text-error">
            {i18n.language === 'zh' ? '此操作无法撤销！' : 'This action cannot be undone!'}
          </p>
        </div>
      ),
      confirmText: i18n.language === 'zh' ? '删除' : 'Delete',
      cancelText: i18n.language === 'zh' ? '取消' : 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await uninstallMutation.mutateAsync(skill.localPath);
          toast.success(`${skill.name} 已成功删除`);
        } catch (error: unknown) {
          toast.error(`删除失败: ${getErrorMessage(error)}`);
        }
      },
    });
  };

  const performImport = async () => {
    try {
      if (importType === 'github') {
        await importGithubMutation.mutateAsync({
          githubUrl: importUrl,
        } as MarketplaceSkill);
        toast.success('成功从 GitHub 导入 Skill！');
      } else if (importType === 'local') {
        await importLocalMutation.mutateAsync(importPath);
        toast.success('成功从本地导入 Skill！');
      }
      setShowImportModal(false);
      setImportUrl('');
      setImportPath('');
      setImportType(null);
    } catch (error: unknown) {
      toast.error(`导入失败: ${getErrorMessage(error)}`);
    }
  };

  const handleImport = () => {
    setConfirmDialog({
      title: i18n.language === 'zh' ? '安全提示' : 'Security Notice',
      message: (
        <div className="space-y-3 text-left text-sm text-slate-600 dark:text-slate-400">
          <p>
            {i18n.language === 'zh'
              ? '当前版本已启用安全检查功能。导入前会自动扫描 Skill 内容，检测以下危险模式：'
              : 'Security scanning is enabled. The skill will be scanned for:'}
          </p>
          <ul className="list-disc pl-4 space-y-1">
            <li>{i18n.language === 'zh' ? '破坏性操作（如 rm -rf /）' : 'Destructive operations (e.g., rm -rf /)'}</li>
            <li>{i18n.language === 'zh' ? '远程代码执行（如 curl | sh）' : 'Remote code execution (e.g., curl | sh)'}</li>
            <li>{i18n.language === 'zh' ? '命令注入（如 eval()）' : 'Command injection (e.g., eval())'}</li>
            <li>{i18n.language === 'zh' ? '数据泄露风险' : 'Data exfiltration risks'}</li>
          </ul>
          <p className="font-medium text-slate-700 dark:text-slate-300">
            {i18n.language === 'zh'
              ? '如检测到硬触发危险代码，将阻止导入。是否继续导入？'
              : 'Import will be blocked if critical patterns are detected. Continue importing?'}
          </p>
        </div>
      ),
      confirmText: i18n.language === 'zh' ? '继续导入' : 'Continue Import',
      cancelText: i18n.language === 'zh' ? '取消' : 'Cancel',
      onConfirm: () => {
        setConfirmDialog(null);
        void performImport();
      },
    });
  };

  const filteredSkills = installedSkills.filter(skill => {
    if (activeTab === 'all') return true;
    return skill.type === activeTab;
  });

  const handleViewSkill = async (skill: InstalledSkill, tab: SlideTab = 'overview') => {
    setSelectedSkill(skill);
    setShowViewModal(true);
    setActiveSlideTab(tab);

    // Check if we already have the score from batch analysis
    const cachedScore = scoreMap.get(skill.localPath);
    if (cachedScore) {
      setSkillScore(cachedScore);
      setIsAnalyzing(false);
    } else {
      setSkillScore(null);
      setIsAnalyzing(true);
      setAnalysisError(null);
      
      invoke<SkillScore>('analyze_skill_quality', {
        skillPath: skill.localPath
      })
      .then(score => {
        setSkillScore(score);
        setIsAnalyzing(false);
      })
      .catch(err => {
        console.error('Analysis failed:', err);
        setAnalysisError(typeof err === 'string' ? err : JSON.stringify(err));
        setIsAnalyzing(false);
      });
    }

    setSecurityReport(null);
    setIsScanningSecurity(true);

    invoke<SecurityReport>('scan_skill_security', {
      skillPath: skill.localPath,
      locale: i18n.language
    })
    .then(report => {
      setSecurityReport(report);
      setIsScanningSecurity(false);
    })
    .catch(err => {
      console.error('Security scan failed:', err);
      setIsScanningSecurity(false);
    });

    try {
      const content = await invoke<string>('read_skill', {
        skillPath: skill.localPath
      });
      setSkillContent(content);
    } catch (error) {
      console.error('Failed to load skill content:', error);
      setSkillContent(`# ${skill.name}\n\n${skill.description}\n\n**版本**: ${skill.version}\n**作者**: ${skill.author}\n\n**路径**: ${skill.localPath}`);
    }
  };

  const toggleSkillMutation = useMutation({
    mutationFn: async ({ skillId, nextEnabled, currentConfig }: { skillId: string; nextEnabled: boolean; currentConfig: Record<string, unknown> }) => {
      const nextConfig = { ...currentConfig, enabled: nextEnabled };
      await invoke('set_skill_config', { skillId, config: nextConfig });
      return nextConfig;
    },
    onMutate: async ({ skillId, nextEnabled }) => {
      await queryClient.cancelQueries({ queryKey: ['skills'] });
      const previousSkills = queryClient.getQueryData<InstalledSkill[]>(['skills']);
      queryClient.setQueryData<InstalledSkill[]>(['skills'], (old) =>
        old?.map((skill) =>
          skill.id === skillId
            ? { ...skill, enabled: nextEnabled, config: { ...(skill.config ?? {}), enabled: nextEnabled } }
            : skill
        ) ?? []
      );
      return { previousSkills };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousSkills) {
        queryClient.setQueryData(['skills'], context.previousSkills);
      }
    },
    onSuccess: (nextConfig, { skillId, nextEnabled }) => {
      queryClient.setQueryData<InstalledSkill[]>(['skills'], (old) =>
        old?.map((skill) =>
          skill.id === skillId
            ? { ...skill, enabled: nextEnabled, config: nextConfig }
            : skill
        ) ?? []
      );
      queryClient.invalidateQueries({ queryKey: ['skillConfig', skillId] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });

  const handleToggleSkill = async (skill: InstalledSkill) => {
    const nextEnabled = !(skill.enabled ?? true);
    try {
      await toggleSkillMutation.mutateAsync({
        skillId: skill.id,
        nextEnabled,
        currentConfig: skill.config ?? {}
      });
      toast.success(i18n.language === 'zh'
        ? `${skill.name} 已${nextEnabled ? '启用' : '禁用'}`
        : `${skill.name} ${nextEnabled ? 'enabled' : 'disabled'}`);
    } catch (error: unknown) {
      toast.error(i18n.language === 'zh'
        ? `更新状态失败: ${getErrorMessage(error)}`
        : `Failed to update status: ${getErrorMessage(error)}`);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportType(null);
    setImportUrl('');
    setImportPath('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('mySkills')}</h2>
            <p className="text-base-content/60">
              {i18n.language === 'zh'
                ? '管理本地安装的系统级和项目级 Skills'
                : 'Manage locally installed system and project Skills'}
            </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowImportModal(true)}
          className="whitespace-nowrap"
        >
            <Plus size={18} className="mr-2" />
            {t('importSkill')}
        </Button>
      </div>

      <div className="border-b border-gray-200 dark:border-base-300">
        <div className="flex gap-6 overflow-x-auto">
            {[ 
                { id: 'all', label: i18n.language === 'zh' ? '全部' : 'All' },
                { id: 'system', label: t('systemLevel') },
                { id: 'project', label: t('projectLevel') }
            ].map(tab => (
                 <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'all' | 'system' | 'project')}
                    className={cn(
                        "pb-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                        activeTab === tab.id
                            ? "border-primary text-primary"
                            : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                    )}
                >
                    {tab.label}
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-base-200 text-xs text-slate-600 dark:text-slate-400">
                        {tab.id === 'all' ? installedSkills.length : installedSkills.filter(s => s.type === tab.id).length}
                    </span>
                </button>
            ))}
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
           <div className="space-y-4">
             <SkeletonCard count={3} />
           </div>
        ) : filteredSkills.length > 0 ? (
            filteredSkills.map(skill => (
                <SkillCard
                    key={skill.id}
                    skill={{...skill, description: getLocalizedDescription(skill, i18n.language)}}
                    viewMode="list"
                    isInstalled={true}
                    isActive={skill.enabled ?? true}
                    onUninstall={async () => {
                      handleUninstall(skill);
                    }}
                    onViewDetails={() => handleViewSkill(skill, 'overview')}
                    onConfigure={() => handleViewSkill(skill, 'config')}
                    onToggle={async () => {
                      await handleToggleSkill(skill);
                    }}
                />
            ))
        ) : (
             <div className="text-center py-20 bg-white dark:bg-base-100 rounded-xl border border-dashed border-gray-200 dark:border-base-300">
                <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-slate-50 dark:bg-base-200 text-slate-400">
                        <FolderOpen size={32} />
                    </div>
                    <p className="text-slate-500 font-medium">
                      {i18n.language === 'zh'
                        ? `暂无 ${activeTab !== 'all' && (activeTab === 'system' ? '系统级' : '项目级')} Skills`
                        : `No ${activeTab !== 'all' ? activeTab : ''} Skills found`
                      }
                    </p>
                </div>
            </div>
        )}
      </div>

      {/* View SlideOver */} 
      <SlideOver
        isOpen={showViewModal}
        onClose={() => {
            setShowViewModal(false);
            setSelectedSkill(null);
            setSkillContent('');
            setSecurityReport(null);
        }}
        title={selectedSkill?.name}
        description={selectedSkill?.localPath}
        width="2xl"
        footer={
            <div className="flex justify-end gap-2">
                <Button
                    variant="outline"
                    onClick={() => {
                        setShowViewModal(false);
                        setSelectedSkill(null);
                        setSkillContent('');
                        setSecurityReport(null);
                    }}
                >
                    {i18n.language === 'zh' ? '关闭' : 'Close'}
                </Button>
            </div>
        }
      >
        {selectedSkill && (
            <div className="space-y-6">
                {/* Tabs Header */} 
                <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 dark:border-base-200 mb-6">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveSlideTab('overview')}
                        className={cn(
                            "rounded-none border-b-2 px-4",
                            activeSlideTab === 'overview'
                                ? "border-primary text-primary"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <FileText size={16} />
                        Overview
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveSlideTab('config')}
                        className={cn(
                            "rounded-none border-b-2 px-4",
                            activeSlideTab === 'config'
                                ? "border-primary text-primary"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Settings size={16} />
                        Configuration
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveSlideTab('security')}
                        className={cn(
                            "rounded-none border-b-2 px-4",
                            activeSlideTab === 'security'
                                ? "border-primary text-primary"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <Shield size={16} />
                        Security
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveSlideTab('hooks')}
                        className={cn(
                            "rounded-none border-b-2 px-4",
                            activeSlideTab === 'hooks'
                                ? "border-primary text-primary"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <ToyBrick size={16} />
                        Hooks
                        <span className="bg-slate-100 dark:bg-base-200 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded text-[10px]">New</span>
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveSlideTab('changelog')}
                        className={cn(
                            "rounded-none border-b-2 px-4",
                            activeSlideTab === 'changelog'
                                ? "border-primary text-primary"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        )}
                    >
                        <History size={16} />
                        Changelog
                    </Button>
                </div>

                {/* Tab Content */} 
                {activeSlideTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in duration-200">
                        {isAnalyzing ? (
                          <div className="card bg-white dark:bg-base-100 shadow-sm p-8 border border-gray-100 dark:border-base-200">
                            <div className="flex flex-col items-center gap-4">
                              <span className="loading loading-spinner loading-lg text-primary"></span>
                              <p className="text-slate-500">Analyzing skill quality...</p>
                            </div>
                          </div>
                        ) : analysisError ? (
                          <div className="alert alert-error">
                            <span>Analysis Failed: {analysisError}</span>
                          </div>
                        ) : skillScore && (
                          <QualityScoreCard
                            score={skillScore}
                          />
                        )}

                        <div className="prose prose-sm max-w-none bg-white dark:bg-base-100 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-base-200">
                          <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed font-mono bg-transparent">
                            {skillContent || 'Loading...'}
                          </pre>
                        </div>
                    </div>
                )}

                {activeSlideTab === 'config' && (
                    <div className="animate-in fade-in duration-200">
                        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl text-sm border border-blue-100 dark:border-blue-900/50">
                            This is a preview. The schema is currently mocked, but values are persisted to <code>~/.claude/skill-manager-config.json</code>.
                        </div>
                        <ConfigForm
                            schema={activeSchema}
                            initialValues={skillConfig || {}}
                            onSave={async (values) => {
                                try {
                                    await updateConfig(values);
                                    toast.success('Configuration saved successfully');
                                } catch (error) {
                                    console.error('Failed to save config:', error);
                                    toast.error('Failed to save configuration');
                                }
                            }}
                            isLoading={isConfigUpdating}
                        />
                    </div>
                )}

                {activeSlideTab === 'security' && (
                    <div className="animate-in fade-in duration-200">
                        <SecurityReportCard
                            report={securityReport}
                            loading={isScanningSecurity}
                        />
                    </div>
                )}

                {activeSlideTab === 'hooks' && (
                     <div className="animate-in fade-in duration-200">
                        <div className="text-center py-12 bg-slate-50 dark:bg-base-200 rounded-xl border border-dashed border-gray-200 dark:border-base-300">
                            <ToyBrick size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Hook Management Coming Soon</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                Manage lifecycle hooks like <code>pre-commit</code>, <code>post-install</code>, and MCP server integrations.
                            </p>
                        </div>
                     </div>
                )}

                {activeSlideTab === 'changelog' && (
                    <div className="animate-in fade-in duration-200 space-y-6">
                        <div className="relative pl-4 border-l-2 border-gray-100 dark:border-base-300 space-y-8">
                            {[ 
                                { version: '1.2.0', date: '2023-10-25', changes: ['Added support for new API endpoints', 'Fixed bug in authentication flow', 'Improved error handling'] },
                                { version: '1.1.5', date: '2023-10-10', changes: ['Performance optimizations', 'Updated dependencies'] },
                                { version: '1.0.0', date: '2023-09-01', changes: ['Initial release', 'Basic skill functionality'] },
                            ].map((release, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-white dark:ring-base-100"></div>
                                    <div className="flex flex-col gap-1 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-900 dark:text-slate-100">v{release.version}</span>
                                            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-base-200 px-2 py-0.5 rounded-full">{release.date}</span>
                                        </div>
                                    </div>
                                    <ul className="list-disc list-outside ml-4 text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                        {release.changes.map((change, j) => (
                                            <li key={j}>{change}</li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
      </SlideOver>

      {/* Import Modal */} 
      <Modal
        isOpen={showImportModal}
        onClose={closeImportModal}
        title={t('importSkill')}
        footer={
          !importType ? (
            <Button variant="ghost" onClick={closeImportModal}>
              {i18n.language === 'zh' ? '关闭' : 'Close'}
            </Button>
          ) : (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  setImportType(null);
                  setImportUrl('');
                  setImportPath('');
                }}
              >
                {i18n.language === 'zh' ? '返回' : 'Back'}
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={
                  importGithubMutation.isPending ||
                  importLocalMutation.isPending ||
                  (importType === 'github' ? !importUrl.trim() : !importPath.trim())
                }
                isLoading={importGithubMutation.isPending || importLocalMutation.isPending}
              >
                {(importGithubMutation.isPending || importLocalMutation.isPending) ? (
                  t('importing')
                ) : (
                  <>
                    <Plus size={18} className="mr-2" />
                    {i18n.language === 'zh' ? '确认导入' : 'Confirm Import'}
                  </>
                )}
              </Button>
            </div>
          )
        }
      >
        {!importType ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500 mb-4">
              {i18n.language === 'zh' ? '选择导入方式：' : 'Select import method:'}
            </p>

            <button
              type="button"
              className="w-full text-left card bg-slate-50 dark:bg-base-200 hover:bg-slate-100 dark:hover:bg-base-300 cursor-pointer transition-colors p-4 border border-gray-100 dark:border-base-300"
              onClick={() => setImportType('github')}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-white dark:bg-base-100 flex items-center justify-center shrink-0 border border-gray-100 dark:border-base-200">
                  <Github size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-base mb-1 text-slate-900 dark:text-slate-100">{t('importFromGitHub')}</div>
                  <div className="text-sm text-slate-500">
                    {i18n.language === 'zh'
                      ? '输入 GitHub 仓库 URL，支持完整仓库或子目录'
                      : 'Enter GitHub repository URL, supports full repo or subdirectory'}
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              className="w-full text-left card bg-slate-50 dark:bg-base-200 hover:bg-slate-100 dark:hover:bg-base-300 cursor-pointer transition-colors p-4 border border-gray-100 dark:border-base-300"
              onClick={() => setImportType('local')}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-white dark:bg-base-100 flex items-center justify-center shrink-0 border border-gray-100 dark:border-base-200">
                  <HardDrive size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-base mb-1 text-slate-900 dark:text-slate-100">{t('importFromLocal')}</div>
                  <div className="text-sm text-slate-500">
                    {i18n.language === 'zh'
                      ? '选择本地文件夹路径，必须包含 SKILL.md 文件'
                      : 'Select local folder path, must contain SKILL.md file'}
                  </div>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
              <div className="flex items-center gap-3">
                {importType === 'github' ? <Github size={20} /> : <HardDrive size={20} />}
                <span className="text-sm font-medium">
                  {importType === 'github' ? t('importFromGitHub') : t('importFromLocal')}
                </span>
              </div>
            </div>

            {importType === 'github' ? (
              <Input
                label={i18n.language === 'zh' ? 'GitHub 仓库 URL' : 'GitHub Repository URL'}
                placeholder="https://github.com/username/skill-name"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                helperText={i18n.language === 'zh'
                  ? '仓库必须包含 SKILL.md 文件'
                  : 'Repository must contain SKILL.md file'}
                autoFocus
              />
            ) : (
              <Input
                label={i18n.language === 'zh' ? '本地文件夹路径' : 'Local Folder Path'}
                placeholder="C:\\Users\\User\\Downloads\\my-skill"
                value={importPath}
                onChange={(e) => setImportPath(e.target.value)}
                helperText={i18n.language === 'zh'
                  ? '文件夹必须包含 SKILL.md 文件'
                  : 'Folder must contain SKILL.md file'}
                autoFocus
              />
            )}
          </div>
        )}
      </Modal>

      <ModalDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title ?? ''}
        message={confirmDialog?.message ?? ''}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={() => setConfirmDialog(null)}
        confirmText={confirmDialog?.confirmText}
        cancelText={confirmDialog?.cancelText}
        isDestructive={confirmDialog?.isDestructive}
        type={confirmDialog?.isDestructive ? 'confirm' : 'info'}
      />
    </div>
  );
};

export default MySkills;
