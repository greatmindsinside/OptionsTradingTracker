import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import ThemeToggle from '../../src/components/ThemeToggle/ThemeToggle';
import { ThemeProvider } from '../../src/contexts/ThemeContext';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock matchMedia
const matchMediaMock = vi.fn();

describe('ThemeToggle Component', () => {
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

  const renderWithTheme = (initialTheme = 'light', systemPrefersDark = false) => {
    localStorageMock.getItem.mockReturnValue(initialTheme);
    matchMediaMock.mockReturnValue({
      matches: systemPrefersDark,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const utils = render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    return {
      ...utils,
      getToggleButton: () => utils.container.querySelector('button')!,
    };
  };

  describe('Rendering', () => {
    it('should render toggle button with light theme', () => {
      const { getToggleButton } = renderWithTheme('light');

      const button = getToggleButton();
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('☀️');
      expect(button).toHaveTextContent('Light');
    });

    it('should render toggle button with dark theme', () => {
      const { getToggleButton } = renderWithTheme('dark');

      const button = getToggleButton();
      expect(button).toHaveTextContent('🌙');
      expect(button).toHaveTextContent('Dark');
    });

    it('should render toggle button with auto theme (light system)', () => {
      const { getToggleButton } = renderWithTheme('auto', false);

      const button = getToggleButton();
      expect(button).toHaveTextContent('☀️');
      expect(button).toHaveTextContent('Auto (light)');
    });

    it('should render toggle button with auto theme (dark system)', () => {
      const { getToggleButton } = renderWithTheme('auto', true);

      const button = getToggleButton();
      expect(button).toHaveTextContent('🌙');
      expect(button).toHaveTextContent('Auto (dark)');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      const { getToggleButton } = renderWithTheme('light');

      const button = getToggleButton();
      expect(button).toHaveAttribute('aria-label', 'Switch theme. Current: Light');
    });

    it('should have proper title attribute', () => {
      const { getToggleButton } = renderWithTheme('dark');

      const button = getToggleButton();
      expect(button).toHaveAttribute(
        'title',
        'Current theme: Dark. Click to cycle between Light → Dark → Auto'
      );
    });

    it('should update accessibility attributes when theme changes', () => {
      const { getToggleButton } = renderWithTheme('light');

      const button = getToggleButton();

      // Initial state
      expect(button).toHaveAttribute('aria-label', 'Switch theme. Current: Light');

      // Click to change theme
      fireEvent.click(button);

      // Should update to dark
      expect(button).toHaveAttribute('aria-label', 'Switch theme. Current: Dark');
    });
  });

  describe('Theme Toggling', () => {
    it('should toggle from light to dark', () => {
      const { getToggleButton } = renderWithTheme('light');

      const button = getToggleButton();
      fireEvent.click(button);

      expect(button).toHaveTextContent('🌙');
      expect(button).toHaveTextContent('Dark');
    });

    it('should toggle from dark to auto', () => {
      const { getToggleButton } = renderWithTheme('dark');

      const button = getToggleButton();
      fireEvent.click(button);

      expect(button).toHaveTextContent('Auto');
    });

    it('should toggle from auto to light', () => {
      const { getToggleButton } = renderWithTheme('auto');

      const button = getToggleButton();
      fireEvent.click(button);

      expect(button).toHaveTextContent('☀️');
      expect(button).toHaveTextContent('Light');
    });

    it('should complete full cycle: light -> dark -> auto -> light', () => {
      const { getToggleButton } = renderWithTheme('light');

      const button = getToggleButton();

      // Light -> Dark
      fireEvent.click(button);
      expect(button).toHaveTextContent('Dark');

      // Dark -> Auto
      fireEvent.click(button);
      expect(button).toHaveTextContent('Auto');

      // Auto -> Light
      fireEvent.click(button);
      expect(button).toHaveTextContent('Light');
    });
  });

  describe('System Theme Integration', () => {
    it('should show correct icon in auto mode based on system theme', () => {
      // Auto mode with system preferring dark
      const { getToggleButton } = renderWithTheme('auto', true);

      const button = getToggleButton();
      expect(button).toHaveTextContent('🌙');
      expect(button).toHaveTextContent('Auto (dark)');
    });

    it('should show correct icon in auto mode based on system theme (light)', () => {
      // Auto mode with system preferring light
      const { getToggleButton } = renderWithTheme('auto', false);

      const button = getToggleButton();
      expect(button).toHaveTextContent('☀️');
      expect(button).toHaveTextContent('Auto (light)');
    });
  });

  describe('Styling', () => {
    it('should have correct CSS classes', () => {
      const { getToggleButton } = renderWithTheme('light');

      const button = getToggleButton();
      expect(button.className).toContain('toggleButton');
    });

    it('should contain icon and label elements', () => {
      const { getToggleButton } = renderWithTheme('light');

      const button = getToggleButton();
      const icon = button.querySelector('[class*="_icon_"]');
      const label = button.querySelector('[class*="_label_"]');

      expect(icon).toBeInTheDocument();
      expect(label).toBeInTheDocument();
      expect(icon).toHaveTextContent('☀️');
      expect(label).toHaveTextContent('Light');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing theme context gracefully', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<ThemeToggle />);
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });
});
