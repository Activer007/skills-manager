
// Mock Tauri API for browser development
if (typeof window !== 'undefined' && !window.__TAURI__) {
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
  (window as any).__TAURI_INTERNALS__ = {};
}

export {};
