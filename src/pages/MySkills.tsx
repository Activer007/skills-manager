import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSkills, useUninstallSkill, useImportSkill, useImportLocalSkill } from '../hooks/useSkills';
import { Trash2, Eye, FolderOpen, X, Github, HardDrive, Plus, Shield } from 'lucide-react';
import type { InstalledSkill, MarketplaceSkill } from '../types';
import { getLocalizedDescription } from '../utils/i18n';
import { invoke } from '@tauri-apps/api/core';
import SkillQualityCard from '../components/SkillQualityCard';
import { SkeletonCard } from '../components/SkeletonCard';
import SecurityReportCard from '../components/SecurityReportCard';
import type { SkillScore } from '../types/scorer';
import type { SecurityReport } from '../types/security';
import { toast } from 'sonner';

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

  const handleUninstall = async (skill: InstalledSkill) => {
    if (uninstallMutation.isPending) return;

    try {
      await uninstallMutation.mutateAsync(skill.localPath);
      toast.success(`${skill.name} 已成功删除`);
    } catch (error: unknown) {
      toast.error(`删除失败: ${getErrorMessage(error)}`);
    }
  };

  const handleImport = async () => {
    // 显示安全警告
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
      // 重置状态
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
    setSkillScore(null);
    setIsAnalyzing(true);
    setAnalysisError(null);
    setSecurityReport(null);
    setIsScanningSecurity(true);

    // Analyze skill quality
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

    // Scan security
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

    // 读取 SKILL.md 文件内容
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
            <h2 className="text-2xl font-bold">{t('mySkills')}</h2>
            <p className="text-base-content/60">
              {i18n.language === 'zh'
                ? '管理本地安装的系统级和项目级 Skills'
                : 'Manage locally installed system and project Skills'}
            </p>
        </div>
        <button
          className="btn btn-primary gap-2"
          onClick={() => setShowImportModal(true)}
        >
            <Plus size={18} />
            {t('importSkill')}
        </button>
      </div>

      {/* Tabs */}
      <div role="tablist" className="tabs tabs-boxed bg-base-100 p-1 w-fit">
        <a
            role="tab"
            className={`tab ${activeTab === 'all' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('all')}
        >
            {i18n.language === 'zh' ? '全部' : 'All'} ({installedSkills.length})
        </a>
        <a
            role="tab"
            className={`tab ${activeTab === 'system' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('system')}
        >
            {t('systemLevel')} ({installedSkills.filter(s => s.type === 'system').length})
        </a>
        <a
            role="tab"
            className={`tab ${activeTab === 'project' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('project')}
        >
            {t('projectLevel')} ({installedSkills.filter(s => s.type === 'project').length})
        </a>
      </div>

      <div className="overflow-x-auto bg-base-100 rounded-xl shadow-sm border border-base-200">
        <table className="table">
          <thead>
            <tr>
              <th>{i18n.language === 'zh' ? '名称 / 路径' : 'Name / Path'}</th>
              <th>{t('description')}</th>
              <th>{t('type')}</th>
              <th>{i18n.language === 'zh' ? '安全状态' : 'Security Status'}</th>
              <th className="text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5}>
                  <div className="space-y-3 p-4">
                    <SkeletonCard count={3} />
                  </div>
                </td>
              </tr>
            ) : (
              filteredSkills.map((skill) => (
              <tr key={skill.id} className="hover">
                <td>
                  <div className="font-bold flex items-center gap-2">
                    {skill.name}
                  </div>
                  <div className="text-xs text-base-content/40 font-mono truncate max-w-[200px]" title={skill.localPath}>
                    {skill.localPath}
                  </div>
                </td>
                <td className="max-w-xs">
                    <div className="line-clamp-3" title={getLocalizedDescription(skill, i18n.language)}>
                      {getLocalizedDescription(skill, i18n.language)}
                    </div>
                </td>
                <td>
                  {skill.type === 'system' ? (
                      <span className="badge badge-neutral badge-sm">{t('system')}</span>
                  ) : (
                      <span className="badge badge-accent badge-outline badge-sm">{t('project')}</span>
                  )}
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    {/* Security Score */}
                    {skill.securityScore !== undefined ? (
                      <div className="flex items-center gap-1.5">
                        <Shield size={14} className={
                          skill.securityScore >= 90 ? 'text-success' :
                          skill.securityScore >= 70 ? 'text-warning' :
                          'text-error'
                        } />
                        <span className={`font-semibold ${
                          skill.securityScore >= 90 ? 'text-success' :
                          skill.securityScore >= 70 ? 'text-warning' :
                          'text-error'
                        }`}>
                          {skill.securityScore}
                        </span>
                      </div>
                    ) : (
                      <span className="text-base-content/30 text-sm">未扫描</span>
                    )}

                    {/* Status Badge */}
                    {skill.status === 'safe' && <div className="badge badge-success badge-sm gap-1">安全</div>}
                    {skill.status === 'unsafe' && <div className="badge badge-error badge-sm gap-1">风险</div>}
                    {skill.status === 'unknown' && <div className="badge badge-ghost badge-sm gap-1">未知</div>}
                  </div>
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => handleViewSkill(skill)}
                    >
                        <Eye size={16} />
                        {t('view')}
                    </button>
                    <button
                        className="btn btn-sm btn-ghost text-error hover:bg-error/10"
                        onClick={() => handleUninstall(skill)}
                        disabled={uninstallMutation.isPending}
                    >
                        <Trash2 size={16} />
                        {t('remove')}
                    </button>
                  </div>
                </td>
              </tr>
            ))
            )}
          </tbody>
        </table>
        {filteredSkills.length === 0 && (
            <div className="text-center py-12 text-base-content/50">
                <div className="flex flex-col items-center gap-2">
                    <FolderOpen size={48} strokeWidth={1} />
                    <p>
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
            <div className="modal-box w-11/12 max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-base-200 bg-base-100 shrink-0">
                    <div>
                      <h3 className="font-bold text-xl flex items-center gap-2">
                          {selectedSkill.name}
                      </h3>
                      <p className="text-xs text-base-content/50 mt-1 font-mono">
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

                {/* Content */}
                <div className="flex-1 overflow-auto bg-base-200 p-6 space-y-6">
                    {/* Security Report Card */}
                    <SecurityReportCard
                      report={securityReport}
                      loading={isScanningSecurity}
                    />

                    {/* Quality Score Card */}
                    <SkillQualityCard
                      score={skillScore!}
                      isLoading={isAnalyzing}
                      error={analysisError}
                    />

                    <div className="prose prose-sm max-w-none bg-base-100 p-6 rounded-lg shadow-sm">
                      <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed font-mono bg-transparent">
                        {skillContent || '加载中...'}
                      </pre>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-base-200 bg-base-100 flex justify-end gap-2 shrink-0">
                    <button
                      className="btn"
                      onClick={() => {
                        setShowViewModal(false);
                        setSelectedSkill(null);
                        setSkillContent('');
                        setSecurityReport(null);
                      }}
                    >
                      {i18n.language === 'zh' ? '关闭' : 'Close'}
                    </button>
                </div>
            </div>
          </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">{t('importSkill')}</h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={closeImportModal}
              >
                <X size={20} />
              </button>
            </div>

            {!importType ? (
              /* 选择导入方式 */
              <div className="space-y-3">
                <p className="text-sm text-base-content/60 mb-4">
                  {i18n.language === 'zh' ? '选择导入方式：' : 'Select import method:'}
                </p>

                <div
                  className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors p-4"
                  onClick={() => setImportType('github')}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-base-100 flex items-center justify-center shrink-0">
                      <Github size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base mb-1">{t('importFromGitHub')}</div>
                      <div className="text-sm text-base-content/60">
                        {i18n.language === 'zh'
                          ? '输入 GitHub 仓库 URL，支持完整仓库或子目录'
                          : 'Enter GitHub repository URL, supports full repo or subdirectory'}
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="card bg-base-200 hover:bg-base-300 cursor-pointer transition-colors p-4"
                  onClick={() => setImportType('local')}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-base-100 flex items-center justify-center shrink-0">
                      <HardDrive size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-base mb-1">{t('importFromLocal')}</div>
                      <div className="text-sm text-base-content/60">
                        {i18n.language === 'zh'
                          ? '选择本地文件夹路径，必须包含 SKILL.md 文件'
                          : 'Select local folder path, must contain SKILL.md file'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* 导入表单 */
              <div className="space-y-6">
                <div
                  className="alert alert-info"
                >
                  <div className="flex items-center gap-3">
                    {importType === 'github' ? <Github size={20} /> : <HardDrive size={20} />}
                    <span className="text-sm">
                      {importType === 'github' ? t('importFromGitHub') : t('importFromLocal')}
                    </span>
                  </div>
                </div>

                {importType === 'github' ? (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">
                        {i18n.language === 'zh' ? 'GitHub 仓库 URL' : 'GitHub Repository URL'}
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://github.com/username/skill-name"
                      className="input input-bordered w-full"
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      autoFocus
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        {i18n.language === 'zh'
                          ? '仓库必须包含 SKILL.md 文件'
                          : 'Repository must contain SKILL.md file'}
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-semibold">
                        {i18n.language === 'zh' ? '本地文件夹路径' : 'Local Folder Path'}
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="C:\Users\User\Downloads\my-skill"
                      className="input input-bordered w-full"
                      value={importPath}
                      onChange={(e) => setImportPath(e.target.value)}
                      autoFocus
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/50">
                        {i18n.language === 'zh'
                          ? '文件夹必须包含 SKILL.md 文件'
                          : 'Folder must contain SKILL.md file'}
                      </span>
                    </label>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="btn btn-ghost"
                    onClick={() => {
                      setImportType(null);
                      setImportUrl('');
                      setImportPath('');
                    }}
                  >
                    {i18n.language === 'zh' ? '返回' : 'Back'}
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleImport}
                    disabled={importGithubMutation.isPending || importLocalMutation.isPending || (importType === 'github' ? !importUrl.trim() : !importPath.trim())}
                  >
                    {(importGithubMutation.isPending || importLocalMutation.isPending) ? (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        {t('importing')}
                      </>
                    ) : (
                      <>
                        <Plus size={18} />
                        {i18n.language === 'zh' ? '确认导入' : 'Confirm Import'}
                      </>
                    )}
                  </button>
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
