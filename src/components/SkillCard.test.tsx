import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { SkillCard } from './SkillCard';
import type { MarketplaceSkill, InstalledSkill } from '../types';

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
    type: 'system',
    installDate: Date.now(),
    status: 'safe',
    securityScore: 85
};

const mockHighSecuritySkill: InstalledSkill = {
    ...mockInstalledSkill,
    id: '2',
    name: 'High Security Skill',
    securityScore: 95
};

const mockWarningSkill: InstalledSkill = {
    ...mockInstalledSkill,
    id: '3',
    name: 'Warning Skill',
    securityScore: 60
};

const mockCriticalSkill: InstalledSkill = {
    ...mockInstalledSkill,
    id: '4',
    name: 'Critical Skill',
    securityScore: 40
};
describe('SkillCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders in grid mode correctly', () => {
        render(<SkillCard skill={mockSkill} viewMode="grid" />);
        expect(screen.getByText('Test Skill')).toBeInTheDocument();
        expect(screen.getByText('Test Description')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /get/i })).toBeInTheDocument();
    });

    it('renders in list mode correctly', () => {
        render(<SkillCard skill={mockSkill} viewMode="list" onInstall={vi.fn()} />);
        expect(screen.getByText('Test Skill')).toBeInTheDocument();
        // Check for install button using testid
        expect(screen.getByTestId('install-button')).toBeInTheDocument();
    });

    it('calls onInstall when clicked', async () => {
        const handleInstall = vi.fn().mockResolvedValue(undefined);
        render(<SkillCard skill={mockSkill} viewMode="grid" onInstall={handleInstall} />);

        fireEvent.click(screen.getByRole('button', { name: /get/i }));

        await waitFor(() => {
            expect(handleInstall).toHaveBeenCalled();
        });
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
        const handleInstall = vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 100)));
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

    it('stops propagation when action buttons are clicked', async () => {
        const handleViewDetails = vi.fn();
        const handleInstall = vi.fn().mockResolvedValue(undefined);
        render(<SkillCard skill={mockSkill} viewMode="grid" onViewDetails={handleViewDetails} onInstall={handleInstall} />);

        fireEvent.click(screen.getByRole('button', { name: /get/i }));

        await waitFor(() => {
            expect(handleInstall).toHaveBeenCalled();
        });
        expect(handleViewDetails).not.toHaveBeenCalled(); // Should not bubble up
    });

    it('calls onToggle when switch is clicked in list mode', async () => {
        const handleToggle = vi.fn().mockResolvedValue(undefined);
        render(<SkillCard skill={mockInstalledSkill} viewMode="list" isInstalled={true} onToggle={handleToggle} />);

        const switchElement = screen.getByRole('switch');
        fireEvent.click(switchElement);

        await waitFor(() => {
            expect(handleToggle).toHaveBeenCalled();
        });
    });

    // TrustShield integration tests
    describe('TrustShield integration', () => {
        it('displays TrustShield with safe level for high security score in grid mode', () => {
            const { container } = render(<SkillCard skill={mockInstalledSkill} viewMode="grid" isInstalled={true} />);
            // Should display TrustShield (security score 85 = safe level)
            expect(container.querySelector('.text-emerald-500')).toBeInTheDocument();
        });

        it('displays TrustShield with verified level for very high security score in list mode', () => {
            render(<SkillCard skill={mockHighSecuritySkill} viewMode="list" isInstalled={true} />);
            // Should show "Safe" or "Verified" text
            expect(screen.getByText(/Verified/i)).toBeInTheDocument();
        });

        it('displays TrustShield with warning level for medium security score', () => {
            const { container } = render(<SkillCard skill={mockWarningSkill} viewMode="list" isInstalled={true} />);
            // Check for amber color which indicates warning level
            expect(container.querySelector('.text-amber-500')).toBeInTheDocument();
            // Check the score is displayed
            expect(screen.getByText(/60/)).toBeInTheDocument();
        });

        it('displays TrustShield with critical level for low security score', () => {
            const { container } = render(<SkillCard skill={mockCriticalSkill} viewMode="list" isInstalled={true} />);
            // Check for red color which indicates critical level
            expect(container.querySelector('.text-red-500')).toBeInTheDocument();
            // Check the score is displayed
            expect(screen.getByText(/40/)).toBeInTheDocument();
        });

        it('does not display TrustShield for non-installed skills', () => {
            const { container } = render(<SkillCard skill={mockSkill} viewMode="grid" />);
            // Should not have any security shield classes
            expect(container.querySelector('.text-emerald-500')).not.toBeInTheDocument();
            expect(container.querySelector('.text-blue-500')).not.toBeInTheDocument();
            expect(container.querySelector('.text-amber-500')).not.toBeInTheDocument();
            expect(container.querySelector('.text-red-500')).not.toBeInTheDocument();
        });

        it('hides label in grid mode (showLabel=false)', () => {
            const { container } = render(<SkillCard skill={mockInstalledSkill} viewMode="grid" isInstalled={true} />);
            // Grid mode should show TrustShield without label (icon only)
            // Check that the shield icon exists
            expect(container.querySelector('svg')).toBeInTheDocument();
            // The text label should not be visible in grid mode
            const safeLabel = screen.queryByText(/^Safe$/);
            expect(safeLabel).not.toBeInTheDocument();
        });

        it('shows label and score in list mode (showLabel=true)', () => {
            render(<SkillCard skill={mockInstalledSkill} viewMode="list" isInstalled={true} />);
            // List mode should show TrustShield with label and score
            expect(screen.getByText(/Safe/i)).toBeInTheDocument();
            expect(screen.getByText(/85/)).toBeInTheDocument();
        });

        it('handles skill without security score', () => {
            const skillWithoutScore: InstalledSkill = {
                ...mockInstalledSkill,
                securityScore: undefined
            };
            const { container } = render(<SkillCard skill={skillWithoutScore} viewMode="list" isInstalled={true} />);
            // 没有 securityScore 时不应该显示 TrustShield
            expect(container.querySelector('[role="status"]')).not.toBeInTheDocument();
        });
    });
});
