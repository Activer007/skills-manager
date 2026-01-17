import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SkillCard } from './SkillCard';
import { MarketplaceSkill, InstalledSkill } from '../types';

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


const mockInstalledSkill: InstalledSkill = {
    id: '1',
    name: 'Installed Skill',
    author: 'Test Author',
    description: 'Installed Description',
    version: '1.0.0',
    localPath: '/path/to/skill',
    type: 'system'
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

    // Edge case: Long skill names
    it('handles long skill names with ellipsis in grid mode', () => {
        const longNameSkill = {
            ...mockSkill,
            name: 'A'.repeat(100)
        };
        render(<SkillCard skill={longNameSkill} viewMode="grid" />);
        // Use more specific query to target the h3 title element
        const titleElement = screen.getByRole('heading', { level: 3 });
        expect(titleElement).toHaveClass('line-clamp-1');
        expect(titleElement).toHaveTextContent('A'.repeat(100));
    });

    // Edge case: Long descriptions
    it('handles long descriptions with ellipsis in grid mode', () => {
        const longDescSkill = {
            ...mockSkill,
            description: 'Lorem ipsum dolor sit amet, '.repeat(20)
        };
        render(<SkillCard skill={longDescSkill} viewMode="grid" />);
        const descElement = screen.getByText(/Lorem ipsum/);
        expect(descElement).toHaveClass('line-clamp-2');
    });

    // Edge case: Missing author
    it('displays "Unknown" when author is missing', () => {
        const noAuthorSkill = {
            ...mockSkill,
            author: ''
        };
        render(<SkillCard skill={noAuthorSkill} viewMode="grid" />);
        expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    // Edge case: Missing author in list mode
    it('displays "Unknown Author" in list mode when author is missing', () => {
        const noAuthorSkill = {
            ...mockSkill,
            author: ''
        };
        render(<SkillCard skill={noAuthorSkill} viewMode="list" />);
        expect(screen.getByText('Unknown Author')).toBeInTheDocument();
    });

    // Async operation: Loading state
    it('shows loading state during installation', async () => {
        const handleInstall = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
        render(<SkillCard skill={mockSkill} viewMode="grid" onInstall={handleInstall} />);

        const installButton = screen.getByRole('button', { name: /get/i });
        fireEvent.click(installButton);

        // Button should be disabled during loading
        expect(installButton).toBeDisabled();

        // Wait for installation to complete
        await waitFor(() => {
            expect(handleInstall).toHaveBeenCalled();
        });
    });

    // Installed skill rendering
    it('renders installed skill with "Open" button in grid mode', () => {
        render(<SkillCard skill={mockInstalledSkill} viewMode="grid" isInstalled={true} />);
        expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
    });

    // Active/Inactive badge in list mode
    it('shows "Active" badge when skill is installed and active', () => {
        render(<SkillCard skill={mockInstalledSkill} viewMode="list" isInstalled={true} isActive={true} />);
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows "Disabled" badge when skill is installed but inactive', () => {
        render(<SkillCard skill={mockInstalledSkill} viewMode="list" isInstalled={true} isActive={false} />);
        expect(screen.getByText('Disabled')).toBeInTheDocument();
    });

    // Version badge display
    it('displays version badge for installed skills in list mode', () => {
        render(<SkillCard skill={mockInstalledSkill} viewMode="list" isInstalled={true} />);
        expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    // Marketplace-specific elements
    it('displays star count for marketplace skills in grid mode', () => {
        render(<SkillCard skill={mockSkill} viewMode="grid" />);
        expect(screen.getByText('10')).toBeInTheDocument(); // Star count
    });

    it('displays star and fork counts for marketplace skills in list mode', () => {
        render(<SkillCard skill={mockSkill} viewMode="list" />);
        expect(screen.getByText('10')).toBeInTheDocument(); // Stars
        expect(screen.getByText('5')).toBeInTheDocument(); // Forks
    });

    // Click handling
    it('calls onViewDetails when card is clicked in grid mode', () => {
        const handleViewDetails = vi.fn();
        render(<SkillCard skill={mockSkill} viewMode="grid" onViewDetails={handleViewDetails} />);

        fireEvent.click(screen.getByText('Test Skill'));
        expect(handleViewDetails).toHaveBeenCalled();
    });

    it('stops propagation when action buttons are clicked', () => {
        const handleViewDetails = vi.fn();
        const handleInstall = vi.fn();
        render(<SkillCard skill={mockSkill} viewMode="grid" onViewDetails={handleViewDetails} onInstall={handleInstall} />);

        fireEvent.click(screen.getByRole('button', { name: /get/i }));

        expect(handleInstall).toHaveBeenCalled();
        expect(handleViewDetails).not.toHaveBeenCalled(); // Should not bubble up
    });
});
