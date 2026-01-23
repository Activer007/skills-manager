import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import './i18n'
import App from './App.tsx'
import ErrorBoundary from './components/common/ErrorBoundary.tsx'

// 配置 TanStack Query 客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5分钟
      gcTime: 1000 * 60 * 10, // 10分钟
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
})

const bootstrap = async () => {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const hasTauriInternals = '__TAURI_INTERNALS__' in window;
    const hasTauriGlobal = '__TAURI__' in window;
    const isTauriRuntime = Boolean((window as any).isTauri) || hasTauriInternals || hasTauriGlobal;
    if (!isTauriRuntime) {
      await import('./mocks/tauri')
    }
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryClientProvider>
    </StrictMode>,
  )
}

bootstrap()
