import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkills, useUninstallSkill, useImportSkill, useImportLocalSkill } from '../hooks/useSkills';
import { useBatchSkillQuality } from '../hooks/useSkillQuality';
import { X, Github, HardDrive, Plus, FolderOpen } from 'lucide-react';
import type { InstalledSkill, MarketplaceSkill } from '../types';
import { getLocalizedDescription } from '../utils/i18n';
import { invoke } from '@tauri-apps/api/core';
import { QualityScoreCard } from '../components/SkillQuality/QualityScoreCard';
import { SkeletonCard } from '../components/SkeletonCard';
import SecurityReportCard from '../components/SecurityReportCard';
import type { SkillScore } from '../types/scorer';
import type { SecurityReport } from '../types/security';
import { toast } from 'sonner';
import { SkillCard } from '../components/SkillCard';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return JSON.stringify(error);
};

const MySkills = () => {
  const { t, i18n } = useTranslation();
  const { data: installedSkills = [], isLoading } = useSkills();
  const uninstallMutation = useUninstallSkill();
  const importGithubMutation = useImportSkill();
  const importLocalMutation = useImportLocalSkill();

  // Fetch quality scores for all skills
  const skillPaths = React.useMemo(() => installedSkills.map(s => s.localPath), [installedSkills]);
  const { data: qualityScores = [] } = useBatchSkillQuality(skillPaths);

  const [activeTab, setActiveTab] = useState<'all' | 'system' | 'project'>('all');
  const [selectedSkill, setSelectedSkill] = useState<InstalledSkill | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
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


  const handleUninstall = async (skill: InstalledSkill) => {
    if (uninstallMutation.isPending) return;

    const confirmed = window.confirm(
      i18n.language === 'zh'
        ? `⚠️ 确认删除\n\n你确定要删除 Skill "${skill.name}" 吗？\n\n此操作将删除以下内容：\n• Skill 文件夹及所有文件\n• 相关配置信息\n\n此操作无法撤销！`
        : `⚠️ Confirm Deletion\n\nAre you sure you want to delete the skill "${skill.name}"?\n\nThis will remove:\n• Skill folder and all files\n• Related configuration\n\nThis action cannot be undone!`
    );

    if (!confirmed) return;

    try {
      await uninstallMutation.mutateAsync(skill.localPath);
      toast.success(`${skill.name} 已成功删除`);
    } catch (error: unknown) {
      toast.error(`删除失败: ${getErrorMessage(error)}`);
    }
  };

  const handleImport = async () => {
    const confirmed = window.confirm(
      i18n.language === 'zh'
        ? `⚠️ 安全提示\n\n当前版本已启用安全检查功能。\n\n导入前会自动扫描 Skill 内容，检测以下危险模式：\n• 破坏性操作（如 rm -rf /）\n• 远程代码执行（如 curl | sh）\n• 命令注入（如 eval()）\n• 数据泄露风险\n\n如检测到硬触发危险代码，将阻止导入。\n\n是否继续导入？`
        : `⚠️ Security Notice\n\nSecurity scanning is enabled. The skill will be scanned for:\n• Destructive operations (e.g., rm -rf /)\n• Remote code execution (e.g., curl | sh)\n• Command injection (e.g., eval())\n• Data exfiltration risks\n\nImport will be blocked if critical patterns are detected.\n\nContinue importing?`
    );

    if (!confirmed) return;

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

  const filteredSkills = installedSkills.filter(skill => {
    if (activeTab === 'all') return true;
    return skill.type === activeTab;
  });

  const handleViewSkill = async (skill: InstalledSkill) => {
    setSelectedSkill(skill);
    setShowViewModal(true);
    
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
                    onClick={() => setActiveTab(tab.id as any)}
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
                    isActive={true} 
                    onUninstall={() => handleUninstall(skill)}
                    onViewDetails={() => handleViewSkill(skill)}
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

      {/* View Modal */} 
      {showViewModal && selectedSkill && (
          <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-base-100">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-base-200 shrink-0">
                    <div>
                      <h3 className="font-bold text-xl flex items-center gap-2 text-slate-900 dark:text-slate-100">
                          {selectedSkill.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 font-mono">
                        {selectedSkill.localPath}
                      </p>
                    </div>
                    <button
                        className="btn btn-sm btn-circle btn-ghost"
                        onClick={() => {
                            setShowViewModal(false);
                            setSelectedSkill(null);
                            setSkillContent('');
                            setSecurityReport(null);
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-slate-50 dark:bg-base-200/50 p-6 space-y-6">
                    <SecurityReportCard
                      report={securityReport}
                      loading={isScanningSecurity}
                    />

                    {isAnalyzing ? (
                      <div className="card bg-white dark:bg-base-100 shadow-sm p-8">
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

                <div className="p-4 border-t border-gray-100 dark:border-base-200 bg-white dark:bg-base-100 flex justify-end gap-2 shrink-0">
                    <Button
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
            </div>
          </div>
      )}

      {/* Import Modal */} 
      {showImportModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg bg-white dark:bg-base-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">{t('importSkill')}</h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={closeImportModal}
              >
                <X size={20} />
              </button>
            </div>

            {!importType ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-500 mb-4">
                  {i18n.language === 'zh' ? '选择导入方式：' : 'Select import method:'}
                </p>

                <div
                  className="card bg-slate-50 dark:bg-base-200 hover:bg-slate-100 dark:hover:bg-base-300 cursor-pointer transition-colors p-4 border border-gray-100 dark:border-base-300"
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
                </div>

                <div
                  className="card bg-slate-50 dark:bg-base-200 hover:bg-slate-100 dark:hover:bg-base-300 cursor-pointer transition-colors p-4 border border-gray-100 dark:border-base-300"
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
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div
                  className="alert alert-info bg-info/10 text-info border-info/20"
                >
                  <div className="flex items-center gap-3">
                    {importType === 'github' ? <Github size={20} /> : <HardDrive size={20} />}
                    <span className="text-sm font-medium">
                      {importType === 'github' ? t('importFromGitHub') : t('importFromLocal')}
                    </span>
                  </div>
                </div>

                {importType === 'github' ? (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                        {i18n.language === 'zh' ? 'GitHub 仓库 URL' : 'GitHub Repository URL'}
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://github.com/username/skill-name"
                      className="input input-bordered w-full bg-white dark:bg-base-100"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      autoFocus
                    />
                    <label className="label">
                      <span className="label-text-alt text-slate-400">
                        {i18n.language === 'zh'
                          ? '仓库必须包含 SKILL.md 文件'
                          : 'Repository must contain SKILL.md file'}
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold text-slate-700 dark:text-slate-300">
                        {i18n.language === 'zh' ? '本地文件夹路径' : 'Local Folder Path'}
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="C:\\Users\\User\\Downloads\\my-skill"
                      className="input input-bordered w-full bg-white dark:bg-base-100"
                      value={importPath}
                      onChange={(e) => setImportPath(e.target.value)}
                      autoFocus
                    />
                    <label className="label">
                      <span className="label-text-alt text-slate-400">
                        {i18n.language === 'zh'
                          ? '文件夹必须包含 SKILL.md 文件'
                          : 'Folder must contain SKILL.md file'}
                      </span>
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
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
                    disabled={importGithubMutation.isPending || importLocalMutation.isPending || (importType === 'github' ? !importUrl.trim() : !importPath.trim())}
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MySkills;