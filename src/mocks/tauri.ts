
// Mock Tauri API for browser development
const hasWindow = typeof window !== 'undefined';
const hasTauriGlobal = hasWindow && '__TAURI__' in window;
const hasTauriInternals =
  hasWindow &&
  ('__TAURI_INTERNALS__' in window ||
    Object.getOwnPropertyDescriptor(window, '__TAURI_INTERNALS__') !== undefined ||
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), '__TAURI_INTERNALS__') !== undefined);
const isTauriRuntime =
  hasWindow &&
  (hasTauriInternals ||
    (typeof navigator !== 'undefined' && /tauri/i.test(navigator.userAgent)));

if (hasWindow && !isTauriRuntime && !hasTauriGlobal) {
  console.log('🌟 Initializing Tauri Mock for Browser Environment');
  
  window.__TAURI__ = {
    core: {
      invoke: async (cmd: string, args: any) => {
        console.log(`[Tauri Mock] invoke('${cmd}')`, args);
        
        // Mock responses based on command
        switch (cmd) {
          case 'get_repositories':
            return [
              {
                id: 'mock-repo-1',
                url: 'https://github.com/mock/repo',
                name: 'Mock Repository',
                description: 'This is a mocked repository for browser dev',
                enabled: true,
                scan_subdirs: false,
                added_at: Date.now(),
                last_scanned: Date.now(),
                featured: false,
                category: 'community'
              }
            ];
          case 'get_featured_repositories':
            return {
              version: '1.0',
              last_updated: new Date().toISOString(),
              categories: [
                {
                  id: 'official',
                  name: { en: 'Official', zh: '官方' },
                  description: { en: 'Official skills', zh: '官方技能' },
                  repositories: []
                }
              ]
            };
          case 'get_unscanned_repositories':
            return [];
          case 'add_repository':
            return { success: true, message: 'Mock: Repository added', repositoryId: 'mock-new-id' };
          case 'delete_repository':
            return { success: true, message: 'Mock: Repository deleted' };
          case 'scan_repository':
            return null;
          default:
            console.warn(`[Tauri Mock] Unhandled command: ${cmd}`);
            return null;
        }
      }
    }
  } as any;
  
  // Also mock internal if needed, but core is usually enough for invoke
  try {
    if (!('__TAURI_INTERNALS__' in window)) {
      (window as any).__TAURI_INTERNALS__ = {};
    }
  } catch {
    // Ignore if runtime provides a read-only __TAURI_INTERNALS__.
  }
}

export {};
