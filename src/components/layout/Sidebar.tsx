import { NavLink, useLocation } from 'react-router-dom';
import { Library, ShoppingBag, ShieldCheck, Settings, Box, Sun, Moon, Globe, GitBranch, Folder, Activity } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';
import { useSkillStore } from '../../store/useSkillStore';
import { MarketplaceSidebar } from '../Marketplace/MarketplaceSidebar';
import { motion, AnimatePresence } from 'framer-motion';

const Sidebar = () => {
    const { t, i18n } = useTranslation();
    const { theme, setTheme, showSecuritySection } = useSkillStore();
    const location = useLocation();
    const isMarketplace = location.pathname.startsWith('/marketplace');

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    };

    const toggleLanguage = () => {
        // Simple toggle for now, can be expanded to a dropdown
        const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
        i18n.changeLanguage(newLang);
    };

    const navItems = [
        { to: '/my-skills', icon: Library, label: t('mySkills') },
        { to: '/collections', icon: Folder, label: i18n.language === 'zh' ? '合集' : 'Collections' },
        { to: '/marketplace', icon: ShoppingBag, label: t('marketplace') },
        { to: '/repositories', icon: GitBranch, label: t('repositories.title') },
        { to: '/tasks', icon: Activity, label: t('tasks.title', 'Tasks') },
        ...(showSecuritySection ? [{ to: '/security', icon: ShieldCheck, label: t('security') }] : []),
        { to: '/settings', icon: Settings, label: t('settings') },
    ];

    return (
        <div className="w-64 bg-white dark:bg-base-200 min-h-screen flex flex-col border-r border-gray-100 dark:border-base-100 transition-colors duration-200 pt-8 z-50 flex-shrink-0">
            {/* Logo Area */}
            <div className="h-14 flex items-center gap-3 px-6 mb-6 flex-shrink-0">
                <div className="bg-primary text-white p-2 rounded-xl shadow-lg shadow-primary/20">
                    <Box size={20} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="font-bold text-base leading-tight tracking-tight text-slate-900 dark:text-slate-100">{t('appName')}</h1>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">v1.0.0</p>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-base-300">
                <nav className="px-4 space-y-1 mb-6">
                    <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 ml-1">Menu</p>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                cn(
                                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                                    isActive
                                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-base-100 hover:text-slate-900 dark:hover:text-slate-200'
                                )
                            }
                        >
                            <item.icon size={18} strokeWidth={2} />
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Conditional Marketplace Sidebar */}
                <AnimatePresence>
                    {isMarketplace && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden border-t border-gray-100 dark:border-base-100"
                        >
                            <MarketplaceSidebar />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 mx-4 mb-4 mt-2 rounded-2xl bg-slate-50 dark:bg-base-100 border border-slate-100 dark:border-base-300 flex-shrink-0">
                <div className="flex items-center gap-2">
                     <button
                        onClick={toggleTheme}
                        className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-base-200 hover:shadow-sm transition-all text-xs font-medium text-slate-600 dark:text-slate-300"
                        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                    </button>
                    <div className="w-[1px] h-4 bg-slate-200 dark:bg-base-300"></div>
                    <button
                        onClick={toggleLanguage}
                        className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-base-200 hover:shadow-sm transition-all text-xs font-medium text-slate-600 dark:text-slate-300"
                        title="Switch Language"
                    >
                        <Globe size={16} />
                        <span className="uppercase">{i18n.language.split('-')[0]}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
