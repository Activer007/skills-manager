import { test as base } from '@playwright/test';
import { MySkillsPage } from '../pages/my-skills.page';
import { MarketplacePage } from '../pages/marketplace.page';
import { SettingsPage } from '../pages/settings.page';

/**
 * 测试夹具扩展
 *
 * 添加自定义页面对象到测试上下文
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    const prefix = `[e2e:${testInfo.title}]`;

    await page.addInitScript(() => {
      const loadState = () => {
        try {
          return JSON.parse(localStorage.getItem('e2e_tauri_state') || '{}');
        } catch {
          return {};
        }
      };

      const saveState = (state) => {
        localStorage.setItem('e2e_tauri_state', JSON.stringify(state));
      };

      const state = loadState();

      if (!Array.isArray(state.projectPaths)) {
        state.projectPaths = [];
      }
      if (!Array.isArray(state.skills)) {
        state.skills = [];
      }
      if (typeof state.skillConfigs !== 'object' || state.skillConfigs === null) {
        state.skillConfigs = {};
      }
      if (typeof state.securityMode !== 'string') {
        state.securityMode = 'standard';
      }

      const persist = () => saveState(state);

      const ensureTauri = () => {
        const tauri = window.__TAURI__ ?? {};
        tauri.core = tauri.core ?? {};
        tauri.dialog = tauri.dialog ?? {};
        tauri.shell = tauri.shell ?? {};
        tauri.clipboard = tauri.clipboard ?? {};
        window.__TAURI__ = tauri;
        return tauri;
      };

      const buildSecurityReport = (skillId, blocked) => ({
        skill_id: skillId,
        score: blocked ? 10 : 90,
        level: blocked ? 'High' : 'Safe',
        issues: blocked
          ? [
              {
                severity: 'Critical',
                category: 'DangerousFunction',
                description: 'Mock dangerous pattern detected',
              },
            ]
          : [],
        recommendations: blocked ? ['Remove dangerous patterns'] : [],
        blocked,
        hard_trigger_issues: blocked ? ['rm -rf /'] : [],
        scanned_files: [],
      });

      const buildSkillScore = (skillPath) => ({
        total_score: 92,
        grade: 'A',
        content_score: {
          total: 45,
          clarity: { total: 12, has_when_to_use: true, use_cases_count: 2, scenario_clarity: 8 },
          technical_depth: { total: 12, code_examples_count: 2, has_best_practices: true, has_patterns: true, has_io_examples: true },
          documentation: { total: 12, sections_count: 4, has_quick_start: true, avg_line_length: 60 },
          actionability: 9,
        },
        technical_score: {
          total: 27,
          code_quality: { total: 10, code_blocks_count: 2, language_diversity: 1, has_security_keywords: true },
          pattern_design: 9,
          error_handling: 8,
        },
        maintenance_score: { total: 9, update_frequency: 4, community_activity: 3, compatibility: 2, last_update_days: 30 },
        ux_score: { total: 11, ease_of_use: 6, readability: 5 },
        suggestions: ['Improve documentation coverage'],
        metadata: {
          skill_name: skillPath.split(/[\\/]/).pop() || 'mock-skill',
          version: '1.0.0',
          author: 'Mock',
          analyzed_at: new Date().toISOString(),
          analyzer_version: 'mock',
        },
      });

      const tauri = ensureTauri();
      const tauriInternals = window.__TAURI_INTERNALS__ ?? {
        metadata: {
          currentWindow: { label: 'main' },
        },
      };

      const mockInvoke = async (command, args) => {
          const request = args?.request ?? args;

          switch (command) {
            case 'get_project_paths':
              return state.projectPaths;
            case 'save_project_paths':
              state.projectPaths = Array.isArray(request?.paths) ? request.paths : [];
              persist();
              return true;
            case 'scan_skills':
              return { systemSkills: state.skills, projectSkills: [] };
            case 'batch_scan_skills':
              return (Array.isArray(args?.skillPaths) ? args.skillPaths : []).map((path) => {
                const id = path.split(/[\\/]/).pop() || path;
                const blocked = id.includes('dangerous');
                return buildSecurityReport(id, blocked);
              });
            case 'import_github_skill': {
              const repoUrl = request?.repoUrl ?? '';
              const name = String(repoUrl).split('/').pop() || 'mock-skill';
              const blocked = String(repoUrl).includes('dangerous');
              if (blocked) {
                return { success: false, message: 'Blocked by mock security scan', blocked: true };
              }
              const skill = {
                name,
                description: 'Mock imported skill',
                path: `C:\\mock\\skills\\${name}`,
                skillType: 'system',
              };
              state.skills = state.skills.filter((item) => item.path !== skill.path).concat(skill);
              persist();
              return { success: true, message: 'Imported', blocked: false };
            }
            case 'import_local_skill': {
              const sourcePath = request?.sourcePath ?? '';
              const name = request?.skillName ?? (String(sourcePath).split(/[\\/]/).pop() || 'mock-skill');
              const skill = {
                name,
                description: 'Mock local skill',
                path: String(sourcePath) || `C:\\mock\\skills\\${name}`,
                skillType: 'system',
              };
              state.skills = state.skills.filter((item) => item.path !== skill.path).concat(skill);
              persist();
              return { success: true, message: 'Imported', blocked: false };
            }
            case 'import_skill_package': {
              const packagePath = request?.packagePath ?? '';
              const name = String(packagePath).split(/[\\/]/).pop()?.replace('.skillpack.zip', '') || 'mock-skill';
              const skill = {
                name,
                description: 'Mock package skill',
                path: `C:\\mock\\skills\\${name}`,
                skillType: 'system',
              };
              state.skills = state.skills.filter((item) => item.path !== skill.path).concat(skill);
              persist();
              return { success: true, message: 'Imported', blocked: false };
            }
            case 'uninstall_skill': {
              const skillPath = request?.skillPath ?? '';
              state.skills = state.skills.filter((item) => item.path !== skillPath);
              persist();
              return { success: true, message: 'Uninstalled', blocked: false };
            }
            case 'get_skill_config': {
              const skillId = args?.skillId ?? '';
              return state.skillConfigs[skillId] ?? {};
            }
            case 'set_skill_config': {
              const skillId = args?.skillId ?? '';
              const config = args?.config ?? {};
              state.skillConfigs[skillId] = config;
              persist();
              return true;
            }
            case 'analyze_skill_quality': {
              const skillPath = args?.skillPath ?? '';
              return buildSkillScore(String(skillPath));
            }
            case 'batch_analyze_skills': {
              const skillPaths = Array.isArray(args?.skillPaths) ? args.skillPaths : [];
              return skillPaths.map((path) => buildSkillScore(String(path)));
            }
            case 'batch_analyze_skills_detailed': {
              const skillPaths = Array.isArray(args?.skillPaths) ? args.skillPaths : [];
              return {
                scores: skillPaths.map((path) => buildSkillScore(String(path))),
                errors: [],
                total: skillPaths.length,
                successful: skillPaths.length,
                failed: 0,
              };
            }
            case 'scan_skill_security': {
              const skillPath = args?.skillPath ?? '';
              const skillId = String(skillPath).split(/[\\/]/).pop() || 'mock-skill';
              return buildSecurityReport(skillId, skillId.includes('dangerous'));
            }
            case 'read_skill': {
              const skillPath = args?.skillPath ?? '';
              return `# ${String(skillPath).split(/[\\/]/).pop() || 'Mock Skill'}\n\nThis is mocked content for E2E testing.`;
            }
            case 'get_cache_stats':
              return { total_size: 0, file_count: 0, skills_count: Array.isArray(state.skills) ? state.skills.length : 0 };
            case 'clear_cache':
              return true;
            case 'open_url':
            case 'open_path_in_file_manager':
              return true;
            default:
              console.log(`[e2e] mock invoke ${command}`);
              return null;
          }
        };

      tauri.core.invoke = mockInvoke;
      tauriInternals.invoke = mockInvoke;
      window.__TAURI_INTERNALS__ = tauriInternals;

      console.log('[e2e] __TAURI__ mock initialized');

      if (!tauri.dialog.open) {
        tauri.dialog.open = async () => null;
      }
      if (!tauri.dialog.save) {
        tauri.dialog.save = async () => null;
      }
      if (!tauri.shell.open) {
        tauri.shell.open = async () => true;
      }
      if (!tauri.clipboard.writeText) {
        tauri.clipboard.writeText = async () => {};
      }
      if (!tauri.clipboard.readText) {
        tauri.clipboard.readText = async () => '';
      }
    });

    console.log(`${prefix} start`);

    page.on('console', (msg) => {
      console.log(`${prefix} [browser:${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
      console.log(`${prefix} [pageerror] ${error.message}`);
    });

    page.on('requestfailed', (request) => {
      const failure = request.failure();
      console.log(
        `${prefix} [requestfailed] ${request.method()} ${request.url()} ${failure?.errorText || ''}`.trim()
      );
    });

    page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        console.log(`${prefix} [response] ${status} ${response.url()}`);
      }
    });

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        console.log(`${prefix} [navigated] ${frame.url()}`);
      }
    });

    await use(page);

    console.log(`${prefix} end`);
  },

  mySkillsPage: async ({ page }, use) => {
    const mySkillsPage = new MySkillsPage(page);
    await use(mySkillsPage);
  },

  marketplacePage: async ({ page }, use) => {
    const marketplacePage = new MarketplacePage(page);
    await use(marketplacePage);
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },
});

export { expect } from '@playwright/test';
