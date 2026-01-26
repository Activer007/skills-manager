
/**
 * Tauri v2 API Mock Implementation for Playwright
 *
 * This script mimics the behavior of the Tauri WebView environment.
 * It needs to be injected before any other scripts run.
 */
export const mockTauriScript = () => {
  // 1. Initialize global objects if they don't exist
  window.__TAURI__ = window.__TAURI__ || {};
  window.__TAURI_INTERNALS__ = window.__TAURI_INTERNALS__ || {};
  window.__TAURI_IPC__ = window.__TAURI_IPC__ || ((...args) => {
    console.log('[Tauri Mock] IPC call:', args);
  });

  // 2. Mock Internals (Critical for @tauri-apps/api v2)
  const internals = window.__TAURI_INTERNALS__;

  // Metadata for window operations
  internals.metadata = internals.metadata || {
    currentWindow: {
      label: 'main',
      theme: 'light',
      // Add other window properties as needed
    }
  };

  // Transform Callback (used by plugins)
  internals.transformCallback = internals.transformCallback || function(callback, once) {
    const id = 'callback_' + Date.now() + '_' + Math.random();
    if (!window.__TAURI_CALLBACKS__) {
      window.__TAURI_CALLBACKS__ = {};
    }
    window.__TAURI_CALLBACKS__[id] = { callback, once };
    return id;
  };

  // Invoke implementation
  internals.invoke = internals.invoke || async function(command, args, options) {
    console.log(`[Tauri Mock] invoke: ${command}`, args);

    // Default handlers for common commands
    switch (command) {
      // Window commands
      case 'plugin:window|set_title':
      case 'plugin:window|set_background_color':
        return null;

      // Event commands
      case 'plugin:event|listen':
        return async () => {}; // Return unlisten function
      case 'plugin:event|emit':
        return null;

      // Clipboard
      case 'plugin:clipboard|write_text':
      case 'plugin:clipboard|read_text':
        return null;

      // Shell
      case 'plugin:shell|open':
        return null;

      // Dialog
      case 'plugin:dialog|ask':
      case 'plugin:dialog|confirm':
      case 'plugin:dialog|message':
      case 'plugin:dialog|open':
      case 'plugin:dialog|save':
        return null;

      default:
        // For application specific commands, we'll let the test override this
        // or return null to prevent crashes
        return null;
    }
  };

  // 3. Mock window.__TAURI__.core (Legacy/Compat)
  window.__TAURI__.core = window.__TAURI__.core || {
    invoke: internals.invoke,
    transformCallback: internals.transformCallback
  };

  console.log('🌟 Tauri Mock Initialized (v2 structure)');
};
