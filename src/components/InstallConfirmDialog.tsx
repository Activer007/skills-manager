import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  HardDrive,
  FolderOpen,
  ChevronDown,
  Check,
  Loader2
} from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { cn } from '../utils/cn';

interface InstallConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: InstallOptions) => void;
  skill: {
    name: string;
    description: string;
    securityLevel?: 'safe' | 'risk' | 'blocked' | 'unknown';
    version?: string;
  };
  isInstalling?: boolean;
}

export interface InstallOptions {
  target: 'system' | 'project';
  projectPath?: string;
}

export const InstallConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  skill,
  isInstalling = false,
}: InstallConfirmDialogProps) => {
  const { t, i18n } = useTranslation();
  const [target, setTarget] = useState<'system' | 'project'>('system');
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);

  // Load projects and reset state when opening
  useEffect(() => {
    if (isOpen) {
      setTarget('system');
      loadProjects();
    }
  }, [isOpen]);

  const loadProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const paths = await invoke<string[]>('get_project_paths');
      setProjects(paths);
      if (paths.length > 0) {
        setSelectedProject(paths[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleConfirm = () => {
    onConfirm({
      target,
      projectPath: target === 'project' ? selectedProject : undefined,
    });
  };

  const getSecurityInfo = (level?: string) => {
    switch (level) {
      case 'safe':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-700 dark:text-green-300',
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          label: i18n.language === 'zh' ? '安全验证通过' : 'Security Check Passed',
          desc: i18n.language === 'zh' ? '未发现已知安全风险' : 'No known security risks found'
        };
      case 'risk':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-700 dark:text-yellow-300',
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
          label: i18n.language === 'zh' ? '潜在风险警告' : 'Potential Risk Warning',
          desc: i18n.language === 'zh' ? '包含敏感操作，请谨慎安装' : 'Contains sensitive operations, install with caution'
        };
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-800/50',
          border: 'border-slate-200 dark:border-slate-700',
          text: 'text-slate-700 dark:text-slate-300',
          icon: <Shield className="w-5 h-5 text-slate-500" />,
          label: i18n.language === 'zh' ? '安全状态未知' : 'Security Status Unknown',
          desc: i18n.language === 'zh' ? '将在安装前进行扫描' : 'Will be scanned before installation'
        };
    }
  };

  const securityInfo = getSecurityInfo(skill.securityLevel);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={i18n.language === 'zh' ? '安装 Skill' : 'Install Skill'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isInstalling}>
            {i18n.language === 'zh' ? '取消' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            isLoading={isInstalling}
            disabled={skill.securityLevel === 'blocked' || (target === 'project' && !selectedProject)}
          >
            {i18n.language === 'zh' ? '确认安装' : 'Confirm Install'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Skill Info Summary */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-xl font-bold text-primary flex-shrink-0">
            {skill.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="font-semibold text-lg leading-tight">{skill.name}</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
              {skill.description}
            </p>
          </div>
        </div>

        {/* Security Status */}
        <div className={cn(
          "p-4 rounded-lg border flex gap-3",
          securityInfo.bg,
          securityInfo.border
        )}>
          <div className="flex-shrink-0 mt-0.5">
            {securityInfo.icon}
          </div>
          <div>
            <div className={cn("font-medium text-sm", securityInfo.text)}>
              {securityInfo.label}
            </div>
            <div className={cn("text-xs mt-0.5 opacity-90", securityInfo.text)}>
              {securityInfo.desc}
            </div>
          </div>
        </div>

        {/* Install Target Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {i18n.language === 'zh' ? '安装位置' : 'Install Location'}
          </label>

          <div className="grid gap-3">
            <button
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                target === 'system'
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              )}
              onClick={() => setTarget('system')}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                target === 'system' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              )}>
                <HardDrive size={18} />
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm">
                  {i18n.language === 'zh' ? '系统级安装' : 'System Installation'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {i18n.language === 'zh' ? '所有项目均可使用' : 'Available for all projects'}
                </div>
              </div>
              {target === 'system' && <Check size={18} className="text-primary" />}
            </button>

            <button
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                target === 'project'
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                projects.length === 0 && !isLoadingProjects && "opacity-60 cursor-not-allowed"
              )}
              onClick={() => projects.length > 0 && setTarget('project')}
              disabled={projects.length === 0 && !isLoadingProjects}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                target === 'project' ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              )}>
                <FolderOpen size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm flex items-center gap-2">
                  {i18n.language === 'zh' ? '项目级安装' : 'Project Installation'}
                  {isLoadingProjects && <Loader2 className="w-3 h-3 animate-spin" />}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  {projects.length === 0 && !isLoadingProjects
                    ? (i18n.language === 'zh' ? '未配置项目路径' : 'No projects configured')
                    : (i18n.language === 'zh' ? '仅当前项目可用' : 'Only for specific project')}
                </div>

                {target === 'project' && projects.length > 0 && (
                  <div className="relative mt-2" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="w-full text-xs p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                    >
                      {projects.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {target === 'project' && <Check size={18} className="text-primary mt-1" />}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
