import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../store/useSkillStore', () => ({
  useSkillStore: () => ({
    projectPaths: [],
    fetchProjectPaths: vi.fn(),
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
  Input: ({ placeholder, value, onChange, onKeyDown }: any) => (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
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
      expect(screen.getByText('settings')).toBeInTheDocument();
    });

    it('should render page title', () => {
      render(<Settings />);
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render installation settings section', () => {
      render(<Settings />);
      expect(screen.getByText(/Installation Settings/)).toBeInTheDocument();
    });

    it('should render project paths section', () => {
      render(<Settings />);
      expect(screen.getByText(/projectPaths/)).toBeInTheDocument();
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
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
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
