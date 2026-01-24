import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import Dashboard from './Dashboard';

// Mock dependencies
vi.mock('../hooks/useSkills', () => ({
  useSkills: () => ({
    data: [
      {
        id: 'skill-1',
        name: 'Git Commander',
        type: 'system',
        status: 'safe',
        localPath: '/path/to/skill1',
        description: 'A git management skill',
        author: 'Test Author',
        version: '1.0.0',
      },
      {
        id: 'skill-2',
        name: 'Web Search',
        type: 'project',
        status: 'safe',
        localPath: '/path/to/skill2',
        description: 'A web search skill',
        author: 'Test Author',
        version: '1.0.0',
      },
      {
        id: 'skill-3',
        name: 'Unsafe Skill',
        type: 'system',
        status: 'unsafe',
        localPath: '/path/to/skill3',
        description: 'A risky skill',
        author: 'Test Author',
        version: '1.0.0',
      },
    ],
    isLoading: false,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        installedSkills: 'Installed Skills',
        systemLevel: 'System Level',
        projectLevel: 'Project Level',
        skillUsageTrend: 'Skill Usage Trend',
        recentActivity: 'Recent Activity',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
    },
  }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children, width, height }: any) => (
    <div style={{ width, height }} data-testid="responsive-container">
      {children}
    </div>
  ),
  AreaChart: ({ children, data }: any) => (
    <div data-testid="area-chart" data-length={data?.length}>
      {children}
    </div>
  ),
  Area: () => <div data-testid="area" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: ({ contentStyle }: any) => <div data-testid="tooltip" />,
  PieChart: ({ children }: any) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
}));

vi.mock('../components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock('../utils/cn', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<Dashboard />);
      // If it renders without throwing, test passes
      expect(true).toBe(true);
    });

    it('should render all stat cards', () => {
      render(<Dashboard />);

      expect(screen.getByText('Installed Skills')).toBeInTheDocument();
      expect(screen.getByText('System Level')).toBeInTheDocument();
      expect(screen.getByText('Project Level')).toBeInTheDocument();
      expect(screen.getByText('Security Score')).toBeInTheDocument();
    });

    it('should render skill usage trend chart', () => {
      render(<Dashboard />);

      expect(screen.getByText('Skill Usage Trend')).toBeInTheDocument();
    });

    it('should render skill categories chart', () => {
      render(<Dashboard />);

      expect(screen.getByText('Skill Categories')).toBeInTheDocument();
    });

    it('should render recent activity section', () => {
      render(<Dashboard />);

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(screen.getByText(/Git Commander/)).toBeInTheDocument();
      expect(screen.getByText(/Web Search/)).toBeInTheDocument();
      expect(screen.getByText(/Security Scan/)).toBeInTheDocument();
    });
  });

  describe('Charts', () => {
    it('should render all chart components', () => {
      render(<Dashboard />);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    });

    it('should render chart axes and grid', () => {
      render(<Dashboard />);

      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
    });
  });

  describe('Activity Timeline', () => {
    it('should display all activity items', () => {
      render(<Dashboard />);

      expect(screen.getByText(/Git Commander/)).toBeInTheDocument();
      expect(screen.getByText(/2 min ago/)).toBeInTheDocument();
      expect(screen.getByText(/Web Search/)).toBeInTheDocument();
      expect(screen.getByText(/Security Scan/)).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should use responsive grid layout', () => {
      const { container } = render(<Dashboard />);

      // Check for grid classes
      expect(container.querySelector('.grid')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<Dashboard />);

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should display readable text', () => {
      render(<Dashboard />);

      expect(screen.getByText('Installed Skills')).toBeInTheDocument();
      expect(screen.getByText('Skill Usage Trend')).toBeInTheDocument();
    });
  });
});
