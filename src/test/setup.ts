import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Import router mock first to ensure it's applied before any component imports
import './routerMock';

// Mock Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock ResizeObserver for Recharts
window.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

// Mock HTMLDialogElement for ShareSheet and Modal tests
if (typeof window !== 'undefined') {
  window.HTMLDialogElement.prototype.showModal = function() {
    this.setAttribute('open', '');
  };
  window.HTMLDialogElement.prototype.close = function() {
    this.removeAttribute('open');
  };
}
