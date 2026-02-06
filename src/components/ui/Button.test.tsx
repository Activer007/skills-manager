import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
    it('renders correctly', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('renders loading state', () => {
        render(<Button isLoading>Loading</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('applies variant classes', () => {
        render(<Button variant="secondary">Secondary</Button>);
        const button = screen.getByRole('button');
        expect(button.className).toContain('btn-neutral');
    });

    // Size variants
    it('applies size classes correctly', () => {
        const { rerender } = render(<Button size="sm">Small</Button>);
        expect(screen.getByRole('button').className).toContain('btn-sm');

        rerender(<Button size="lg">Large</Button>);
        expect(screen.getByRole('button').className).toContain('btn-lg');

        rerender(<Button size="xs">Extra Small</Button>);
        expect(screen.getByRole('button').className).toContain('btn-xs');
    });

    // All variant types
    it('applies all variant classes correctly', () => {
        const variants = ['primary', 'secondary', 'outline', 'ghost', 'error', 'link'] as const;
        const expectedClasses = ['btn-primary', 'btn-neutral', 'btn-outline', 'btn-ghost', 'btn-error', 'btn-link'];

        variants.forEach((variant, index) => {
            const { unmount } = render(<Button variant={variant}>{variant}</Button>);
            expect(screen.getByRole('button').className).toContain(expectedClasses[index]);
            unmount();
        });
    });

    // Disabled state
    it('is disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when isLoading is true', () => {
        render(<Button isLoading>Loading</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    // Click handling
    it('calls onClick handler when clicked', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click me</Button>);

        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not call onClick when disabled', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick} disabled>Disabled</Button>);

        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('does not call onClick when loading', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick} isLoading>Loading</Button>);

        fireEvent.click(screen.getByRole('button'));
        expect(handleClick).not.toHaveBeenCalled();
    });

    // Loading spinner
    it('displays loading spinner when isLoading is true', () => {
        render(<Button isLoading>Loading</Button>);
        const button = screen.getByRole('button');
        // Check for Loader2 icon (spinner)
        const svg = button.querySelector('svg');
        expect(svg).toBeInTheDocument();
        expect(svg).toHaveClass('animate-spin');
    });

    it('hides content text during loading but still shows it', () => {
        render(<Button isLoading>Submit</Button>);
        // Text should still be present
        expect(screen.getByText('Submit')).toBeInTheDocument();
    });

    // Async operation simulation
    it('handles async click operations', async () => {
        const asyncClick = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
        render(<Button onClick={asyncClick}>Async Button</Button>);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(asyncClick).toHaveBeenCalled();
        });
    });

    // Custom className
    it('merges custom className with default classes', () => {
        render(<Button className="custom-class">Custom</Button>);
        const button = screen.getByRole('button');
        expect(button.className).toContain('custom-class');
        expect(button.className).toContain('btn');
    });

    // Children rendering
    it('renders children correctly', () => {
        render(
            <Button>
                <span>Icon</span>
                <span>Text</span>
            </Button>
        );
        expect(screen.getByText('Icon')).toBeInTheDocument();
        expect(screen.getByText('Text')).toBeInTheDocument();
    });

    // Edge case: Empty button
    it('renders empty button without crashing', () => {
        render(<Button />);
        expect(screen.getByRole('button')).toBeInTheDocument();
    });

    // ========================================
    // Design System v2.0 增强功能测试
    // ========================================
    describe('Design System v2.0 Enhancements', () => {
        it('应该应用渐变效果到 primary 按钮', () => {
            render(<Button variant="primary">Primary Button</Button>);
            const button = screen.getByRole('button');
            expect(button.className).toContain('btn-primary-gradient');
            expect(button.className).toContain('btn-enhanced');
        });

        it('应该应用光效动画类', () => {
            render(<Button variant="primary">Shine Effect</Button>);
            const button = screen.getByRole('button');
            expect(button.className).toContain('btn-shine');
        });

        it('应该应用毛玻璃效果到 ghost 按钮', () => {
            render(<Button variant="ghost">Ghost Button</Button>);
            const button = screen.getByRole('button');
            expect(button.className).toContain('glass-effect');
        });

        it('应该应用渐变边框到 outline 按钮', () => {
            render(<Button variant="outline">Outline Button</Button>);
            const button = screen.getByRole('button');
            expect(button.className).toContain('border-gradient');
        });

        it('应该应用错误渐变到 error 按钮', () => {
            render(<Button variant="error">Error Button</Button>);
            const button = screen.getByRole('button');
            expect(button.className).toContain('btn-enhanced');
            expect(button.className).toContain('from-red-500');
            expect(button.className).toContain('to-red-600');
        });

        it('应该应用增强阴影类', () => {
            render(<Button variant="primary" className="shadow-lg">Enhanced Shadow</Button>);
            const button = screen.getByRole('button');
            expect(button.className).toContain('shadow-lg');
        });

        it('应该支持所有 v2.0 动画过渡', () => {
            render(<Button variant="primary">Animated</Button>);
            const button = screen.getByRole('button');
            expect(button.className).toContain('transition-all');
            expect(button.className).toContain('duration-normal');
        });

        it('应该保持向后兼容性 - 次要按钮样式', () => {
            render(<Button variant="secondary">Secondary</Button>);
            const button = screen.getByRole('button');
            expect(button.className).toContain('btn-neutral');
            expect(button.className).toContain('transition-all');
        });

        it('应该保持向后兼容性 - 链接按钮样式', () => {
            render(<Button variant="link">Link</Button>);
            const button = screen.getByRole('button');
            expect(button.className).toContain('btn-link');
            expect(button.className).toContain('duration-fast');
        });

        it('应该支持自定义类名与 v2.0 样式合并', () => {
            render(<Button variant="primary" className="custom-class">Custom</Button>);
            const button = screen.getByRole('button');
            expect(button.className).toContain('custom-class');
            expect(button.className).toContain('btn-primary-gradient');
            expect(button.className).toContain('btn-enhanced');
        });

        it('应该在禁用状态下保持 v2.0 样式', () => {
            render(<Button variant="primary" disabled>Disabled Primary</Button>);
            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
            expect(button.className).toContain('btn-primary-gradient');
            expect(button.className).toContain('disabled:opacity-70');
        });

        it('应该在加载状态下保持 v2.0 样式', () => {
            render(<Button variant="primary" isLoading>Loading Primary</Button>);
            const button = screen.getByRole('button');
            expect(button).toBeDisabled();
            expect(button.className).toContain('btn-primary-gradient');
            expect(button.className).toContain('btn-enhanced');
        });
    });
});
