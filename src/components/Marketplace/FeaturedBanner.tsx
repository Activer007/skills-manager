import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight } from 'lucide-react';

export const FeaturedBanner: React.FC = () => {
  const { i18n } = useTranslation();

  return (
    <div className="p-6 pb-2">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg">
        <div className="absolute inset-0 bg-[url('/marketplace/hero-bg.png')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        <div className="relative z-10 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-indigo-100 font-medium text-sm uppercase tracking-wider"
            >
              <Sparkles size={16} className="text-yellow-300" />
              {i18n.language === 'zh' ? '本周精选' : 'Featured This Week'}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl font-bold text-white leading-tight"
            >
              {i18n.language === 'zh' ? '探索官方认证的 Skills' : 'Discover Official Skills'}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-indigo-100 text-lg"
            >
              {i18n.language === 'zh'
                ? '由 Anthropic 和社区专家构建的高质量工具集合。'
                : 'A collection of high-quality tools built by Anthropic and community experts.'}
            </motion.p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold shadow-xl hover:bg-indigo-50 transition-colors flex items-center gap-2 group whitespace-nowrap"
          >
            {i18n.language === 'zh' ? '查看全部' : 'View Collection'}
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </div>

        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl pointer-events-none" />
      </div>
    </div>
  );
};
