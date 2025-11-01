import { useState } from 'react';
import PnLChart from '../components/PnLChart';
import GreeksChart from '../components/GreeksChart';
import PortfolioChart from '../components/PortfolioChart';
import styles from './VisualizationPage.module.css';

export function VisualizationPage() {
  const [pnlTimeRange, setPnlTimeRange] = useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');
  const [selectedGreek, setSelectedGreek] = useState<'delta' | 'gamma' | 'theta' | 'vega' | 'rho'>(
    'delta'
  );
  const [portfolioView, setPortfolioView] = useState<'pie' | 'bar'>('pie');

  return (
    <div className="page">
      <div className={styles.header}>
        <h1>Portfolio Visualization</h1>
        <p>
          Comprehensive visual analysis of your options portfolio performance, risk metrics, and
          position composition.
        </p>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartSection}>
          <PnLChart timeRange={pnlTimeRange} onTimeRangeChange={setPnlTimeRange} />
        </div>

        <div className={styles.chartSection}>
          <GreeksChart selectedGreek={selectedGreek} onGreekChange={setSelectedGreek} />
        </div>

        <div className={styles.chartSection}>
          <PortfolioChart view={portfolioView} onViewChange={setPortfolioView} />
        </div>
      </div>

      <div className={styles.insights}>
        <div className={styles.insightCard}>
          <h3>📈 Performance Insights</h3>
          <ul>
            <li>Portfolio showing positive trend over selected timeframe</li>
            <li>Realized gains outpacing unrealized losses</li>
            <li>Volatility within acceptable risk parameters</li>
          </ul>
        </div>

        <div className={styles.insightCard}>
          <h3>🔢 Greeks Analysis</h3>
          <ul>
            <li>Delta exposure well-balanced across positions</li>
            <li>Theta decay manageable with current strategy mix</li>
            <li>Gamma risk concentrated in high-volatility names</li>
          </ul>
        </div>

        <div className={styles.insightCard}>
          <h3>🎯 Portfolio Composition</h3>
          <ul>
            <li>Diversified across major technology stocks</li>
            <li>Strategy mix optimized for current market conditions</li>
            <li>Position sizing within risk management guidelines</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
