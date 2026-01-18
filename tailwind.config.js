/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            // ========================================
            // 间距系统 - 基于 design-tokens.css
            // ========================================
            spacing: {
                'xs': '0.25rem',   // 4px
                'sm': '0.5rem',    // 8px
                'md': '1rem',      // 16px
                'lg': '1.5rem',    // 24px
                'xl': '2rem',      // 32px
                '2xl': '3rem',     // 48px
                '3xl': '4rem',     // 64px
            },

            // ========================================
            // 圆角系统 - 统一使用 rounded-lg/xl
            // ========================================
            borderRadius: {
                'none': '0',
                'sm': '0.25rem',   // 4px
                'DEFAULT': '0.5rem', // 8px (默认)
                'md': '0.5rem',    // 8px - 按钮、输入框（主要使用）
                'lg': '0.75rem',   // 12px - 卡片（主要使用）
                'xl': '1rem',      // 16px - 对话框
                '2xl': '1.5rem',   // 24px - 特殊容器
                'full': '9999px',  // 圆形
            },

            // ========================================
            // 阴影系统 - 明确的深度层级
            // ========================================
            boxShadow: {
                'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
                'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
                'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
                'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
                // 彩色阴影
                'blue': '0 1px 3px 0 rgb(59 130 246 / 0.3)',
                'green': '0 1px 3px 0 rgb(16 185 129 / 0.3)',
                'red': '0 1px 3px 0 rgb(239 68 68 / 0.3)',
                'amber': '0 1px 3px 0 rgb(245 158 11 / 0.3)',
            },

            // ========================================
            // 字体系统
            // ========================================
            fontSize: {
                'xs': ['0.75rem', { lineHeight: '1rem' }],     // 12px
                'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
                'base': ['1rem', { lineHeight: '1.5rem' }],    // 16px
                'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px
                'xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
                '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
                '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
                '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px
            },

            // ========================================
            // 动画时长
            // ========================================
            transitionDuration: {
                'fast': '150ms',
                'normal': '200ms',
                'slow': '300ms',
                'slower': '500ms',
            },

            // ========================================
            // Z-index 系统
            // ========================================
            zIndex: {
                'dropdown': 1000,
                'sticky': 1020,
                'fixed': 1030,
                'modal-backdrop': 1040,
                'modal': 1050,
                'popover': 1060,
                'tooltip': 1070,
                'toast': 1080,
            },

            // ========================================
            // 自定义颜色（补充 DaisyUI）
            // ========================================
            colors: {
                // 文本颜色
                'text-primary': 'var(--text-primary)',
                'text-secondary': 'var(--text-secondary)',
                'text-tertiary': 'var(--text-tertiary)',
                'text-disabled': 'var(--text-disabled)',

                // 背景颜色
                'bg-primary': 'var(--bg-primary)',
                'bg-secondary': 'var(--bg-secondary)',
                'bg-tertiary': 'var(--bg-tertiary)',

                // 边框颜色
                'border-default': 'var(--border-color)',
                'border-dark': 'var(--border-color-dark)',
            },

            // ========================================
            // 组件默认高度
            // ========================================
            minHeight: {
                'input': '3rem',     // 48px - 统一的表单元素高度
                'button-sm': '2rem', // 32px
                'button-md': '2.5rem', // 40px
                'button-lg': '3rem', // 48px
            },

            // ========================================
            // 动画关键帧
            // ========================================
            keyframes: {
                'fade-in': {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                'fade-out': {
                    '0%': { opacity: '1' },
                    '100%': { opacity: '0' },
                },
                'slide-in-from-top': {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(0)' },
                },
                'slide-in-from-bottom': {
                    '0%': { transform: 'translateY(100%)' },
                    '100%': { transform: 'translateY(0)' },
                },
                'slide-in-from-left': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                'slide-in-from-right': {
                    '0%': { transform: 'translateX(100%)' },
                    '100%': { transform: 'translateX(0)' },
                },
                'zoom-in': {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                'zoom-out': {
                    '0%': { transform: 'scale(1)', opacity: '1' },
                    '100%': { transform: 'scale(0.95)', opacity: '0' },
                },
            },
            animation: {
                'fade-in': 'fade-in var(--duration-normal) var(--ease-out)',
                'fade-out': 'fade-out var(--duration-normal) var(--ease-in)',
                'slide-in-from-top': 'slide-in-from-top var(--duration-normal) var(--ease-out)',
                'slide-in-from-bottom': 'slide-in-from-bottom var(--duration-normal) var(--ease-out)',
                'slide-in-from-left': 'slide-in-from-left var(--duration-normal) var(--ease-out)',
                'slide-in-from-right': 'slide-in-from-right var(--duration-normal) var(--ease-out)',
                'zoom-in': 'zoom-in var(--duration-normal) var(--ease-out)',
                'zoom-out': 'zoom-out var(--duration-normal) var(--ease-in)',
            },
        },
    },
    plugins: [require("daisyui")],
    daisyui: {
        themes: [
            {
                light: {
                    "primary": "#3b82f6",
                    "secondary": "#64748b",
                    "accent": "#10b981",
                    "neutral": "#1f2937",
                    "base-100": "#ffffff",
                    "info": "#0ea5e9",
                    "success": "#10b981",
                    "warning": "#f59e0b",
                    "error": "#ef4444",
                },
            },
            {
                dark: {
                    "primary": "#3b82f6",
                    "secondary": "#94a3b8",
                    "accent": "#10b981",
                    "neutral": "#1f2937",
                    "base-100": "#0f172a", // Slate-900
                    "base-200": "#1e293b", // Slate-800
                    "base-300": "#334155", // Slate-700
                    "info": "#0ea5e9",
                    "success": "#10b981",
                    "warning": "#f59e0b",
                    "error": "#ef4444",
                },
            },
        ],
        darkTheme: "dark",
    },
}