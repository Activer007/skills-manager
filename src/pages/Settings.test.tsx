import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Plus: ({ className }: { className?: string }) => <svg data-testid="plus-icon" className={className} />,
  X: ({ className }: { className?: string }) => <svg data-testid="x-icon" className={className} />,
  FolderOpen: ({ className }: { className?: string }) => <svg data-testid="folder-icon" className={className} />,
  ExternalLink: ({ className }: { className?: string }) => <svg data-testid="external-icon" className={className} />,
  Package: ({ className }: { className?: string }) => <svg data-testid="package-icon" className={className} />,
}));

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        settings: 'Settings',
        projectPaths: 'Project Paths',
        noData: 'noData',
        saveError: 'Save failed',
        theme: 'Theme',
        light: 'Light',
        dark: 'Dark',
      };
      return translations[key] || key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn((cmd: string) => {
    if (cmd === 'get_security_config') {
      return Promise.resolve({ scan_mode: 'standard' });
    }
    if (cmd === 'get_cache_stats') {
      return Promise.resolve({ total_size: 0, file_count: 0, skills_count: 0 });
    }
    return Promise.resolve(undefined);
  }),
}));

vi.mock('../store/useSkillStore', () => ({
  useSkillStore: () => ({
    projectPaths: [],
    fetchProjectPaths: vi.fn().mockResolvedValue(undefined),
    saveProjectPaths: vi.fn().mockResolvedValue(undefined),
    defaultInstallLocation: 'system',
    setDefaultInstallLocation: vi.fn(),
    marketplaceSkills: [],
    selectedProjectIndex: 0,
    setSelectedProjectIndex: vi.fn(),
    showSecuritySection: true,
    setShowSecuritySection: vi.fn(),
  }),
}));

vi.mock('../store/useToastStore', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../components/ui/Button', () => ({
  Button: ({ children, onClick, variant, size, className, disabled }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size} className={className} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock('../components/ui/Input', () => ({
  Input: ({ placeholder, value, onChange, onKeyDown, ...props }: any) => (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      data-testid={props['data-testid']}
    />
  ),
}));

vi.mock('../components/ui/Select', () => ({
  Select: ({ label, options }: any) => (
    <div>
      <label>{label}</label>
      <select>
        {options?.map((opt: any) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock('../components/CacheStatsCard', () => ({
  CacheStatsCard: () => <div data-testid="cache-stats-card">Cache Stats</div>,
}));

import Settings from './Settings';

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<Settings />);
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should render page title', () => {
      render(<Settings />);
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render installation settings section', () => {
      render(<Settings />);
      expect(screen.getByText(/Skill Installation Settings/)).toBeInTheDocument();
    });

    it('should render project paths section', () => {
      render(<Settings />);
      expect(screen.getByText(/Project Paths/)).toBeInTheDocument();
    });

    it('should render cache stats card', () => {
      render(<Settings />);
      expect(screen.getByTestId('cache-stats-card')).toBeInTheDocument();
    });

    it('should render appearance settings', () => {
      render(<Settings />);
      expect(screen.getByText(/Appearance/)).toBeInTheDocument();
    });

    it('should render developer options', () => {
      render(<Settings />);
      expect(screen.getByText(/Developer Options/)).toBeInTheDocument();
    });

    it('should render danger zone', () => {
      render(<Settings />);
      expect(screen.getByText(/Danger Zone/)).toBeInTheDocument();
    });
  });

  describe('Installation Settings', () => {
    it('should render system directory option', () => {
      render(<Settings />);
      expect(screen.getByText(/System Global Directory/)).toBeInTheDocument();
    });

    it('should render project-specific directory option', () => {
      render(<Settings />);
      expect(screen.getByText(/Project-Specific Directory/)).toBeInTheDocument();
    });
  });

  describe('About Section', () => {
    it('should display version information', () => {
      render(<Settings />);
      expect(screen.getByText('v1.2.2')).toBeInTheDocument();
    });

    it('should display marketplace skills count', () => {
      render(<Settings />);
      expect(screen.getByText(/0 skills/)).toBeInTheDocument();
    });
  });

  describe('Project Paths', () => {
    it('should display empty state when no paths', () => {
      render(<Settings />);
      expect(screen.getByText('noData')).toBeInTheDocument();
    });

    it('should render add path input', () => {
      render(<Settings />);
      expect(screen.getByTestId('path-input')).toBeInTheDocument();
    });

    it('should render add button', () => {
      render(<Settings />);
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Layout', () => {
    it('should use responsive grid layout', () => {
      const { container } = render(<Settings />);
      expect(container.querySelector('.grid')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<Settings />);
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });
  });
});
