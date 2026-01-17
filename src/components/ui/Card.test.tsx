import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardTitle, CardContent } from './Card';

describe('Card', () => {
    it('renders correctly', () => {
        render(
            <Card>
                <CardTitle>Title</CardTitle>
                <CardContent>Content</CardContent>
            </Card>
        );
        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Content')).toBeInTheDocument();
    });
});
