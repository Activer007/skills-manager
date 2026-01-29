import { Outlet, useLocation } from 'react-router-dom';
import { getCurrentWindow } from '@tauri-apps/api/window';
import Sidebar from './Sidebar';
import ThemeManager from '../common/ThemeManager';
import ToastContainer from '../common/ToastContainer';
import { cn } from '../../utils/cn';
import { useTaskListener } from '../../hooks/useTaskListener';
import { MarketplaceProvider } from '../../context/MarketplaceContext';

const Layout = () => {
    const location = useLocation();
    const isMarketplace = location.pathname.startsWith('/marketplace');

    // Initialize task listener
    useTaskListener();

    return (
        <MarketplaceProvider>
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
                            'flex-1 scroll-smooth',
                            isMarketplace ? 'overflow-hidden p-0' : 'overflow-y-auto p-6 md:p-8 pt-10'
                        )}
                    >
                        <div
                            className={cn(
                                'mx-auto animate-in fade-in duration-500 slide-in-from-bottom-2',
                                isMarketplace ? 'h-full w-full' : 'max-w-7xl space-y-8 pb-12'
                            )}
                        >
                            <Outlet />
                        </div>
                    </div>
                </main>
            </div>
        </MarketplaceProvider>
    );
};

export default Layout;
