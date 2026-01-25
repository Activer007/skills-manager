import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import { Check, X, AlertTriangle, Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import type { InstalledSkill } from '../types';
import type { PreflightResult, PublishResult } from '../types/publish';
import { toast } from '../store/useToastStore';

type WizardStep = 'preflight' | 'metadata' | 'publishing' | 'success';

interface PublishWizardProps {
  isOpen: boolean;
  onClose: () => void;
  skill: InstalledSkill;
}

export const PublishWizard: React.FC<PublishWizardProps> = ({
  isOpen,
  onClose,
  skill,
}) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<WizardStep>('preflight');
  const [preflightResult, setPreflightResult] = useState<PreflightResult | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Metadata state
  const [metadata, setMetadata] = useState({
    name: skill.name,
    description: skill.description || '',
    version: skill.version || '1.0.0',
    author: skill.author || '',
    tags: skill.tags ? skill.tags.join(', ') : '',
  });

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('preflight');
      setPreflightResult(null);
      setPublishResult(null);
      setError(null);
      setMetadata({
        name: skill.name,
        description: skill.description || '',
        version: skill.version || '1.0.0',
        author: skill.author || '',
        tags: skill.tags ? skill.tags.join(', ') : '',
      });
      runPreflight();
    }
  }, [isOpen, skill]);

  const runPreflight = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await invoke<PreflightResult>('run_publish_preflight', {
        skillPath: skill.localPath,
      });
      setPreflightResult(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async () => {
    setCurrentStep('publishing');
    setError(null);
    try {
      const result = await invoke<PublishResult>('publish_skill', {
        skillPath: skill.localPath,
        metadata: {
          ...metadata,
          tags: metadata.tags.split(',').map(t => t.trim()).filter(Boolean),
        },
      });
      setPublishResult(result);
      setCurrentStep('success');
      toast.success(t('publishSuccess', 'Skill published successfully!'));
    } catch (err) {
      setError(String(err));
      setCurrentStep('metadata'); // Go back to metadata step on error
    }
  };

  const isPreflightPassed = preflightResult?.passed ?? false;

  const renderPreflightStep = () => (
    <div className="space-y-4">
      <div className="text-sm text-slate-500 mb-4">
        {t('preflightDescription', 'We need to check your skill for issues before publishing.')}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-slate-500">{t('runningChecks', 'Running preflight checks...')}</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
          <AlertTriangle size={20} />
          {error}
          <Button size="sm" variant="outline" onClick={runPreflight} className="ml-auto">
            {t('retry', 'Retry')}
          </Button>
        </div>
      ) : preflightResult ? (
        <div className="space-y-3">
           <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-base-200 rounded-lg">
              <span className="font-medium">{t('overallStatus', 'Overall Status')}</span>
              <Badge variant={isPreflightPassed ? 'success' : 'error'}>
                {isPreflightPassed ? t('passed', 'Passed') : t('failed', 'Failed')}
              </Badge>
           </div>

           <div className="border rounded-lg divide-y divide-gray-100 dark:divide-base-300">
             {preflightResult.checks.map((check, idx) => (
               <div key={idx} className="p-3 flex items-start gap-3">
                 <div className="mt-0.5">
                   {check.status === 'Pass' && <Check size={18} className="text-green-500" />}
                   {check.status === 'Fail' && <X size={18} className="text-red-500" />}
                   {check.status === 'Warning' && <AlertTriangle size={18} className="text-yellow-500" />}
                 </div>
                 <div className="flex-1">
                   <div className="flex items-center justify-between">
                     <span className="font-medium text-sm">{check.name}</span>
                     <span className={`text-xs px-2 py-0.5 rounded-full ${
                       check.status === 'Pass' ? 'bg-green-100 text-green-700' :
                       check.status === 'Fail' ? 'bg-red-100 text-red-700' :
                       'bg-yellow-100 text-yellow-700'
                     }`}>
                       {check.status}
                     </span>
                   </div>
                   <p className="text-xs text-slate-500 mt-1">{check.message}</p>
                 </div>
               </div>
             ))}
           </div>

           {preflightResult.security_report && preflightResult.security_report.score < 70 && (
             <div className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
               {t('securityWarning', 'Security score is low. Consider improving security before publishing.')}
             </div>
           )}
        </div>
      ) : null}
    </div>
  );

  const renderMetadataStep = () => (
    <div className="space-y-4">
      <div className="text-sm text-slate-500 mb-4">
        {t('metadataDescription', 'Review and update skill information for the marketplace.')}
      </div>

      <div className="grid gap-4">
        <Input
          label={t('skillName', 'Skill Name')}
          value={metadata.name}
          onChange={(e) => setMetadata({...metadata, name: e.target.value})}
          disabled
        />
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('description', 'Description')}
          </label>
          <textarea
            className="w-full min-h-[80px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-base-300 dark:bg-base-200 dark:text-slate-100"
            value={metadata.description}
            onChange={(e) => setMetadata({...metadata, description: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t('version', 'Version')}
            value={metadata.version}
            onChange={(e) => setMetadata({...metadata, version: e.target.value})}
            placeholder="1.0.0"
          />
          <Input
            label={t('author', 'Author')}
            value={metadata.author}
            onChange={(e) => setMetadata({...metadata, author: e.target.value})}
          />
        </div>
        <Input
          label={t('tags', 'Tags (comma separated)')}
          value={metadata.tags}
          onChange={(e) => setMetadata({...metadata, tags: e.target.value})}
          placeholder="utility, tool, python"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}
    </div>
  );

  const renderPublishingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
        <div className="relative bg-white dark:bg-base-100 p-4 rounded-full border-2 border-primary/20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">{t('publishing', 'Publishing Skill...')}</h3>
        <p className="text-sm text-slate-500 max-w-xs mx-auto">
          {t('publishingDesc', 'Uploading your skill to the marketplace registry.')}
        </p>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
        <Check size={32} />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t('publishSuccessTitle', 'Published Successfully!')}
        </h3>
        <p className="text-slate-500 max-w-sm mx-auto">
          {t('publishSuccessMessage', 'Your skill is now available in the marketplace. It may take a few minutes to appear in search results.')}
        </p>
      </div>
      <div className="bg-slate-50 dark:bg-base-200 p-4 rounded-lg w-full max-w-sm border border-gray-100 dark:border-base-300">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-500">{t('skillName', 'Skill Name')}</span>
          <span className="font-medium">{metadata.name}</span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-500">{t('version', 'Version')}</span>
          <span className="font-medium">{metadata.version}</span>
        </div>
        {publishResult?.listing_id && (
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">{t('listingId', 'Listing ID')}</span>
            <span className="font-medium text-xs">{publishResult.listing_id}</span>
          </div>
        )}
        {publishResult?.skill_id && (
          <div className="flex justify-between text-sm mb-2">
            <span className="text-slate-500">{t('skillId', 'Skill ID')}</span>
            <span className="font-medium text-xs">{publishResult.skill_id}</span>
          </div>
        )}
        {publishResult?.published_at && (
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">{t('publishedAt', 'Published At')}</span>
            <span className="font-medium text-xs">
              {new Date(publishResult.published_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  const getModalTitle = () => {
    switch (currentStep) {
      case 'preflight': return t('preflightCheck', 'Preflight Check');
      case 'metadata': return t('skillMetadata', 'Skill Metadata');
      case 'publishing': return t('publishingSkill', 'Publishing Skill');
      case 'success': return t('published', 'Published');
      default: return '';
    }
  };

  const getFooter = () => {
    if (currentStep === 'publishing') return null;

    if (currentStep === 'success') {
      return (
        <Button variant="primary" onClick={onClose} className="w-full">
          {t('done', 'Done')}
        </Button>
      );
    }

    return (
      <div className="flex justify-between w-full">
        {currentStep === 'preflight' ? (
          <Button variant="ghost" onClick={onClose}>
            {t('cancel', 'Cancel')}
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setCurrentStep('preflight')}>
            <ArrowLeft size={16} className="mr-2" />
            {t('back', 'Back')}
          </Button>
        )}

        {currentStep === 'preflight' ? (
          <Button
            variant="primary"
            onClick={() => setCurrentStep('metadata')}
            disabled={isLoading || !isPreflightPassed}
          >
            {t('next', 'Next')}
            <ArrowRight size={16} className="ml-2" />
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handlePublish}
            disabled={!metadata.version || !metadata.author}
          >
            {t('publish', 'Publish')}
          </Button>
        )}
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={currentStep === 'publishing' ? () => {} : onClose}
      title={getModalTitle()}
      footer={getFooter()}
      size="xl"
    >
      <div className="min-h-[300px]">
        {/* Progress Steps Indicator */}
        {currentStep !== 'success' && currentStep !== 'publishing' && (
           <div className="flex items-center justify-center mb-6 px-4">
             <div className="flex items-center w-full max-w-xs relative">
               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
                 currentStep === 'preflight'
                   ? 'bg-primary text-white'
                   : 'bg-green-500 text-white'
               }`}>1</div>
               <div className={`flex-1 h-1 mx-2 transition-colors ${
                 currentStep === 'metadata' ? 'bg-green-500' : 'bg-slate-200 dark:bg-base-300'
               }`}></div>
               <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold z-10 transition-colors ${
                 currentStep === 'metadata'
                   ? 'bg-primary text-white'
                   : 'bg-slate-200 dark:bg-base-300 text-slate-500'
               }`}>2</div>
             </div>
           </div>
        )}

        {currentStep === 'preflight' && renderPreflightStep()}
        {currentStep === 'metadata' && renderMetadataStep()}
        {currentStep === 'publishing' && renderPublishingStep()}
        {currentStep === 'success' && renderSuccessStep()}
      </div>
    </Modal>
  );
};
