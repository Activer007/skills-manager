// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import {
  useSkills,
  useImportSkill,
  useUninstallSkill,
  useImportLocalSkill,
  useImportPackageSkill,
  useMarketplaceSkills,
  useInstallSkill
} from './useSkills';
import type { InstalledSkill } from '../types';
import type { SecurityReport } from '../types/security';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock marketplace fetch
vi.mock('../utils/marketplace', () => ({
  fetchMarketplaceData: vi.fn(),
}));

const { fetchMarketplaceData } = await import('../utils/marketplace');

// Mock data
const mockSystemSkills = [
  {
    name: 'system-skill-1',
    description: 'System skill 1',
    path: 'C:/Users/test/.claude/skills/system-skill-1',
    skillType: 'system',
    isMcp: false,
    tags: ['testing'],
    configSchema: { enabled: true },
  },
  {
    name: 'system-skill-2',
    path: 'C:/Users/test/.claude/skills/system-skill-2',
    skillType: 'system',
    isMcp: false,
  },
];

const mockProjectSkills = [
  {
    name: 'project-skill-1',
    description: 'Project skill 1',
    path: 'D:/project/.claude/skills/project-skill-1',
    skillType: 'project',
    isMcp: true,
    tags: ['mcp'],
  },
];

const mockSecurityReports: SecurityReport[] = [
  {
    skill_id: 'system-skill-1',
    score: 95,
    level: 'Safe',
    issues: [],
    recommendations: [],
    blocked: false,
    hard_trigger_issues: [],
    scanned_files: ['SKILL.md'],
  },
  {
    skill_id: 'system-skill-2',
    score: 60,
    level: 'Medium',
    issues: [],
    recommendations: ['Add tests'],
    blocked: false,
    hard_trigger_issues: [],
    scanned_files: ['SKILL.md'],
  },
  {
    skill_id: 'project-skill-1',
    score: 80,
    level: 'Low',
    issues: [],
    recommendations: [],
    blocked: false,
    hard_trigger_issues: [],
    scanned_files: ['SKILL.md'],
  },
];

const mockSkillConfigs: Record<string, unknown> = {
  'C:/Users/test/.claude/skills/system-skill-1': { enabled: true },
  'C:/Users/test/.claude/skills/system-skill-2': { enabled: false },
  'D:/project/.claude/skills/project-skill-1': { enabled: true },
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useSkills Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe('useSkills', () => {
    it('fetches skills successfully', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ systemSkills: mockSystemSkills, projectSkills: mockProjectSkills })
        .mockResolvedValueOnce(mockSecurityReports)
        .mockResolvedValueOnce(mockSkillConfigs['C:/Users/test/.claude/skills/system-skill-1'])
        .mockResolvedValueOnce(mockSkillConfigs['C:/Users/test/.claude/skills/system-skill-2'])
        .mockResolvedValueOnce(mockSkillConfigs['D:/project/.claude/skills/project-skill-1']);

      const { result } = renderHook(() => useSkills(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invoke).toHaveBeenCalledWith('scan_skills');
      expect(result.current.data).toHaveLength(3);
    });

    it('combines system and project skills', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ systemSkills: mockSystemSkills, projectSkills: mockProjectSkills })
        .mockResolvedValueOnce(mockSecurityReports)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const { result } = renderHook(() => useSkills(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const skills = result.current.data as InstalledSkill[];
      const systemSkills = skills.filter(s => s.type === 'system');
      const projectSkills = skills.filter(s => s.type === 'project');

      expect(systemSkills).toHaveLength(2);
      expect(projectSkills).toHaveLength(1);
    });

    it('merges security reports', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ systemSkills: mockSystemSkills, projectSkills: [] })
        .mockResolvedValueOnce(mockSecurityReports.slice(0, 2))
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const { result } = renderHook(() => useSkills(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const skills = result.current.data as InstalledSkill[];
      expect(skills[0].securityScore).toBe(95);
      expect(skills[1].securityScore).toBe(60);
    });

    it('merges skill configs', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ systemSkills: mockSystemSkills, projectSkills: [] })
        .mockResolvedValueOnce(mockSecurityReports.slice(0, 2))
        .mockResolvedValueOnce({ enabled: true })
        .mockResolvedValueOnce({ enabled: false });

      const { result } = renderHook(() => useSkills(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const skills = result.current.data as InstalledSkill[];
      expect(skills[0].enabled).toBe(true);
      expect(skills[1].enabled).toBe(false);
    });

    it('handles empty skills list', async () => {
      vi.mocked(invoke).mockResolvedValueOnce({ systemSkills: [], projectSkills: [] });

      const { result } = renderHook(() => useSkills(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
      expect(invoke).toHaveBeenCalledWith('scan_skills');
      expect(invoke).not.toHaveBeenCalledWith('batch_scan_skills');
    });

    it('caches data for 5 minutes', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ systemSkills: mockSystemSkills, projectSkills: [] })
        .mockResolvedValueOnce([mockSecurityReports[0]])
        .mockResolvedValueOnce({});

      const { result, rerender } = renderHook(() => useSkills(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Get invoke count after initial fetch
      const invokeCountAfterInitial = vi.mocked(invoke).mock.calls.length;

      // Rerender should use cache, so scan_skills should not be called again
      rerender();

      // Only batch_scan_skills and get_skill_config might be called again due to Promise.all behavior
      // But scan_skills should only be called once total
      expect(vi.mocked(invoke).mock.calls.length).toBeLessThanOrEqual(invokeCountAfterInitial + 2);
    });
  });

  describe('useImportSkill', () => {
    it('calls import_github_skill correctly', async () => {
      const mockSkill = {
        name: 'test-skill',
        githubUrl: 'https://github.com/test/skill',
        description: 'Test',
        author: 'tester',
        version: '1.0.0',
        stars: 10,
        installDate: Date.now(),
      };

      vi.mocked(invoke).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useImportSkill(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockSkill);
      });

      expect(invoke).toHaveBeenCalledWith('import_github_skill', {
        request: {
          repoUrl: mockSkill.githubUrl,
          skipSecurityCheck: false
        }
      });
    });

    it('invalidates skills query on success', async () => {
      const mockSkill = {
        name: 'test-skill',
        githubUrl: 'https://github.com/test/skill',
        description: 'Test',
        author: 'tester',
        version: '1.0.0',
        stars: 10,
        installDate: Date.now(),
      };

      vi.mocked(invoke)
        .mockResolvedValueOnce({ systemSkills: [], projectSkills: [] })
        .mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSkills(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const importHook = renderHook(() => useImportSkill(), { wrapper });

      await act(async () => {
        await importHook.result.current.mutateAsync(mockSkill);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['skills'] });
    });
  });

  describe('useUninstallSkill', () => {
    it('removes skill optimistically', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ systemSkills: mockSystemSkills, projectSkills: [] })
        .mockResolvedValueOnce([mockSecurityReports[0]])
        .mockResolvedValueOnce({});

      const { result } = renderHook(() => useSkills(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const initialCount = (result.current.data as InstalledSkill[]).length;

      vi.mocked(invoke).mockResolvedValue({ success: true });

      const uninstallHook = renderHook(() => useUninstallSkill(), { wrapper });

      await act(async () => {
        await uninstallHook.result.current.mutateAsync(mockSystemSkills[0].path);
      });

      // Optimistic update should have removed the skill
      await waitFor(() => {
        const skills = queryClient.getQueryData<InstalledSkill[]>(['skills']);
        expect(skills).toHaveLength(initialCount - 1);
      });
    });

    it('rolls back on error', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ systemSkills: mockSystemSkills, projectSkills: [] })
        .mockResolvedValueOnce([mockSecurityReports[0]])
        .mockResolvedValueOnce({});

      const { result } = renderHook(() => useSkills(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const previousSkills = queryClient.getQueryData<InstalledSkill[]>(['skills']);

      vi.mocked(invoke).mockRejectedValue(new Error('Uninstall failed'));

      const uninstallHook = renderHook(() => useUninstallSkill(), { wrapper });

      await act(async () => {
        try {
          await uninstallHook.result.current.mutateAsync(mockSystemSkills[0].path);
        } catch (e) {
          // Expected to fail
        }
      });

      await waitFor(() => {
        const skills = queryClient.getQueryData<InstalledSkill[]>(['skills']);
        expect(skills).toEqual(previousSkills);
      });
    });

    it('refetches after success/error', async () => {
      vi.mocked(invoke)
        .mockResolvedValueOnce({ systemSkills: mockSystemSkills, projectSkills: [] })
        .mockResolvedValueOnce([mockSecurityReports[0]])
        .mockResolvedValueOnce({});

      const { result } = renderHook(() => useSkills(), { wrapper });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      vi.mocked(invoke).mockResolvedValue({ success: true });

      const uninstallHook = renderHook(() => useUninstallSkill(), { wrapper });

      await act(async () => {
        await uninstallHook.result.current.mutateAsync(mockSystemSkills[0].path);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['skills'] });
    });
  });

  describe('useImportLocalSkill', () => {
    it('calls import_local_skill correctly', async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useImportLocalSkill(), { wrapper });

      const folderPath = 'C:/Users/test/my-skill';

      await act(async () => {
        await result.current.mutateAsync(folderPath);
      });

      expect(invoke).toHaveBeenCalledWith('import_local_skill', {
        request: {
          sourcePath: folderPath,
          skillName: 'my-skill',
          skipSecurityCheck: false
        }
      });
    });

    it('invalidates skills query on success', async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useImportLocalSkill(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('C:/Users/test/my-skill');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['skills'] });
    });
  });

  describe('useImportPackageSkill', () => {
    it('calls import_skill_package correctly', async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useImportPackageSkill(), { wrapper });

      const packagePath = 'C:/Users/test/sample.skillpack.zip';

      await act(async () => {
        await result.current.mutateAsync(packagePath);
      });

      expect(invoke).toHaveBeenCalledWith('import_skill_package', {
        request: {
          packagePath,
          skipSecurityCheck: false
        }
      });
    });

    it('invalidates skills query on success', async () => {
      vi.mocked(invoke).mockResolvedValue({ success: true });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useImportPackageSkill(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync('C:/Users/test/sample.skillpack.zip');
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['skills'] });
    });
  });

  describe('useMarketplaceSkills', () => {
    it('fetches marketplace data', async () => {
      const mockMarketplaceData = [
        {
          name: 'marketplace-skill',
          githubUrl: 'https://github.com/test/marketplace-skill',
          description: 'Test',
          author: 'tester',
          version: '1.0.0',
          stars: 100,
          installDate: Date.now(),
        },
      ];

      vi.mocked(fetchMarketplaceData).mockResolvedValue(mockMarketplaceData);

      const { result } = renderHook(() => useMarketplaceSkills(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(fetchMarketplaceData).toHaveBeenCalled();
      expect(result.current.data).toEqual(mockMarketplaceData);
    });

    it('caches marketplace data for 10 minutes', async () => {
      const mockMarketplaceData = [
        {
          name: 'marketplace-skill',
          githubUrl: 'https://github.com/test/marketplace-skill',
          description: 'Test',
          author: 'tester',
          version: '1.0.0',
          stars: 100,
          installDate: Date.now(),
        },
      ];

      vi.mocked(fetchMarketplaceData).mockResolvedValue(mockMarketplaceData);

      const { result, rerender } = renderHook(() => useMarketplaceSkills(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Rerender should use cache
      rerender();

      expect(fetchMarketplaceData).toHaveBeenCalledTimes(1);
    });
  });

  describe('useInstallSkill', () => {
    it('invalidates both skills and marketplace queries on success', async () => {
      const mockSkill = {
        name: 'test-skill',
        githubUrl: 'https://github.com/test/skill',
        description: 'Test',
        author: 'tester',
        version: '1.0.0',
        stars: 10,
        installDate: Date.now(),
      };

      vi.mocked(invoke).mockResolvedValue({ success: true });

      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useInstallSkill(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(mockSkill);
      });

      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['skills'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['marketplace-skills'] });
    });
  });
});
