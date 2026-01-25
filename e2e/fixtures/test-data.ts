/**
 * 测试数据常量
 *
 * 用于 E2E 测试的模拟数据和常量
 */

/**
 * 测试用 GitHub URLs
 */
export const TEST_GITHUB_URLS = {
  VALID_SKILL: 'https://github.com/test/valid-skill',
  DANGEROUS_SKILL: 'https://github.com/test/dangerous-skill',
  MULTI_SKILL_REPO: 'https://github.com/test/multi-skill-repo',
  INVALID_REPO: 'https://github.com/test/invalid-repo',
  PRIVATE_REPO: 'https://github.com/test/private-skill',
} as const;

/**
 * 测试用文件路径
 */
export const TEST_PATHS = {
  WINDOWS_VALID_SKILL: 'C:\\test\\skills\\valid-skill',
  WINDOWS_DANGEROUS_SKILL: 'C:\\test\\skills\\dangerous-skill',
  UNIX_VALID_SKILL: '/test/skills/valid-skill',
  UNIX_DANGEROUS_SKILL: '/test/skills/dangerous-skill',
  PROJECT_PATH: 'C:\\test\\my-project',
  INVALID_PATH: 'C:\\invalid\\path',
} as const;

/**
 * 测试用 Skill 数据
 */
export const TEST_SKILLS = {
  VALID_SKILL: {
    name: 'test-valid-skill',
    description: 'A valid test skill for E2E testing',
    author: 'Test Author',
    version: '1.0.0',
  },
  DANGEROUS_SKILL: {
    name: 'test-dangerous-skill',
    description: 'A dangerous test skill for security testing',
    author: 'Test Author',
    version: '1.0.0',
  },
  HIGH_QUALITY_SKILL: {
    name: 'high-quality-skill',
    description: 'A high quality skill with complete documentation',
    author: 'Expert Developer',
    version: '2.0.0',
  },
  LOW_QUALITY_SKILL: {
    name: 'low-quality-skill',
    description: 'Basic skill',
    author: 'Novice',
    version: '0.1.0',
  },
} as const;

/**
 * 安全扫描测试数据
 */
export const SECURITY_TEST_DATA = {
  DANGEROUS_PATTERNS: [
    'rm -rf /',
    'eval(',
    'exec(',
    'system(',
    'innerHTML',
    'document.write',
  ],
  SAFE_PATTERNS: [
    'console.log',
    'return',
    'function',
    'const',
    'let',
  ],
} as const;

/**
 * 测试用用户输入
 */
export const TEST_INPUTS = {
  SEARCH_QUERIES: [
    'test skill',
    'security',
    'quality',
    'github',
  ],
  INVALID_URLS: [
    'not-a-url',
    'ftp://invalid.com',
    'https://',
    '',
  ],
  INVALID_PATHS: [
    '',
    'non-existent-path',
    '../relative/path',
  ],
} as const;

/**
 * UI 选择器（data-testid）
 */
export const TEST_IDS = {
  // Navigation
  NAV_MY_SKILLS: 'nav-my-skills',
  NAV_MARKETPLACE: 'nav-marketplace',
  NAV_SETTINGS: 'nav-settings',
  NAV_SECURITY: 'nav-security',

  // My Skills Page
  SCAN_BUTTON: 'scan-button',
  SKILL_LIST: 'skill-list',
  SKILL_CARD: 'skill-card',
  SKILL_SWITCH: 'skill-switch',
  UNINSTALL_BUTTON: 'uninstall-button',
  SHARE_BUTTON: 'share-button',
  QUALITY_BADGE: 'quality-badge',
  SECURITY_SHIELD: 'security-shield',
  EMPTY_STATE: 'empty-state',

  // Marketplace Page
  IMPORT_FROM_GITHUB: 'import-from-github',
  GITHUB_URL_INPUT: 'github-url-input',
  IMPORT_CONFIRM: 'import-confirm',
  SEARCH_INPUT: 'search-input',
  FILTER_CHIP: 'filter-chip',
  INSTALL_BUTTON: 'install-button',
  SCAN_PROGRESS: 'scan-progress',
  SECURITY_BLOCKED: 'security-blocked',

  // Settings Page
  ADD_PROJECT_PATH: 'add-project-path',
  PROJECT_PATHS_LIST: 'project-paths-list',
  PATH_INPUT: 'path-input',
  SAVE_PATH: 'save-path',
  DELETE_PATH: 'delete-path',
  SECURITY_MODE_SELECT: 'security-mode-select',
  SYSTEM_INSTALL_PATH: 'system-install-path',

  // Share Dialog
  SHARE_TEXT_TAB: 'share-text-tab',
  SHARE_IMAGE_TAB: 'share-image-tab',
  GENERATE_IMAGE: 'generate-image',
  COPY_TEXT: 'copy-text',
  CLOSE_DIALOG: 'close-dialog',

  // Common
  LOADING: 'loading',
  TOAST: 'toast',
  CONFIRM_BUTTON: 'confirm-button',
  CANCEL_BUTTON: 'cancel-button',
} as const;

/**
 * 测试超时时间（毫秒）
 */
export const TEST_TIMEOUTS = {
  SHORT: 2000,
  MEDIUM: 5000,
  LONG: 10000,
  VERY_LONG: 30000,
} as const;

/**
 * 获取当前操作系统的路径格式
 */
export function getOSPath(unixPath: string, windowsPath: string): string {
  return process.platform === 'win32' ? windowsPath : unixPath;
}

/**
 * Share Link 测试数据
 */
export const testShareLinks = {
  valid: 'http://localhost:1420/share/mock-share-001',
  invalid: 'http://localhost:1420/share/non-existent-share',
  expired: 'http://localhost:1420/share/expired-share',
  safeSkill: 'http://localhost:1420/share/mock-share-safe-skill',
  riskSkill: 'http://localhost:1420/share/mock-share-risk-skill',
  blockedSkill: 'http://localhost:1420/share/mock-share-blocked-skill',
  noSourceUrl: 'http://localhost:1420/share/mock-share-no-source',
} as const;

/**
 * Share Record 测试数据
 */
export const testShareRecords = {
  safeSkill: {
    share_id: 'mock-share-safe-skill',
    target_type: 'skill' as const,
    target_id: 'e2e-test-skill-001',
    visibility: 'public' as const,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    expires_at: null,
    metadata: {
      name: 'E2E Test Safe Skill',
      description: 'A safe test skill for E2E testing',
      version: '1.0.0',
      author: 'E2E Test',
      source_url: 'https://github.com/test/e2e-test-skill',
      security_score: 90,
      security_level: 'safe',
    },
  },
  riskSkill: {
    share_id: 'mock-share-risk-skill',
    target_type: 'skill' as const,
    target_id: 'e2e-risk-skill',
    visibility: 'public' as const,
    created_at: new Date(Date.now() - 43200000).toISOString(),
    expires_at: null,
    metadata: {
      name: 'E2E Risk Skill',
      description: 'A skill with potential security risks',
      version: '1.0.0',
      author: 'Test Author',
      source_url: 'https://github.com/test/risk-skill',
      security_score: 45,
      security_level: 'risk',
    },
  },
  blockedSkill: {
    share_id: 'mock-share-blocked-skill',
    target_type: 'skill' as const,
    target_id: 'e2e-blocked-skill',
    visibility: 'public' as const,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    expires_at: null,
    metadata: {
      name: 'E2E Blocked Skill',
      description: 'A blocked skill with dangerous patterns',
      version: '1.0.0',
      author: 'Test Author',
      source_url: 'https://github.com/test/blocked-skill',
      security_score: 10,
      security_level: 'blocked',
    },
  },
  noSourceUrl: {
    share_id: 'mock-share-no-source',
    target_type: 'skill' as const,
    target_id: 'e2e-no-source-skill',
    visibility: 'public' as const,
    created_at: new Date().toISOString(),
    expires_at: null,
    metadata: {
      name: 'E2E No Source Skill',
      description: 'A skill without source URL',
      version: '1.0.0',
      author: 'Test Author',
      source_url: undefined,
      security_score: 75,
      security_level: 'unknown',
    },
  },
  legacyUrlField: {
    share_id: 'mock-share-legacy',
    target_type: 'skill' as const,
    target_id: 'e2e-legacy-skill',
    visibility: 'public' as const,
    created_at: new Date(Date.now() - 172800000).toISOString(),
    expires_at: null,
    metadata: {
      name: 'E2E Legacy Skill',
      description: 'A skill using deprecated url field',
      version: '0.9.0',
      author: 'Legacy Author',
      url: 'https://github.com/test/legacy-skill',
      source_url: undefined,
      security_score: 80,
      security_level: 'safe',
    },
  },
} as const;

/**
 * Task 相关测试数据
 */
export const testTasks = {
  pending: {
    id: 'task-pending-001',
    type: 'import',
    target: 'https://github.com/test/pending-skill',
    status: 'pending' as const,
    progress: { stage: 'Queued', progress: 0, message: 'Task queued' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  running: {
    id: 'task-running-001',
    type: 'import',
    target: 'https://github.com/test/running-skill',
    status: 'running' as const,
    progress: { stage: 'Downloading', progress: 50, message: 'Downloading files' },
    created_at: new Date(Date.now() - 30000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  completed: {
    id: 'task-completed-001',
    type: 'import',
    target: 'https://github.com/test/completed-skill',
    status: 'completed' as const,
    progress: { stage: 'Completed', progress: 100, message: 'Installation complete' },
    created_at: new Date(Date.now() - 60000).toISOString(),
    updated_at: new Date(Date.now() - 10000).toISOString(),
  },
  failed: {
    id: 'task-failed-001',
    type: 'import',
    target: 'https://github.com/test/failed-skill',
    status: 'failed' as const,
    progress: { stage: 'Error', progress: 0, message: 'Network error' },
    error: 'Failed to clone repository',
    created_at: new Date(Date.now() - 90000).toISOString(),
    updated_at: new Date(Date.now() - 90000).toISOString(),
  },
  cancelled: {
    id: 'task-cancelled-001',
    type: 'import',
    target: 'https://github.com/test/cancelled-skill',
    status: 'cancelled' as const,
    progress: { stage: 'Cancelled', progress: 25, message: 'Task cancelled by user' },
    created_at: new Date(Date.now() - 45000).toISOString(),
    updated_at: new Date(Date.now() - 15000).toISOString(),
  },
} as const;

/**
 * 模拟进度事件
 */
export const mockProgressEvents = [
  { task_id: 'task-001', stage: 'Downloading', progress: 25 },
  { task_id: 'task-001', stage: 'Scanning', progress: 50 },
  { task_id: 'task-001', stage: 'Installing', progress: 75 },
  { task_id: 'task-001', stage: 'Completed', progress: 100 },
] as const;

/**
 * Share UI 测试选择器
 */
export const SHARE_TEST_IDS = {
  SHARE_LINK_INPUT: 'share-link-input',
  COPY_LINK_BUTTON: 'copy-link-button',
  SHARE_SHEET: 'share-sheet',
  SHARE_PANEL_LINK: 'share-panel-link',
  SHARE_PANEL_TEXT: 'share-panel-text',
  SHARE_PANEL_IMAGE: 'share-panel-image',
  SHARE_PANEL_PACKAGE: 'share-panel-package',
  INSTALL_BUTTON: 'install-button',
  INSTALL_CONFIRM_DIALOG: 'install-confirm-dialog',
  SYSTEM_INSTALL_RADIO: 'system-install-radio',
  PROJECT_INSTALL_RADIO: 'project-install-radio',
  PROJECT_SELECT: 'project-select',
  PROGRESS_BAR: 'progress-bar',
  PROGRESS_TEXT: 'progress-text',
  VIEW_TASKS_BUTTON: 'view-tasks-button',
  SOURCE_URL_WARNING: 'source-url-warning',
  GITHUB_URL_WARNING: 'github-url-warning',
} as const;

