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
        // 预置一个测试 Skill 用于分享/详情等测试
        state.skills = [
          {
            id: 'e2e-test-skill-001',
            name: 'E2E Test Skill',
            description: 'A test skill for E2E testing - 用于端到端测试的 Skill',
            descriptionZh: '用于端到端测试的 Skill',
            descriptionEn: 'A test skill for E2E testing',
            installDate: Date.now() - 86400000, // 1 day ago
            localPath: 'C:\\mock\\skills\\e2e-test-skill',
            path: 'C:\\mock\\skills\\e2e-test-skill',
            status: 'safe',
            type: 'system',
            version: '1.0.0',
            enabled: true,
            config: { enabled: true },
            author: 'E2E Test',
            authorAvatar: 'https://github.com/user.png',
            githubUrl: 'https://github.com/test/e2e-test-skill',
            stars: 42,
            forks: 5,
            securityScore: 90,
          },
        ];
      }
      if (typeof state.skillConfigs !== 'object' || state.skillConfigs === null) {
        state.skillConfigs = {
          'e2e-test-skill-001': { enabled: true },
        };
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
              // 将 state.skills 转换为 ScanSkillEntry 格式
              const systemSkills = (state.skills || []).map((skill) => ({
                name: skill.name || 'Unknown Skill',
                description: skill.description || '',
                path: skill.localPath || skill.path || '',
                skillType: skill.skillType || skill.type || 'system',
                isMcp: skill.isMcp || false,
                tags: skill.tags || [],
                configSchema: skill.configSchema || {},
              }));
              return { systemSkills, projectSkills: [] };
            case 'batch_scan_skills':
              return (Array.isArray(args?.skillPaths) ? args.skillPaths : []).map((path) => {
                const id = path.split(/[\\/]/).pop() || path;
                // E2E test skill 默认安全，其他包含 dangerous 的才不安全
                const blocked = id.includes('dangerous') && !id.includes('e2e-test');
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
            // Share Link Commands
            case 'generate_share_link': {
              const targetId = request?.targetId ?? args?.targetId ?? 'mock-skill';
              const metadata = request?.metadata ?? args?.metadata ?? {};
              const shareId = `mock-share-${targetId}-${Date.now()}`;
              return {
                share_id: shareId,
                target_type: request?.targetType ?? 'skill',
                target_id: targetId,
                visibility: request?.visibility ?? 'public',
                created_at: new Date().toISOString(),
                expires_at: null,
                metadata: {
                  name: metadata?.name ?? 'Mock Skill',
                  description: metadata?.description ?? 'Mock description',
                  version: metadata?.version ?? '1.0.0',
                  author: metadata?.author,
                  source_url: metadata?.source_url,
                  security_score: metadata?.security_score ?? 85,
                  security_level: metadata?.security_level ?? 'safe',
                },
              };
            }
            case 'resolve_share_link': {
              const shareId = args?.shareId ?? '';
              // Mock database of share records
              const mockShares = {
                'mock-share-001': {
                  share_id: 'mock-share-001',
                  target_type: 'skill',
                  target_id: 'e2e-test-skill-001',
                  visibility: 'public',
                  created_at: new Date(Date.now() - 86400000).toISOString(),
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
                'non-existent-share': null,
                'expired-share': null,
                'mock-share-risk-skill': {
                  share_id: 'mock-share-risk-skill',
                  target_type: 'skill',
                  target_id: 'e2e-risk-skill',
                  visibility: 'public',
                  created_at: new Date().toISOString(),
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
                'mock-share-blocked-skill': {
                  share_id: 'mock-share-blocked-skill',
                  target_type: 'skill',
                  target_id: 'e2e-blocked-skill',
                  visibility: 'public',
                  created_at: new Date().toISOString(),
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
                'mock-share-no-source': {
                  share_id: 'mock-share-no-source',
                  target_type: 'skill',
                  target_id: 'e2e-no-source-skill',
                  visibility: 'public',
                  created_at: new Date().toISOString(),
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
              };
              return mockShares[shareId] ?? null;
            }
            case 'get_git_remote_url': {
              const path = args?.path ?? '';
              if (path.includes('e2e-test-skill')) {
                return 'https://github.com/test/e2e-test-skill';
              }
              return null;
            }
            // Task Commands
            case 'import_github_skill_with_progress': {
              const repoUrl = request?.repoUrl ?? '';
              const taskId = `task-${Date.now()}`;
              // Mock progress simulation via setTimeout
              setTimeout(() => {
                if (window.__TAURI__?.core?.emit) {
                  window.__TAURI__.core.emit('task-progress', {
                    task_id: taskId,
                    stage: 'Downloading',
                    progress: 25,
                  });
                }
              }, 1000);
              setTimeout(() => {
                if (window.__TAURI__?.core?.emit) {
                  window.__TAURI__.core.emit('task-progress', {
                    task_id: taskId,
                    stage: 'Scanning',
                    progress: 50,
                  });
                }
              }, 2000);
              setTimeout(() => {
                if (window.__TAURI__?.core?.emit) {
                  window.__TAURI__.core.emit('task-progress', {
                    task_id: taskId,
                    stage: 'Installing',
                    progress: 75,
                  });
                }
              }, 3000);
              setTimeout(() => {
                if (window.__TAURI__?.core?.emit) {
                  window.__TAURI__.core.emit('task-progress', {
                    task_id: taskId,
                    stage: 'Completed',
                    progress: 100,
                  });
                }
              }, 4000);
              return taskId;
            }
            case 'get_tasks': {
              // Return mock task list
              return [
                {
                  id: 'task-001',
                  type: 'import',
                  target: 'https://github.com/test/skill-1',
                  status: 'completed',
                  progress: { stage: 'Completed', progress: 100, message: 'Complete' },
                  created_at: new Date(Date.now() - 60000).toISOString(),
                  updated_at: new Date().toISOString(),
                },
                {
                  id: 'task-002',
                  type: 'import',
                  target: 'https://github.com/test/skill-2',
                  status: 'running',
                  progress: { stage: 'Downloading', progress: 50, message: 'Downloading' },
                  created_at: new Date(Date.now() - 30000).toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ];
            }
            case 'cancel_task': {
              const taskId = args?.taskId ?? '';
              // Mock cancellation
              return true;
            }
            case 'cleanup_tasks': {
              // Mock cleanup - remove completed tasks
              return;
            }
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

  // Test data fixtures
  testShareLinks: async ({}, use) => {
    const { testShareLinks } = await import('./test-data');
    await use(testShareLinks);
  },

  testShareRecords: async ({}, use) => {
    const { testShareRecords } = await import('./test-data');
    await use(testShareRecords);
  },

  testTasks: async ({}, use) => {
    const { testTasks } = await import('./test-data');
    await use(testTasks);
  },
});

export { expect } from '@playwright/test';
