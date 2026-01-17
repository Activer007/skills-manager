import { NavLink } from 'react-router-dom';
import { Library, ShoppingBag, ShieldCheck, Settings, Box, Sun, Moon, Globe } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';

const Sidebar = () => {
    const { t, i18n } = useTranslation();
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            return savedTheme;
        }
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'zh' ? 'en' : 'zh';
        i18n.changeLanguage(newLang);
    };

    const navItems = [
        { to: '/my-skills', icon: Library, label: t('mySkills') },
        { to: '/marketplace', icon: ShoppingBag, label: t('marketplace') },
        { to: '/security', icon: ShieldCheck, label: t('security') }, // Assuming translation key
        { to: '/settings', icon: Settings, label: t('settings') },
    ];

    return (
        <div className="w-64 bg-gray-50/50 dark:bg-base-200/50 backdrop-blur-xl min-h-screen flex flex-col border-r border-gray-200 dark:border-base-300 transition-colors duration-200">
            {/* Logo Area */}
            <div className="h-14 flex items-center gap-3 px-6 pt-4 pb-2">
                <div className="bg-primary/10 text-primary p-2 rounded-xl">
                    <Box size={20} strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="font-bold text-base leading-tight tracking-tight text-slate-900 dark:text-slate-100">Skill Manager</h1>
                    <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">v1.0.0</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1">
                <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Menu</p>
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group',
                                isActive
                                    ? 'bg-white dark:bg-base-100 text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
                            )
                        }
                    >
                        <item.icon size={18} strokeWidth={2} />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-gray-200 dark:border-base-300 space-y-3">
                
                {/* Theme & Language Toggles */}
                <div className="flex items-center gap-2">
                     <button
                        onClick={toggleTheme}
                        className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-white dark:bg-base-100 border border-gray-200 dark:border-base-300 hover:border-primary/50 dark:hover:border-primary/50 transition-all text-xs font-medium text-slate-600 dark:text-slate-300"
                    >
                        {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
                        <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
                    </button>
                    <button
                        onClick={toggleLanguage}
                        className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-white dark:bg-base-100 border border-gray-200 dark:border-base-300 hover:border-primary/50 dark:hover:border-primary/50 transition-all text-xs font-medium text-slate-600 dark:text-slate-300"
                    >
                        <Globe size={14} />
                        <span>{i18n.language === 'zh' ? 'English' : '中文'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;