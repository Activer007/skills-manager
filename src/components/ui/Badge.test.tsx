import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
    it('renders correctly', () => {
        render(<Badge>New</Badge>);
        expect(screen.getByText('New')).toBeInTheDocument();
        expect(screen.getByText('New')).toHaveClass('badge');
    });

    it('applies variant classes', () => {
        render(<Badge variant="primary">Primary</Badge>);
        expect(screen.getByText('Primary')).toHaveClass('badge-primary');
    });
});
