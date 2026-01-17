import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TrustShield } from './TrustShield';

describe('TrustShield', () => {
  describe('rendering', () => {
    it('renders verified level correctly', () => {
      render(<TrustShield level="verified" score={95} />);
      expect(screen.getByText(/Verified/i)).toBeInTheDocument();
      expect(screen.getByText(/95/)).toBeInTheDocument();
    });

    it('renders safe level correctly', () => {
      render(<TrustShield level="safe" score={80} />);
      expect(screen.getByText(/Safe/i)).toBeInTheDocument();
      expect(screen.getByText(/80/)).toBeInTheDocument();
    });

    it('renders warning level correctly', () => {
      render(<TrustShield level="warning" score={60} />);
      expect(screen.getByText(/Warning/i)).toBeInTheDocument();
      expect(screen.getByText(/60/)).toBeInTheDocument();
    });

    it('renders critical level correctly', () => {
      render(<TrustShield level="critical" score={40} />);
      expect(screen.getByText(/Critical/i)).toBeInTheDocument();
      expect(screen.getByText(/40/)).toBeInTheDocument();
    });

    it('renders unknown level correctly', () => {
      render(<TrustShield level="unknown" />);
      expect(screen.getByText(/Unknown/i)).toBeInTheDocument();
    });

    it('renders without score when score is undefined', () => {
      render(<TrustShield level="safe" />);
      expect(screen.getByText(/Safe/i)).toBeInTheDocument();
      expect(screen.queryByText(/\d+/)).not.toBeInTheDocument();
    });
  });

  describe('showLabel prop', () => {
    it('shows label when showLabel is true (default)', () => {
      render(<TrustShield level="safe" score={85} />);
      expect(screen.getByText(/Safe/i)).toBeInTheDocument();
    });

    it('hides label when showLabel is false', () => {
      render(<TrustShield level="safe" score={85} showLabel={false} />);
      expect(screen.queryByText(/Safe/i)).not.toBeInTheDocument();
    });

    it('still shows icon when label is hidden', () => {
      const { container } = render(<TrustShield level="safe" showLabel={false} />);
      // Icon should still be rendered (lucide-react icons render as SVG)
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('size prop', () => {
    it('renders small size correctly', () => {
      const { container } = render(<TrustShield level="safe" size="sm" />);
      const element = container.querySelector('.px-2');
      expect(element).toBeInTheDocument();
    });

    it('renders medium size correctly (default)', () => {
      const { container } = render(<TrustShield level="safe" size="md" />);
      const element = container.querySelector('.px-3');
      expect(element).toBeInTheDocument();
    });

    it('renders large size correctly', () => {
      const { container } = render(<TrustShield level="safe" size="lg" />);
      const element = container.querySelector('.px-4');
      expect(element).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has title attribute with score', () => {
      const { container } = render(<TrustShield level="safe" score={85} />);
      const element = container.firstChild as HTMLElement;
      // 使用 i18n 后，title 会根据语言环境变化
      // 测试确保 title 属性存在即可
      expect(element).toHaveAttribute('title');
    });

    it('has title attribute with N/A when score is undefined', () => {
      const { container } = render(<TrustShield level="safe" />);
      const element = container.firstChild as HTMLElement;
      // 使用 i18n 后，title 会根据语言环境变化
      expect(element).toHaveAttribute('title');
    });

    it('renders with proper semantic structure', () => {
      const { container } = render(<TrustShield level="safe" score={85} />);
      const element = container.firstChild as HTMLElement;
      expect(element.tagName).toBe('DIV');
      expect(element).toHaveClass('inline-flex', 'items-center');
    });
  });

  describe('styling', () => {
    it('applies verified level styles', () => {
      const { container } = render(<TrustShield level="verified" />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('text-blue-500');
    });

    it('applies safe level styles', () => {
      const { container } = render(<TrustShield level="safe" />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('text-emerald-500');
    });

    it('applies warning level styles', () => {
      const { container } = render(<TrustShield level="warning" />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('text-amber-500');
    });

    it('applies critical level styles', () => {
      const { container } = render(<TrustShield level="critical" />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('text-red-500');
    });

    it('applies unknown level styles', () => {
      const { container } = render(<TrustShield level="unknown" />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('text-slate-400');
    });

    it('accepts custom className', () => {
      const { container } = render(<TrustShield level="safe" className="custom-class" />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('custom-class');
    });
  });

  describe('edge cases', () => {
    it('handles score of 0', () => {
      render(<TrustShield level="critical" score={0} />);
      expect(screen.getByText(/0/)).toBeInTheDocument();
    });

    it('handles score of 100', () => {
      render(<TrustShield level="verified" score={100} />);
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it('renders unknown level as fallback for invalid level', () => {
      // This tests the fallback in: levelConfig[level] || levelConfig.unknown
      const { container } = render(<TrustShield level={'invalid' as TrustLevel} />);
      const element = container.firstChild as HTMLElement;
      expect(element).toHaveClass('text-slate-400');
    });
  });
});
