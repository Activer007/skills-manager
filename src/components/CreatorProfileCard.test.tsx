import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreatorProfileCard } from './CreatorProfileCard';
import type { Creator } from '../types/creator';

// Mock translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockCreator: Creator = {
  id: 'creator-1',
  name: 'Test Creator',
  bio: 'A test bio',
  avatar_url: 'https://example.com/avatar.jpg',
  github_url: 'https://github.com/test',
  website_url: 'https://test.com',
  skill_count: 10,
  verified: true,
  created_at: Date.now(),
  updated_at: Date.now(),
  is_followed: false,
};

describe('CreatorProfileCard', () => {
  it('renders creator information correctly', () => {
    render(<CreatorProfileCard creator={mockCreator} />);

    expect(screen.getByText('Test Creator')).toBeInTheDocument();
    expect(screen.getByText('A test bio')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('shows verified badge when creator is verified', () => {
    const { container } = render(<CreatorProfileCard creator={mockCreator} />);
    // Check for the verified icon container (blue bg)
    expect(container.querySelector('.bg-blue-500')).toBeInTheDocument();
  });

  it('renders follow button when not followed', () => {
    render(<CreatorProfileCard creator={mockCreator} />);
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  it('renders following/unfollow button when followed', () => {
    const followedCreator = { ...mockCreator, is_followed: true };
    render(<CreatorProfileCard creator={followedCreator} />);
    expect(screen.getByText('Following')).toBeInTheDocument();
    expect(screen.getByText('Unfollow')).toBeInTheDocument();
  });

  it('calls onFollow when follow button is clicked', () => {
    const onFollow = vi.fn();
    render(<CreatorProfileCard creator={mockCreator} onFollow={onFollow} />);

    fireEvent.click(screen.getByText('Follow'));
    expect(onFollow).toHaveBeenCalled();
  });

  it('calls onUnfollow when unfollow button is clicked', () => {
    const onUnfollow = vi.fn();
    const followedCreator = { ...mockCreator, is_followed: true };
    render(<CreatorProfileCard creator={followedCreator} onUnfollow={onUnfollow} />);

    fireEvent.click(screen.getByText('Following')); // The button contains both texts, click targets the button
    expect(onUnfollow).toHaveBeenCalled();
  });

  it('renders edit button when onEdit provided', () => {
    const onEdit = vi.fn();
    render(<CreatorProfileCard creator={mockCreator} onEdit={onEdit} />);

    expect(screen.getByText('Edit')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalled();
  });
});
