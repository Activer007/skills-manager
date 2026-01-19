import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SecurityReportCard from './SecurityReportCard';
import type { SecurityReport } from '../types/security';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Shield: ({ className }: { className: string }) => <div data-testid="shield-icon" className={className} />,
  AlertTriangle: ({ className }: { className: string }) => <div data-testid="alert-icon" className={className} />,
  CheckCircle: ({ className }: { className: string }) => <div data-testid="check-icon" className={className} />,
  XCircle: ({ className }: { className: string }) => <div data-testid="x-circle-icon" className={className} />,
  Info: ({ className }: { className: string }) => <div data-testid="info-icon" className={className} />,
  FileWarning: ({ className }: { className: string }) => <div data-testid="file-warning-icon" className={className} />,
  ChevronDown: ({ size }: { size: number }) => <div data-testid="chevron-down" data-size={size} />,
  ChevronUp: ({ size }: { size: number }) => <div data-testid="chevron-up" data-size={size} />,
}));

const createMockReport = (score: number, level: SecurityReport['level'], blocked = false): SecurityReport => ({
  skill_id: 'test-skill',
  score,
  level,
  issues: score < 90 ? [
    {
      severity: 'Warning',
      category: 'Other',
      description: 'Test issue',
      file_path: 'test.ts',
      line_number: 10,
      code_snippet: 'const x = 1;',
    }
  ] : [],
  recommendations: score < 90 ? ['Recommendation 1', 'Recommendation 2'] : [],
  blocked,
  hard_trigger_issues: blocked ? ['Hard trigger issue'] : [],
  scanned_files: ['SKILL.md', 'index.ts'],
});

describe('SecurityReportCard', () => {
  describe('Rendering States', () => {
    it('renders loading state', () => {
      render(<SecurityReportCard report={null} loading={true} />);
      expect(screen.getByText('正在执行安全扫描...')).toBeInTheDocument();
      expect(screen.getByText('正在执行安全扫描...').parentElement?.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('returns null when report is null and not loading', () => {
      const { container } = render(<SecurityReportCard report={null} loading={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders report summary', () => {
      const mockReport = createMockReport(85, 'Low');
      render(<SecurityReportCard report={mockReport} />);

      expect(screen.getByText('安全扫描报告')).toBeInTheDocument();
      expect(screen.getByText('85 / 100')).toBeInTheDocument();
      expect(screen.getByText('2 个文件已扫描')).toBeInTheDocument();
    });
  });

  describe('Security Levels', () => {
    it('displays Safe level (score >= 90)', () => {
      const mockReport = createMockReport(95, 'Safe');
      render(<SecurityReportCard report={mockReport} />);

      expect(screen.getByText('95 / 100')).toHaveClass('text-success');
      expect(screen.getByText('安全')).toHaveClass('badge-success');
    });

    it('displays Low risk (score 70-89)', () => {
      const mockReport = createMockReport(75, 'Low');
      render(<SecurityReportCard report={mockReport} />);

      expect(screen.getByText('75 / 100')).toHaveClass('text-warning');
      expect(screen.getByText('低风险')).toHaveClass('badge-warning');
    });

    it('displays Medium risk (score 50-69)', () => {
      const mockReport = createMockReport(60, 'Medium');
      render(<SecurityReportCard report={mockReport} />);

      expect(screen.getByText('60 / 100')).toHaveClass('text-warning');
      expect(screen.getByText('中等风险')).toHaveClass('badge-warning');
    });

    it('displays High risk (score 30-49)', () => {
      const mockReport = createMockReport(40, 'High');
      render(<SecurityReportCard report={mockReport} />);

      expect(screen.getByText('40 / 100')).toHaveClass('text-error');
      expect(screen.getByText('高风险')).toHaveClass('badge-error');
    });

    it('displays Critical risk (score < 30)', () => {
      const mockReport = createMockReport(20, 'Critical');
      render(<SecurityReportCard report={mockReport} />);

      expect(screen.getByText('20 / 100')).toHaveClass('text-error');
      expect(screen.getByText('严重风险')).toHaveClass('badge-error');
    });
  });

  describe('Interactions', () => {
    it('is collapsed by default', () => {
      const mockReport = createMockReport(75, 'Low');
      render(<SecurityReportCard report={mockReport} />);

      // Details should not be visible initially
      expect(screen.queryByText('安全建议')).not.toBeInTheDocument();
      expect(screen.queryByText('安全问题详情')).not.toBeInTheDocument();
    });

    it('expands when header clicked', () => {
      const mockReport = createMockReport(75, 'Low');
      render(<SecurityReportCard report={mockReport} />);

      // Click header to expand
      const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
      fireEvent.click(header!);

      // Now details should be visible
      expect(screen.getByText('安全建议')).toBeInTheDocument();
      expect(screen.getByText('Recommendation 1')).toBeInTheDocument();
      expect(screen.getByText('Recommendation 2')).toBeInTheDocument();
    });

    it('collapses when clicked again', () => {
      const mockReport = createMockReport(75, 'Low');
      render(<SecurityReportCard report={mockReport} />);

      const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;

      // First click - expand
      fireEvent.click(header!);
      expect(screen.getByText('安全建议')).toBeInTheDocument();

      // Second click - collapse
      fireEvent.click(header!);
      expect(screen.queryByText('安全建议')).not.toBeInTheDocument();
    });
  });

  describe('Blocked State', () => {
    it('shows blocked warning', () => {
      const mockReport = createMockReport(10, 'Critical', true);
      render(<SecurityReportCard report={mockReport} />);

      const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
      fireEvent.click(header!);

      expect(screen.getByText('检测到严重安全风险，已阻止安装！')).toBeInTheDocument();
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });

    it('displays hard trigger issues', () => {
      const mockReport: SecurityReport = {
        skill_id: 'test-skill',
        score: 5,
        level: 'Critical',
        issues: [],
        recommendations: [],
        blocked: true,
        hard_trigger_issues: ['Issue 1', 'Issue 2', 'Issue 3'],
        scanned_files: ['SKILL.md'],
      };
      render(<SecurityReportCard report={mockReport} />);

      const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
      fireEvent.click(header!);

      expect(screen.getByText('Issue 1')).toBeInTheDocument();
      expect(screen.getByText('Issue 2')).toBeInTheDocument();
      expect(screen.getByText('Issue 3')).toBeInTheDocument();
    });
  });

  describe('Content Display', () => {
    it('renders recommendations list', () => {
      const mockReport: SecurityReport = {
        skill_id: 'test-skill',
        score: 70,
        level: 'Low',
        issues: [],
        recommendations: ['Fix this', 'Update that', 'Add feature'],
        blocked: false,
        hard_trigger_issues: [],
        scanned_files: ['SKILL.md'],
      };
      render(<SecurityReportCard report={mockReport} />);

      const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
      fireEvent.click(header!);

      expect(screen.getByText('安全建议')).toBeInTheDocument();
      expect(screen.getByText('Fix this')).toBeInTheDocument();
      expect(screen.getByText('Update that')).toBeInTheDocument();
      expect(screen.getByText('Add feature')).toBeInTheDocument();
    });

    it('renders issues with badges', () => {
      const mockReport: SecurityReport = {
        skill_id: 'test-skill',
        score: 50,
        level: 'Medium',
        issues: [
          {
            severity: 'Critical',
            category: 'ProcessExecution',
            description: 'Critical issue',
            file_path: 'critical.ts',
            line_number: 1,
          },
          {
            severity: 'Warning',
            category: 'Other',
            description: 'Warning issue',
            file_path: 'warning.ts',
          },
          {
            severity: 'Info',
            category: 'Other',
            description: 'Info issue',
          },
        ],
        recommendations: [],
        blocked: false,
        hard_trigger_issues: [],
        scanned_files: ['SKILL.md'],
      };
      render(<SecurityReportCard report={mockReport} />);

      const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
      fireEvent.click(header!);

      expect(screen.getByText('安全问题详情 (3)')).toBeInTheDocument();
      expect(screen.getByText('Critical issue')).toBeInTheDocument();
      expect(screen.getByText('Warning issue')).toBeInTheDocument();
      expect(screen.getByText('Info issue')).toBeInTheDocument();

      // Check severity badges by text content
      expect(screen.getByText('严重')).toBeInTheDocument();
      expect(screen.getByText('警告')).toBeInTheDocument();
      expect(screen.getByText('信息')).toBeInTheDocument();
    });

    it('shows success alert when no issues', () => {
      const mockReport: SecurityReport = {
        skill_id: 'test-skill',
        score: 100,
        level: 'Safe',
        issues: [],
        recommendations: [],
        blocked: false,
        hard_trigger_issues: [],
        scanned_files: ['SKILL.md'],
      };
      render(<SecurityReportCard report={mockReport} />);

      const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
      fireEvent.click(header!);

      expect(screen.getByText('未发现明显安全风险，该 Skill 看起来是安全的！')).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('displays issue details with file path and line number', () => {
      const mockReport: SecurityReport = {
        skill_id: 'test-skill',
        score: 60,
        level: 'Medium',
        issues: [
          {
            severity: 'Error',
            category: 'DangerousFunction',
            description: 'Error in code',
            file_path: 'src/test.ts',
            line_number: 42,
            code_snippet: 'const dangerous = eval(code);',
          },
        ],
        recommendations: [],
        blocked: false,
        hard_trigger_issues: [],
        scanned_files: ['src/test.ts'],
      };
      render(<SecurityReportCard report={mockReport} />);

      const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
      fireEvent.click(header!);

      expect(screen.getByText('📄 src/test.ts:42')).toBeInTheDocument();
      expect(screen.getByText(/const dangerous = eval/)).toBeInTheDocument();
    });
  });
});
