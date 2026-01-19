// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useTranslation } from 'react-i18next';
import React from 'react';
import SecurityReportCard from '../../components/SecurityReportCard';
import type { SecurityReport } from '../../types/security';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

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

const mockSafeReport: SecurityReport = {
  skill_id: 'test-skill',
  score: 95,
  level: 'Safe',
  issues: [],
  recommendations: [],
  blocked: false,
  hard_trigger_issues: [],
  scanned_files: ['SKILL.md'],
};

const mockRiskyReport: SecurityReport = {
  skill_id: 'test-skill',
  score: 55,
  level: 'Medium',
  issues: [
    {
      severity: 'Warning',
      description: 'Potential security risk detected',
      file_path: 'src/index.ts',
      line_number: 42,
      code_snippet: 'eval(userInput)',
    },
    {
      severity: 'Info',
      description: 'Missing input validation',
      file_path: 'src/handler.ts',
    },
  ],
  recommendations: [
    'Add input validation for all user inputs',
    'Replace eval() with safer alternatives',
    'Implement rate limiting',
  ],
  blocked: false,
  hard_trigger_issues: [],
  scanned_files: ['SKILL.md', 'src/index.ts', 'src/handler.ts'],
};

const mockBlockedReport: SecurityReport = {
  skill_id: 'test-skill',
  score: 10,
  level: 'Critical',
  issues: [
    {
      severity: 'Critical',
      description: 'Dangerous code execution',
      file_path: 'src/malicious.ts',
      line_number: 1,
      code_snippet: 'child_process.execSync maliciousCommand',
    },
  ],
  recommendations: [],
  blocked: true,
  hard_trigger_issues: [
    'Detected direct code execution',
    'Found dangerous API usage',
  ],
  scanned_files: ['src/malicious.ts'],
};

describe('Security Scan Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('complete flow: scan → report → display', async () => {
    // Simulate security scan
    vi.mocked(invoke).mockResolvedValue(mockRiskyReport);

    const TestComponent = () => {
      const [report, setReport] = React.useState<SecurityReport | null>(null);
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        invoke('scan_skill_security', { skillPath: '/test/path', locale: 'en' })
          .then((data) => {
            setReport(data as SecurityReport);
            setLoading(false);
          });
      }, []);

      return (
        <div>
          <h1>Security Scan</h1>
          <SecurityReportCard report={report} loading={loading} />
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    // Initially loading
    expect(screen.getByText('正在执行安全扫描...')).toBeInTheDocument();

    // After scan completes
    await waitFor(() => {
      expect(screen.getByText('安全扫描报告')).toBeInTheDocument();
    });

    // Check score and level
    expect(screen.getByText('55 / 100')).toBeInTheDocument();
    expect(screen.getByText('中等风险')).toBeInTheDocument();
  });

  it('shows blocked warning', async () => {
    vi.mocked(invoke).mockResolvedValue(mockBlockedReport);

    const TestComponent = () => {
      const [report, setReport] = React.useState<SecurityReport | null>(null);

      React.useEffect(() => {
        invoke('scan_skill_security', { skillPath: '/test/path', locale: 'en' })
          .then((data) => setReport(data as SecurityReport));
      }, []);

      return (
        <div>
          <SecurityReportCard report={report} loading={false} />
        </div>
      );
    };

    render(<TestComponent />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('安全扫描报告')).toBeInTheDocument();
    });

    // Expand to see blocked warning
    const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
    fireEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText('检测到严重安全风险，已阻止安装！')).toBeInTheDocument();
      expect(screen.getByText('Detected direct code execution')).toBeInTheDocument();
      expect(screen.getByText('Found dangerous API usage')).toBeInTheDocument();
    });
  });

  it('displays issues with badges', async () => {
    const TestComponent = () => {
      return <SecurityReportCard report={mockRiskyReport} loading={false} />;
    };

    render(<TestComponent />, { wrapper });

    // Expand the card
    const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
    fireEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText('安全问题详情 (2)')).toBeInTheDocument();
    });

    // Expand issues details
    const issuesCheckbox = screen.getByRole('checkbox', { hidden: true });
    fireEvent.click(issuesCheckbox);

    await waitFor(() => {
      expect(screen.getByText('Potential security risk detected')).toBeInTheDocument();
      expect(screen.getByText('Missing input validation')).toBeInTheDocument();
      expect(screen.getByText('警告')).toBeInTheDocument();
      expect(screen.getByText('信息')).toBeInTheDocument();
    });
  });

  it('shows recommendations', async () => {
    const TestComponent = () => {
      return <SecurityReportCard report={mockRiskyReport} loading={false} />;
    };

    render(<TestComponent />, { wrapper });

    // Expand the card
    const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
    fireEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText('安全建议')).toBeInTheDocument();
      expect(screen.getByText('Add input validation for all user inputs')).toBeInTheDocument();
      expect(screen.getByText('Replace eval() with safer alternatives')).toBeInTheDocument();
      expect(screen.getByText('Implement rate limiting')).toBeInTheDocument();
    });
  });

  it('toggles expansion', async () => {
    const TestComponent = () => {
      return <SecurityReportCard report={mockRiskyReport} loading={false} />;
    };

    render(<TestComponent />, { wrapper });

    // Initially collapsed
    expect(screen.queryByText('安全建议')).not.toBeInTheDocument();

    // Click to expand
    const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
    fireEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText('安全建议')).toBeInTheDocument();
    });

    // Click to collapse
    fireEvent.click(header!);

    await waitFor(() => {
      expect(screen.queryByText('安全建议')).not.toBeInTheDocument();
    });
  });

  it('handles empty issues', async () => {
    const TestComponent = () => {
      return <SecurityReportCard report={mockSafeReport} loading={false} />;
    };

    render(<TestComponent />, { wrapper });

    // Expand the card
    const header = screen.getByText('安全扫描报告').closest('div')?.parentElement;
    fireEvent.click(header!);

    await waitFor(() => {
      expect(screen.getByText('未发现明显安全风险，该 Skill 看起来是安全的！')).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });
  });

  it('displays correct security levels', () => {
    const testCases: { report: SecurityReport; levelText: string; badgeClass: string }[] = [
      {
        report: { ...mockSafeReport, score: 95, level: 'Safe' },
        levelText: '安全',
        badgeClass: 'badge-success',
      },
      {
        report: { ...mockRiskyReport, score: 75, level: 'Low' },
        levelText: '低风险',
        badgeClass: 'badge-warning',
      },
      {
        report: { ...mockRiskyReport, score: 55, level: 'Medium' },
        levelText: '中等风险',
        badgeClass: 'badge-warning',
      },
      {
        report: { ...mockRiskyReport, score: 35, level: 'High' },
        levelText: '高风险',
        badgeClass: 'badge-error',
      },
      {
        report: { ...mockBlockedReport, score: 10, level: 'Critical' },
        levelText: '严重风险',
        badgeClass: 'badge-error',
      },
    ];

    testCases.forEach(({ report, levelText, badgeClass }) => {
      const TestComponent = () => {
        return <SecurityReportCard report={report} loading={false} />;
      };

      const { unmount } = render(<TestComponent />, { wrapper });

      expect(screen.getByText(levelText)).toBeInTheDocument();
      expect(screen.getByText(levelText)).toHaveClass(badgeClass);
      unmount();
    });
  });

  it('shows scanned files count', () => {
    const TestComponent = () => {
      return (
        <SecurityReportCard report={mockRiskyReport} loading={false} />
      );
    };

    render(<TestComponent />, { wrapper });

    expect(screen.getByText('3 个文件已扫描')).toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    const TestComponent = () => {
      const [loading, setLoading] = React.useState(true);

      React.useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
      }, []);

      return <SecurityReportCard report={null} loading={loading} />;
    };

    render(<TestComponent />, { wrapper });

    // Initially shows loading state
    expect(screen.getByText('正在执行安全扫描...')).toBeInTheDocument();
    expect(screen.queryByText('安全扫描报告')).not.toBeInTheDocument();
  });

  it('returns null when no report and not loading', () => {
    const TestComponent = () => {
      return (
        <div>
          <div data-testid="before">Before</div>
          <SecurityReportCard report={null} loading={false} />
          <div data-testid="after">After</div>
        </div>
      );
    };

    const { container } = render(<TestComponent />, { wrapper });

    expect(screen.getByTestId('before')).toBeInTheDocument();
    expect(screen.getByTestId('after')).toBeInTheDocument();
    // SecurityReportCard should render nothing
    expect(screen.queryByText('安全扫描报告')).not.toBeInTheDocument();
  });
});
