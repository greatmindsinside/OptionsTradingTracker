import { OptionsCalculator } from '@/components/OptionsCalculator';
import PnLChart from '../components/PnLChart';
import GreeksChart from '../components/GreeksChart';
import PortfolioChart from '../components/PortfolioChart';

export function AnalysisPage() {
  return (
    <div className="page">
      <h1>Options Strategy Analysis</h1>
      <p>
        Calculate and analyze your options trading strategies with real-time metrics, risk analysis,
        and educational Greeks.
      </p>

      <OptionsCalculator />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
          gap: 'var(--space-6)',
          marginTop: 'var(--space-8)',
        }}
      >
        <PnLChart />
        <GreeksChart />
      </div>

      <div style={{ marginTop: 'var(--space-6)' }}>
        <PortfolioChart />
      </div>
    </div>
  );
}
