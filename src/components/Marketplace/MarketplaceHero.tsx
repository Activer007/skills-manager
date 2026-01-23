import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Search, Download } from 'lucide-react';
import { Button } from '../ui/Button';

interface MarketplaceHeroProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onImportClick: () => void;
  isGithubUrl: boolean;
}

const HERO_BG_CANDIDATES = [
  '/marketplace/hero-bg.webp',
  '/marketplace/hero-bg.jpg',
  '/marketplace/hero-bg.png'
];

export const MarketplaceHero: React.FC<MarketplaceHeroProps> = ({
  searchTerm,
  onSearchChange,
  onImportClick,
  isGithubUrl
}) => {
  const { t, i18n } = useTranslation();
  const [heroBackgroundUrl, setHeroBackgroundUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHeroBackground = async () => {
      for (const url of HERO_BG_CANDIDATES) {
        const loaded = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });

        if (cancelled) return;
        if (loaded) {
          setHeroBackgroundUrl(url);
          return;
        }
      }

      setHeroBackgroundUrl(null);
    };

    loadHeroBackground();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 dark:from-primary/5 dark:to-purple-500/5 pl-8 pr-0 pb-6 pt-6">
      {heroBackgroundUrl && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 bg-cover bg-top opacity-40 rounded-r-2xl"
          style={{ backgroundImage: `url(${heroBackgroundUrl})` }}
        />
      )}
      <div className="relative z-10 max-w-2xl">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-slate-100"
        >
          {i18n.language === 'zh' ? '发现强大的 Skills' : 'Discover Powerful Skills'}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-lg text-slate-600 dark:text-slate-400 mb-8"
        >
          {i18n.language === 'zh'
            ? '通过社区构建的能力增强您的 Claude 体验。'
            : 'Supercharge your Claude experience with community-built capabilities.'}
        </motion.p>

        {/* Search Bar inside Hero */}
        <div className="flex gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative max-w-lg flex-1 group"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
            <input
              type="text"
              placeholder={t('searchSkills')}
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-base-100 border-0 shadow-lg shadow-black/5 ring-1 ring-black/5 focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100"
              value={searchTerm}
              onChange={(e) => {
                onSearchChange(e.target.value);
              }}
              data-testid="search-input"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Button
              size="lg"
              variant="primary"
              className="h-full rounded-xl shadow-lg shadow-primary/20"
              onClick={onImportClick}
              data-testid="import-button"
            >
              <Download size={20} className="mr-2" />
              {isGithubUrl
                ? (i18n.language === 'zh' ? '导入此链接' : 'Import URL')
                : (i18n.language === 'zh' ? '导入' : 'Import')}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Decorative Background Elements */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          rotate: [0, 90, 0]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [0, 50, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"
      />
    </div>
  );
};
