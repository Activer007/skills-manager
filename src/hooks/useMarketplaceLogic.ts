import { useState, useMemo, useEffect } from 'react';
import { useMarketplaceSkills } from './useSkills';
import type { SecurityFilter, CompatibilityFilter } from '../components/FilterPanel';
import type { SortOption } from '../components/SortDropdown';
import { scoreToTrustLevel } from '../utils/securityHelpers';
import type { ListMarketplaceParams, SourceFilter } from '../types';

// Types and constants
export type FilterType = 'all' | 'top-rated' | 'productivity' | 'coding' | 'security' | 'data' | 'design';

const TOP_RATED_THRESHOLD = 50;

const CATEGORY_KEYWORDS: Record<Exclude<FilterType, 'all' | 'top-rated'>, string[]> = {
  coding: ['code', 'programming', 'dev', 'git', 'react', 'typescript', 'python', 'rust', 'api', 'debug', 'test'],
  security: ['security', 'scan', 'vuln', 'auth', 'token', 'audit', 'secret', 'password'],
  productivity: ['task', 'todo', 'manage', 'organize', 'time', 'workflow', 'automate', 'note'],
  data: ['data', 'sql', 'db', 'database', 'analytics', 'json', 'csv', 'chart', 'visualization'],
  design: ['design', 'ui', 'css', 'color', 'icon', 'figma', 'theme', 'style']
};

const GITHUB_URL_REGEX = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(\/tree\/[\w.-]+(\/.*)?)?$/;

export function useMarketplaceLogic() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('stars');
  const [securityFilter, setSecurityFilter] = useState<SecurityFilter>('all');
  const [compatibilityFilter, setCompatibilityFilter] = useState<CompatibilityFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search term to avoid excessive backend calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Construct query parameters for the backend
  const queryParams = useMemo<ListMarketplaceParams>(() => {
    const params: ListMarketplaceParams = { limit: 100 }; // Default limit to reduce memory usage

    if (debouncedSearchTerm) {
      params.searchQuery = debouncedSearchTerm;
    } else if (filter === 'top-rated') {
      params.minStars = TOP_RATED_THRESHOLD;
    }

    params.sourceType = sourceFilter;

    return params;
  }, [debouncedSearchTerm, filter, sourceFilter]);

  const {
    data: marketplaceSkills = [],
    isLoading: isLoadingMarketplace,
    isError: isMarketplaceError,
    error: marketplaceError,
    refetch: refetchMarketplace,
  } = useMarketplaceSkills(queryParams);

  const isGithubUrl = useMemo(() => {
    return GITHUB_URL_REGEX.test(searchTerm);
  }, [searchTerm]);

  const filteredAndSortedSkills = useMemo(() => {
    const result = marketplaceSkills.filter(skill => {
      // If we used backend search, the results are already filtered by the query.
      // However, we still perform a client-side check to ensure the UI is consistent
      // during the debounce delay or if the user refines the search locally.
      const name = skill.name ?? '';
      const description = skill.description ?? '';
      const author = skill.author ?? '';

      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        author.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // 1. Primary Filter (Category/Top Rated)
      if (filter === 'top-rated') {
        if (skill.stars <= TOP_RATED_THRESHOLD) return false;
      } else if (filter !== 'all') {
        const keywords = CATEGORY_KEYWORDS[filter as keyof typeof CATEGORY_KEYWORDS];
        const textToCheck = `${name} ${description} ${skill.tags?.join(' ') || ''}`.toLowerCase();
        if (!keywords.some(k => textToCheck.includes(k))) return false;
      }

      // 2. Security Filter
      if (securityFilter !== 'all') {
        const trustLevel = scoreToTrustLevel(skill.securityScore);
        if (securityFilter === 'safe') {
          if (trustLevel !== 'safe' && trustLevel !== 'verified') return false;
        } else if (securityFilter === 'risk') {
          if (trustLevel !== 'warning' && trustLevel !== 'critical') return false;
        } else if (securityFilter === 'unknown') {
          if (trustLevel !== 'unknown') return false;
        }
      }

      // 3. Compatibility Filter
      if (compatibilityFilter !== 'all') {
        // If compatibility info is missing, assume unknown/incompatible for now, or check generic tags
        // For now, check explicit compatibility field
        const supported = skill.compatibility?.supportedAgents?.includes(compatibilityFilter);

        // Fallback: Check tags for the agent name
        const hasTag = skill.tags?.some(t => t.toLowerCase() === compatibilityFilter.toLowerCase());

        if (!supported && !hasTag) return false;
      }

      return true;
    });

    // 4. Sorting
    return result.sort((a, b) => {
      switch (sortOption) {
        case 'stars':
          return b.stars - a.stars;
        case 'updated':
          return (b.updatedAt || 0) - (a.updatedAt || 0);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });
  }, [marketplaceSkills, searchTerm, filter, securityFilter, compatibilityFilter, sortOption]);

  return {
    marketplaceSkills,
    isLoadingMarketplace,
    isMarketplaceError,
    marketplaceError,
    refetchMarketplace,
    searchTerm,
    setSearchTerm,
    filter,
    setFilter,
    sortOption,
    setSortOption,
    securityFilter,
    setSecurityFilter,
    compatibilityFilter,
    setCompatibilityFilter,
    sourceFilter,
    setSourceFilter,
    showFilters,
    setShowFilters,
    isGithubUrl,
    filteredAndSortedSkills
  };
}
