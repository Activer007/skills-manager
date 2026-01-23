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
