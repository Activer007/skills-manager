import { vi } from 'vitest';

// Mock react-router-dom at module level
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'default' }),
  useParams: () => ({}),
  MemoryRouter: ({ children }: any) => children,
}));
