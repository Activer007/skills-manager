import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SuggestionList } from './SuggestionList';

describe('SuggestionList', () => {
  it('renders success message when no suggestions', () => {
    render(<SuggestionList suggestions={[]} />);
    expect(screen.getByText(/Great job/i)).toBeInTheDocument();
  });

  it('renders suggestions list', () => {
    const suggestions = ['Fix typo', 'Add docs'];
    render(<SuggestionList suggestions={suggestions} />);
    expect(screen.getByText('Fix typo')).toBeInTheDocument();
    expect(screen.getByText('Add docs')).toBeInTheDocument();
  });

  it('renders points badge when suggestion has points', () => {
    const suggestions = ['Add example (+5 pts)'];
    render(<SuggestionList suggestions={suggestions} />);
    expect(screen.getByText('Add example')).toBeInTheDocument();
    expect(screen.getByText('+5 pts')).toBeInTheDocument();
  });
});
