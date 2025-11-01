/**
 * ResultsDisplay Component
 * Displays formatted calculation results with metrics and risk analysis
 */

import styles from './ResultsDisplay.module.css';
import type { RiskFlag } from '@/modules/calc/index';

interface Metric {
  label: string;
  value: string | number;
  subtitle?: string;
  format?: 'currency' | 'percent' | 'number' | 'days';
}

interface ResultsDisplayProps {
  metrics: Metric[];
  risks?: RiskFlag[];
  greeks?: {
    delta?: number;
    theta?: number;
    gamma?: number;
  };
  className?: string;
}

export function ResultsDisplay({
  metrics,
  risks = [],
  greeks,
  className = '',
}: ResultsDisplayProps) {
  const formatValue = (value: string | number, format?: string): string => {
    if (typeof value === 'string') return value;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'percent':
        return `${value.toFixed(2)}%`;
      case 'days':
        return `${Math.floor(value)} days`;
      default:
        return value.toString();
    }
  };

  const getRiskSeverityClass = (severity: string): string => {
    switch (severity) {
      case 'low':
        return styles.riskLow;
      case 'medium':
        return styles.riskMedium;
      case 'high':
        return styles.riskHigh;
      case 'critical':
        return styles.riskCritical;
      default:
        return '';
    }
  };

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <div key={index} className={styles.metricCard}>
            <div className={styles.metricLabel}>{metric.label}</div>
            <div className={styles.metricValue}>{formatValue(metric.value, metric.format)}</div>
            {metric.subtitle && <div className={styles.metricSubtitle}>{metric.subtitle}</div>}
          </div>
        ))}
      </div>

      {/* Greeks Section */}
      {greeks && (
        <div className={styles.greeksSection}>
          <h4 className={styles.sectionTitle}>Greeks (Educational)</h4>
          <div className={styles.greeksGrid}>
            {greeks.delta !== undefined && (
              <div className={styles.greekItem}>
                <span className={styles.greekLabel}>Delta:</span>
                <span className={styles.greekValue}>{greeks.delta.toFixed(3)}</span>
              </div>
            )}
            {greeks.theta !== undefined && (
              <div className={styles.greekItem}>
                <span className={styles.greekLabel}>Theta:</span>
                <span className={styles.greekValue}>${greeks.theta.toFixed(2)}/day</span>
              </div>
            )}
            {greeks.gamma !== undefined && (
              <div className={styles.greekItem}>
                <span className={styles.greekLabel}>Gamma:</span>
                <span className={styles.greekValue}>{greeks.gamma.toFixed(4)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Analysis */}
      {risks.length > 0 && (
        <div className={styles.riskSection}>
          <h4 className={styles.sectionTitle}>Risk Analysis</h4>
          <div className={styles.riskList}>
            {risks.map((risk, index) => (
              <div
                key={index}
                className={`${styles.riskItem} ${getRiskSeverityClass(risk.severity)}`}
              >
                <div className={styles.riskSeverity}>{risk.severity.toUpperCase()}</div>
                <div className={styles.riskMessage}>{risk.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Risk State */}
      {risks.length === 0 && (
        <div className={styles.noRiskSection}>
          <div className={styles.noRiskItem}>
            <span className={styles.noRiskIcon}>✅</span>
            <span>No risk flags detected</span>
          </div>
        </div>
      )}
    </div>
  );
}
