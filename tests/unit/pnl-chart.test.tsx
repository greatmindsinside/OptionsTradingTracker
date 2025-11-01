import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import PnLChart from '../../src/components/PnLChart/PnLChart';

// Mock recharts to avoid issues in test environment
vi.mock('recharts', () => ({
  LineChart: ({ children, data }: { children: React.ReactNode; data?: unknown[] }) => (
    <div data-testid="line-chart" data-points={data?.length}>
      {children}
    </div>
  ),
  Line: ({ dataKey, name, stroke }: { dataKey: string; name: string; stroke: string }) => (
    <div data-testid="line" data-key={dataKey} data-name={name} style={{ color: stroke }} />
  ),
  XAxis: ({ dataKey }: { dataKey: string }) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container" style={{ width: '100%', height: '400px' }}>
      {children}
    </div>
  ),
  ReferenceLine: ({ y }: { y: number }) => <div data-testid="reference-line" data-y={y} />,
}));

describe('PnLChart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Basic Rendering', () => {
    it('should render the chart container with correct title and subtitle', () => {
      render(<PnLChart />);

      expect(screen.getByText('Portfolio Performance')).toBeInTheDocument();
      expect(screen.getByText('Profit & Loss over time')).toBeInTheDocument();
    });

    it('should render with mock data by default', () => {
      render(<PnLChart />);

      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toBeInTheDocument();
      expect(lineChart).toHaveAttribute('data-points', '30');
    });

    it('should render responsive container with correct dimensions', () => {
      render(<PnLChart />);

      const container = screen.getByTestId('responsive-container');
      expect(container).toBeInTheDocument();
      expect(container).toHaveStyle({ width: '100%', height: '400px' });
    });
  });

  describe('Chart Components', () => {
    it('should render all required chart components', () => {
      render(<PnLChart />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('x-axis')).toBeInTheDocument();
      expect(screen.getByTestId('y-axis')).toBeInTheDocument();
      expect(screen.getByTestId('cartesian-grid')).toBeInTheDocument();
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('legend')).toBeInTheDocument();
      expect(screen.getByTestId('reference-line')).toBeInTheDocument();
    });

    it('should render X-axis with date dataKey', () => {
      render(<PnLChart />);

      const xAxis = screen.getByTestId('x-axis');
      expect(xAxis).toHaveAttribute('data-key', 'date');
    });

    it('should render reference line at y=0', () => {
      render(<PnLChart />);

      const referenceLine = screen.getByTestId('reference-line');
      expect(referenceLine).toHaveAttribute('data-y', '0');
    });
  });

  describe('Metric Selection', () => {
    it('should render metric selector buttons', () => {
      render(<PnLChart />);

      expect(screen.getByText('Total P&L')).toBeInTheDocument();
      expect(screen.getByText('Realized P&L')).toBeInTheDocument();
      expect(screen.getByText('Unrealized P&L')).toBeInTheDocument();
    });

    it('should have Total P&L selected by default', () => {
      render(<PnLChart />);

      const totalButton = screen.getByText('Total P&L');
      expect(totalButton.className).toContain('active');

      // Should render Total P&L line
      const line = screen.getByTestId('line');
      expect(line).toHaveAttribute('data-key', 'totalPnL');
      expect(line).toHaveAttribute('data-name', 'Total P&L');
    });

    it('should switch to Realized P&L when clicked', async () => {
      render(<PnLChart />);

      const realizedButton = screen.getByText('Realized P&L');
      fireEvent.click(realizedButton);

      await waitFor(() => {
        expect(realizedButton.className).toContain('active');
        const line = screen.getByTestId('line');
        expect(line).toHaveAttribute('data-key', 'realizedPnL');
        expect(line).toHaveAttribute('data-name', 'Realized P&L');
      });
    });

    it('should switch to Unrealized P&L when clicked', async () => {
      render(<PnLChart />);

      const unrealizedButton = screen.getByText('Unrealized P&L');
      fireEvent.click(unrealizedButton);

      await waitFor(() => {
        expect(unrealizedButton.className).toContain('active');
        const line = screen.getByTestId('line');
        expect(line).toHaveAttribute('data-key', 'unrealizedPnL');
        expect(line).toHaveAttribute('data-name', 'Unrealized P&L');
      });
    });

    it('should apply correct colors to metric buttons', () => {
      render(<PnLChart />);

      const totalButton = screen.getByText('Total P&L');
      const realizedButton = screen.getByText('Realized P&L');
      const unrealizedButton = screen.getByText('Unrealized P&L');

      // Total P&L should be active (blue background)
      expect(totalButton).toHaveStyle({ backgroundColor: '#2563eb' });

      // Check that non-active buttons have the expected color scheme (but don't test exact background)
      expect(realizedButton).toHaveStyle({ color: 'rgb(16, 185, 129)' });
      expect(unrealizedButton).toHaveStyle({ color: 'rgb(245, 158, 11)' });
    });
  });

  describe('Time Range Selection', () => {
    it('should render time range selector buttons', () => {
      render(<PnLChart />);

      expect(screen.getByText('1D')).toBeInTheDocument();
      expect(screen.getByText('1W')).toBeInTheDocument();
      expect(screen.getByText('1M')).toBeInTheDocument();
      expect(screen.getByText('3M')).toBeInTheDocument();
      expect(screen.getByText('1Y')).toBeInTheDocument();
      expect(screen.getByText('ALL')).toBeInTheDocument();
    });

    it('should have 1M selected by default', () => {
      render(<PnLChart />);

      const monthButton = screen.getByText('1M');
      expect(monthButton.className).toContain('active');
    });

    it('should call onTimeRangeChange when time range is selected', () => {
      const mockOnTimeRangeChange = vi.fn();
      render(<PnLChart onTimeRangeChange={mockOnTimeRangeChange} />);

      const weekButton = screen.getByText('1W');
      fireEvent.click(weekButton);

      expect(mockOnTimeRangeChange).toHaveBeenCalledWith('1W');
    });
  });

  describe('Custom Data', () => {
    const customData = [
      {
        date: '2024-01-01',
        timestamp: new Date('2024-01-01').getTime(),
        totalPnL: 500,
        realizedPnL: 300,
        unrealizedPnL: 200,
        portfolioValue: 100500,
      },
      {
        date: '2024-01-02',
        timestamp: new Date('2024-01-02').getTime(),
        totalPnL: -200,
        realizedPnL: -100,
        unrealizedPnL: -100,
        portfolioValue: 99800,
      },
    ];

    it('should render with custom data', () => {
      render(<PnLChart data={customData} />);

      const lineChart = screen.getByTestId('line-chart');
      expect(lineChart).toHaveAttribute('data-points', '2');
    });

    it('should show loading state', () => {
      render(<PnLChart loading={true} />);

      expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });

    it('should show error state', () => {
      const errorMessage = 'Failed to load chart data';
      render(<PnLChart error={errorMessage} />);

      expect(screen.getByText('Chart Error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.queryByTestId('line-chart')).not.toBeInTheDocument();
    });
  });

  describe('Data Validation', () => {
    it('should handle empty data gracefully', () => {
      const { container } = render(<PnLChart data={[]} />);

      const lineChart = container.querySelector('[data-testid="line-chart"]');
      expect(lineChart).toHaveAttribute('data-points', '0');
    });

    it('should handle undefined data by using mock data', () => {
      const { container } = render(<PnLChart data={undefined} />);

      const lineChart = container.querySelector('[data-testid="line-chart"]');
      expect(lineChart).toHaveAttribute('data-points', '30');
    });
  });

  describe('Console Logging', () => {
    it('should log data information for debugging', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      render(<PnLChart />);

      expect(consoleSpy).toHaveBeenCalledWith('PnLChart rendering with data:', 30, 'items');
      expect(consoleSpy).toHaveBeenCalledWith('Loading:', false, 'Error:', undefined);
      expect(consoleSpy).toHaveBeenCalledWith('Sample data point:', expect.any(Object));

      consoleSpy.mockRestore();
    });
  });
});
