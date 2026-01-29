import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { SortOption } from '../components/SortDropdown';

// Define types here to avoid circular dependencies or import issues
export type FilterType = 'all' | 'top-rated' | 'productivity' | 'coding' | 'security' | 'data' | 'design';
export type SecurityFilter = 'all' | 'safe' | 'risk' | 'unknown';
export type SourceFilter = 'all' | 'official' | 'featured' | 'user';
export type CompatibilityFilter = 'all' | 'claude' | 'cursor'; // Simplified for now

interface MarketplaceContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filter: FilterType;
  setFilter: (filter: FilterType) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  securityFilter: SecurityFilter;
  setSecurityFilter: (filter: SecurityFilter) => void;
  compatibilityFilter: CompatibilityFilter;
  setCompatibilityFilter: (filter: CompatibilityFilter) => void;
  sourceFilter: SourceFilter;
  setSourceFilter: (filter: SourceFilter) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortOption, setSortOption] = useState<SortOption>('stars');
  const [securityFilter, setSecurityFilter] = useState<SecurityFilter>('all');
  const [compatibilityFilter, setCompatibilityFilter] = useState<CompatibilityFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [showFilters, setShowFilters] = useState(false);

  const value = {
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
  };

  return (
    <MarketplaceContext.Provider value={value}>
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplaceContext = () => {
  const context = useContext(MarketplaceContext);
  if (context === undefined) {
    throw new Error('useMarketplaceContext must be used within a MarketplaceProvider');
  }
  return context;
};
