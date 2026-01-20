import { Outlet, useLocation } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import Sidebar from './Sidebar';
import ThemeManager from '../common/ThemeManager';
import ToastContainer from '../common/ToastContainer';
import { cn } from '../../utils/cn';

const Layout = () => {
    const location = useLocation();
    const isMarketplace = location.pathname.startsWith('/marketplace');

    return (
        <div className="flex h-screen bg-[#FAFBFC] dark:bg-base-300 font-sans text-slate-900 dark:text-slate-100 overflow-hidden selection:bg-primary/20 selection:text-primary">
            {/* Theme Manager handles side effects */}
            <ThemeManager />

            {/* Custom Toast Container */}
            <ToastContainer />

            {/* Global Drag Region - Transparent overlay for Tauri window dragging */}
            <div
                className="fixed top-0 left-0 right-0 h-8 z-[9999]"
                style={{
                    backgroundColor: 'transparent',
                    cursor: 'default',
                    userSelect: 'none',
                    WebkitUserSelect: 'none'
                }}
                data-tauri-drag-region
                onMouseDown={() => {
                    getCurrentWindow().startDragging();
                }}
            />

            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300 ease-in-out">
                {/* Content Area */}
                <div
                    className={cn(
                        'flex-1 p-6 md:p-8 scroll-smooth pt-10',
                        isMarketplace ? 'overflow-hidden' : 'overflow-y-auto'
                    )}
                >
                    <div
                        className={cn(
                            'max-w-7xl mx-auto animate-in fade-in duration-500 slide-in-from-bottom-2',
                            isMarketplace ? 'h-full flex flex-col min-h-0 gap-8' : 'space-y-8 pb-12'
                        )}
                    >
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Layout;
