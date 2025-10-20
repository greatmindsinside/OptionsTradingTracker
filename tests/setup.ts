import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Global test setup
beforeEach(() => {
  // Reset any global state before each test
  vi.clearAllMocks();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock URL.createObjectURL for file handling
Object.defineProperty(window.URL, 'createObjectURL', {
  value: vi.fn(() => 'mocked-object-url'),
  writable: true,
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  value: vi.fn(),
  writable: true,
});

// Make localStorage available globally in tests
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
