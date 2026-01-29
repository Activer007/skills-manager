import { useState, useMemo, useEffect } from 'react';
import { useMarketplaceSkills } from './useSkills';
import type { SecurityFilter, CompatibilityFilter } from '../components/FilterPanel';
import type { SortOption } from '../components/SortDropdown';
import { scoreToTrustLevel } from '../utils/securityHelpers';
import type { ListMarketplaceParams, SourceFilter } from '../types';
import { useMarketplaceContext, type FilterType } from '../context/MarketplaceContext';

// Types and constants
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
  const {
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
    setShowFilters
  } = useMarketplaceContext();

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

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

    // Map 'official' to 'featured' for backend compatibility
    // Frontend uses 'official' for UI semantics, backend only accepts 'featured'
    if (sourceFilter !== 'all') {
      const backendSourceType = sourceFilter === 'official' ? 'featured' : sourceFilter;
      params.sourceType = backendSourceType;
      // 开发模式下输出调试信息
      if (import.meta.env.DEV) {
        console.debug(`[Marketplace] Filtering by sourceType: ${sourceFilter} -> ${backendSourceType}`);
      }
    }

    return params;
  }, [debouncedSearchTerm, filter, sourceFilter]);

  const {
    data: marketplaceSkills = [],
    isLoading: isLoadingMarketplace,
    isError: isMarketplaceError,
    error: marketplaceError,
    refetch: refetchMarketplace,
  } = useMarketplaceSkills(queryParams);

  // 监控 API 错误（已修复：'official' 现在映射到 'featured'）
  useEffect(() => {
    if (isMarketplaceError && sourceFilter === 'official') {
      console.warn(
        '[Marketplace] API error when filtering by sourceType="official" (mapped to "featured").',
        marketplaceError
      );
    }
  }, [isMarketplaceError, sourceFilter, marketplaceError]);

  const isGithubUrl = useMemo(() => {
    return GITHUB_URL_REGEX.test(searchTerm);
  }, [searchTerm]);

  const filteredAndSortedSkills = useMemo(() => {
    const result = marketplaceSkills.filter(skill => {
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
        const supported = skill.compatibility?.supportedAgents?.includes(compatibilityFilter);
        const hasTag = skill.tags?.some(t => t.toLowerCase() === compatibilityFilter.toLowerCase());
        if (!supported && !hasTag) return false;
      }

      // 4. Source Filter
      if (sourceFilter !== 'all') {
        if (!skill.sourceType) {
          console.debug(`Skill "${skill.name}" missing sourceType, excluding from filter`);
          return false;
        }
        // Map 'official' filter to 'featured' sourceType for backend compatibility
        const expectedSourceType = sourceFilter === 'official' ? 'featured' : sourceFilter;
        if (skill.sourceType !== expectedSourceType) return false;
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
