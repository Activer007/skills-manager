import React, { useState, useEffect } from 'react';
import { Copy, Check, Code, FileCode, Layout } from 'lucide-react';
import type { InstalledSkill } from '../../types';
import { generateMarkdownBadge, generateHtmlCard, generateJsonLd } from '../../utils/embedGenerator';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { toast } from '../../store/useToastStore';

interface ShareEmbedPanelProps {
  skill: InstalledSkill;
  shareLink: string | undefined;
  locale: string;
}

type EmbedType = 'markdown' | 'html' | 'jsonld';

export const ShareEmbedPanel: React.FC<ShareEmbedPanelProps> = ({
  skill,
  shareLink,
  locale
}) => {
  const [embedType, setEmbedType] = useState<EmbedType>('markdown');
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Generate code when type or link changes
  useEffect(() => {
    if (!shareLink) return;

    let generatedCode = '';
    switch (embedType) {
      case 'markdown':
        generatedCode = generateMarkdownBadge(skill, shareLink);
        break;
      case 'html':
        generatedCode = generateHtmlCard(skill, shareLink);
        break;
      case 'jsonld':
        generatedCode = generateJsonLd(skill, shareLink);
        break;
    }
    setCode(generatedCode);
    setCopied(false);
  }, [embedType, shareLink, skill]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success(locale === 'zh' ? '代码已复制' : 'Code copied');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(locale === 'zh' ? '复制失败' : 'Failed to copy');
    }
  };

  const tabs: { id: EmbedType; label: string; icon: React.ReactNode }[] = [
    {
      id: 'markdown',
      label: 'Markdown Badge',
      icon: <FileCode className="w-4 h-4" />
    },
    {
      id: 'html',
      label: 'HTML Card',
      icon: <Layout className="w-4 h-4" />
    },
    {
      id: 'jsonld',
      label: 'JSON-LD',
      icon: <Code className="w-4 h-4" />
    }
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex p-1 bg-base-300 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setEmbedType(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors",
              embedType === tab.id
                ? "bg-base-100 text-base-content shadow-sm"
                : "text-base-content/60 hover:text-base-content"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview Area (Visual representation) */}
      <div className="p-6 border border-base-300 rounded-lg bg-base-200/50 flex flex-col items-center justify-center min-h-[160px]">
        {embedType === 'markdown' && shareLink && (
           <div className="text-center">
             <p className="text-sm text-base-content/50 mb-2">Preview (Markdown rendered)</p>
             <a href={shareLink} target="_blank" rel="noopener noreferrer">
               <img
                 src={`https://img.shields.io/badge/Skill-${encodeURIComponent(skill.name.replace(/-/g, '--').replace(/_/g, '__'))}-blue?logo=claude`}
                 alt={`Skill: ${skill.name}`}
               />
             </a>
           </div>
        )}

        {embedType === 'html' && (
          <div className="scale-90 origin-center">
             <div dangerouslySetInnerHTML={{ __html: generateHtmlCard(skill, shareLink || '#') }} />
          </div>
        )}

        {embedType === 'jsonld' && (
          <div className="text-base-content/50 text-sm flex flex-col items-center">
             <Code className="w-12 h-12 mb-2 opacity-20" />
             <span>Invisible Metadata (SEO)</span>
          </div>
        )}
      </div>

      {/* Code Area */}
      <div className="relative">
        <textarea
          readOnly
          value={code}
          className="w-full h-32 p-3 pr-12 font-mono text-xs bg-base-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2"
          onClick={handleCopy}
        >
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        </Button>
      </div>

      <p className="text-xs text-base-content/50 text-center">
        {embedType === 'markdown' && (locale === 'zh' ? '适用于 GitHub README 或文档' : 'Best for GitHub READMEs or documentation')}
        {embedType === 'html' && (locale === 'zh' ? '适用于博客或个人网站' : 'Best for blogs or personal websites')}
        {embedType === 'jsonld' && (locale === 'zh' ? '用于搜索引擎优化' : 'For Search Engine Optimization')}
      </p>
    </div>
  );
};
