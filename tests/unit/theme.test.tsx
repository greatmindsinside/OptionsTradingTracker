import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ThemeProvider } from '../../src/contexts/ThemeContext';
import { useTheme } from '../../src/hooks/useTheme';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock matchMedia
const matchMediaMock = vi.fn();

// Test component to use the theme hook
const TestComponent = () => {
  const { theme, effectiveTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="effective-theme">{effectiveTheme}</div>
      <button data-testid="set-light" onClick={() => setTheme('light')}>
        Set Light
      </button>
      <button data-testid="set-dark" onClick={() => setTheme('dark')}>
        Set Dark
      </button>
      <button data-testid="set-auto" onClick={() => setTheme('auto')}>
        Set Auto
      </button>
      <button data-testid="toggle-theme" onClick={toggleTheme}>
        Toggle Theme
      </button>
    </div>
  );
};

const renderWithTheme = (initialTheme = 'light', systemPrefersDark = false) => {
  localStorageMock.getItem.mockReturnValue(initialTheme);
  matchMediaMock.mockReturnValue({
    matches: systemPrefersDark,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

  const utils = render(
    <ThemeProvider>
      <TestComponent />
    </ThemeProvider>
  );

  return {
    ...utils,
    getCurrentTheme: () => utils.container.querySelector('[data-testid="current-theme"]')!,
    getEffectiveTheme: () => utils.container.querySelector('[data-testid="effective-theme"]')!,
    getSetLightButton: () => utils.container.querySelector('[data-testid="set-light"]')!,
    getSetDarkButton: () => utils.container.querySelector('[data-testid="set-dark"]')!,
    getSetAutoButton: () => utils.container.querySelector('[data-testid="set-auto"]')!,
    getToggleButton: () => utils.container.querySelector('[data-testid="toggle-theme"]')!,
  };
};
describe('Theme System', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMediaMock,
    });

    // Mock document.documentElement
    Object.defineProperty(document, 'documentElement', {
      value: {
        classList: {
          add: vi.fn(),
          remove: vi.fn(),
        },
        setAttribute: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('ThemeProvider', () => {
    it('should provide default theme as auto', () => {
      localStorageMock.getItem.mockReturnValue(null);
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('auto');
      expect(screen.getByTestId('effective-theme')).toHaveTextContent('light');
    });

    it('should load theme from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('dark');
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('effective-theme')).toHaveTextContent('dark');
    });

    it('should respect system theme when set to auto', () => {
      localStorageMock.getItem.mockReturnValue('auto');
      matchMediaMock.mockReturnValue({
        matches: true, // System prefers dark
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('auto');
      expect(screen.getByTestId('effective-theme')).toHaveTextContent('dark');
    });

    it('should save theme changes to localStorage', async () => {
      localStorageMock.getItem.mockReturnValue('auto');
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId('set-dark'));

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith('theme', 'dark');
      });

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    });

    it('should update DOM classes when theme changes', async () => {
      localStorageMock.getItem.mockReturnValue('light');
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      const mockClassList = {
        add: vi.fn(),
        remove: vi.fn(),
      };
      const mockSetAttribute = vi.fn();

      Object.defineProperty(document, 'documentElement', {
        value: {
          classList: mockClassList,
          setAttribute: mockSetAttribute,
        },
        writable: true,
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      fireEvent.click(screen.getByTestId('set-dark'));

      await waitFor(() => {
        expect(mockClassList.remove).toHaveBeenCalledWith('light', 'dark');
        expect(mockClassList.add).toHaveBeenCalledWith('dark');
        expect(mockSetAttribute).toHaveBeenCalledWith('data-theme', 'dark');
      });
    });

    it('should toggle theme correctly through states', async () => {
      localStorageMock.getItem.mockReturnValue('light');
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      // Initial state: light
      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

      // Toggle: light -> dark
      fireEvent.click(screen.getByTestId('toggle-theme'));
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      });

      // Toggle: dark -> auto
      fireEvent.click(screen.getByTestId('toggle-theme'));
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('auto');
      });

      // Toggle: auto -> light
      fireEvent.click(screen.getByTestId('toggle-theme'));
      await waitFor(() => {
        expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      });
    });

    it('should listen to system theme changes when in auto mode', () => {
      const mockAddEventListener = vi.fn();
      const mockRemoveEventListener = vi.fn();

      localStorageMock.getItem.mockReturnValue('auto');
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      });

      const { unmount } = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle invalid localStorage values gracefully', () => {
      const { getCurrentTheme } = renderWithTheme('invalid-theme');

      // Should fallback to 'auto' for invalid values
      expect(getCurrentTheme()).toHaveTextContent('auto');
    });
  });

  describe('useTheme hook', () => {
    it('should throw error when used outside ThemeProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });

    it('should provide all theme functions', () => {
      const { getSetLightButton, getSetDarkButton, getSetAutoButton, getToggleButton } =
        renderWithTheme('light');

      // All buttons should be present, indicating all functions are available
      expect(getSetLightButton()).toBeInTheDocument();
      expect(getSetDarkButton()).toBeInTheDocument();
      expect(getSetAutoButton()).toBeInTheDocument();
      expect(getToggleButton()).toBeInTheDocument();
    });
  });

  describe('System Integration', () => {
    it('should handle system theme change events', async () => {
      let changeHandler: (e: MediaQueryListEvent) => void;

      const mockAddEventListener = vi.fn((event, handler) => {
        if (event === 'change') {
          changeHandler = handler;
        }
      });

      localStorageMock.getItem.mockReturnValue('auto');
      matchMediaMock.mockReturnValue({
        matches: false,
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn(),
      });

      const utils = render(
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      );

      const getEffectiveTheme = () =>
        utils.container.querySelector('[data-testid="effective-theme"]')!;

      expect(getEffectiveTheme()).toHaveTextContent('light');

      // Simulate system theme change to dark
      changeHandler!({ matches: true } as MediaQueryListEvent);

      await waitFor(() => {
        expect(getEffectiveTheme()).toHaveTextContent('dark');
      });
    });
  });
});
