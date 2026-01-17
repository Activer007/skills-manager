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
});
