import { PortfolioSummary } from '@/components/PortfolioSummary';
import { PositionTracker } from '@/components/PositionTracker';
import RiskDashboard from '../components/RiskDashboard';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className="page">
      <div className={styles.hero}>
        <div className={styles.particles}>
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={styles.particle}
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 8}s`,
                animationDuration: `${8 + Math.random() * 4}s`,
              }}
            />
          ))}
        </div>
        <h1 className={styles.title}>Options Trading Dashboard</h1>
        <p className={styles.subtitle}>
          Monitor your portfolio, track positions, and analyze strategies in real-time.
        </p>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.portfolioSection}>
          <PortfolioSummary />
        </div>

        <div className={styles.positionsSection}>
          <PositionTracker />
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-8)' }}>
        <RiskDashboard />
      </div>

      <div className={styles.quickActions}>
        <div className={styles.actionCard}>
          <h3>📊 Strategy Analysis</h3>
          <p>Calculate and analyze options strategies</p>
          <a href="/analysis" className={styles.actionLink}>
            Go to Calculator →
          </a>
        </div>

        <div className={styles.actionCard}>
          <h3>📁 Import Trades</h3>
          <p>Import your trading data from brokers</p>
          <a href="/import" className={styles.actionLink}>
            Import Data →
          </a>
        </div>

        <div className={styles.actionCard}>
          <h3>💼 Portfolio Review</h3>
          <p>Detailed portfolio analysis and reports</p>
          <a href="/portfolio" className={styles.actionLink}>
            View Portfolio →
          </a>
        </div>
      </div>
    </div>
  );
}
