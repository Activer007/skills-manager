import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useSkillStore } from '../../store/useSkillStore';

declare global {
  interface Window {
    __TAURI__?: unknown;
  }
}

// Detect if running on Linux platform
const isLinux = navigator.userAgent.toLowerCase().includes('linux');

export default function ThemeManager() {
    const theme = useSkillStore((state) => state.theme);
    
    // Apply theme when config changes
    useEffect(() => {
        const applyTheme = async (activeTheme: string) => {
            const root = document.documentElement;
            const isDark = activeTheme === 'dark';

            // Set Tauri window background color
            // Skip on Linux due to crash with transparent windows + softbuffer
            try {
                if (!isLinux && window.__TAURI__) {
                    // Antigravity dark mode uses base-300 (#334155) or similar for main bg
                    // matching index.css .dark body { background-color: #1d232a; } 
                    // Let's use #1d232a to match index.css override
                    const bgColor = isDark ? '#1d232a' : '#FAFBFC';
                    await getCurrentWindow().setBackgroundColor(bgColor);
                }
            } catch (e) {
                console.error('Failed to set window background color:', e);
            }

            // Set DaisyUI theme
            root.setAttribute('data-theme', activeTheme);

            // Set inline style for immediate visual feedback
            root.style.backgroundColor = isDark ? '#1d232a' : '#FAFBFC';

            // Set Tailwind dark mode class
            if (isDark) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        };

        // Sync to localStorage for early boot check
        localStorage.setItem('app-theme-preference', theme);

        if (theme === 'system') {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleSystemChange = (e: MediaQueryListEvent | MediaQueryList) => {
                const systemTheme = e.matches ? 'dark' : 'light';
                applyTheme(systemTheme);
            };
            handleSystemChange(mediaQuery);
            mediaQuery.addEventListener('change', handleSystemChange);
            return () => mediaQuery.removeEventListener('change', handleSystemChange);
        } else {
            applyTheme(theme);
        }
    }, [theme]);

    return null; 
}
