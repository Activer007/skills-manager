import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SkillCard } from './SkillCard';
import { MarketplaceSkill } from '../types';

const mockSkill: MarketplaceSkill = {
    id: '1',
    name: 'Test Skill',
    author: 'Test Author',
    description: 'Test Description',
    stars: 10,
    forks: 5,
    githubUrl: '',
    authorAvatar: '',
    updatedAt: 0,
    hasMarketplace: true,
    path: '',
    branch: ''
};

describe('SkillCard', () => {
    it('renders in grid mode correctly', () => {
        render(<SkillCard skill={mockSkill} viewMode="grid" />);
        expect(screen.getByText('Test Skill')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /get/i })).toBeInTheDocument();
    });

    it('renders in list mode correctly', () => {
        render(<SkillCard skill={mockSkill} viewMode="list" />);
        expect(screen.getByText('Test Skill')).toBeInTheDocument();
        // Check for install button
        expect(screen.getByRole('button', { name: /install/i })).toBeInTheDocument();
    });

    it('calls onInstall when clicked', async () => {
        const handleInstall = vi.fn();
        render(<SkillCard skill={mockSkill} viewMode="grid" onInstall={handleInstall} />);
        
        fireEvent.click(screen.getByRole('button', { name: /get/i }));
        expect(handleInstall).toHaveBeenCalled();
    });
});
