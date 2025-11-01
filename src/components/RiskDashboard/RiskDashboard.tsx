import React from 'react';
import styles from './RiskDashboard.module.css';

interface RiskAlert {
  id: string;
  type: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  value?: number;
  threshold?: number;
}

interface RiskMetric {
  label: string;
  value: number;
  maxValue: number;
  status: 'safe' | 'warning' | 'danger';
  unit?: string;
}

interface RiskDashboardProps {
  alerts?: RiskAlert[];
  metrics?: RiskMetric[];
  loading?: boolean;
}

// Mock data for demonstration
const defaultAlerts: RiskAlert[] = [
  {
    id: '1',
    type: 'high',
    title: 'Position Concentration',
    message: 'AAPL represents 35% of portfolio value',
    value: 35,
    threshold: 25,
  },
  {
    id: '2',
    type: 'medium',
    title: 'Delta Exposure',
    message: 'Portfolio delta approaching upper limit',
    value: 0.78,
    threshold: 0.8,
  },
  {
    id: '3',
    type: 'low',
    title: 'Theta Decay',
    message: 'High theta exposure over weekend',
    value: -125.5,
  },
];

const defaultMetrics: RiskMetric[] = [
  { label: 'Portfolio Delta', value: 0.35, maxValue: 1.0, status: 'safe' },
  { label: 'Portfolio Gamma', value: 0.12, maxValue: 0.5, status: 'safe' },
  { label: 'Portfolio Theta', value: -125.5, maxValue: -200, status: 'warning', unit: '$' },
  { label: 'Portfolio Vega', value: 45.2, maxValue: 100, status: 'safe', unit: '$' },
  { label: 'Concentration Risk', value: 35, maxValue: 25, status: 'danger', unit: '%' },
  { label: 'Liquidity Score', value: 8.5, maxValue: 10, status: 'safe' },
];

const getRiskColor = (type: string) => {
  switch (type) {
    case 'high':
    case 'danger':
      return 'var(--color-danger-500)';
    case 'medium':
    case 'warning':
      return 'var(--color-warning-500)';
    default:
      return 'var(--color-success-500)';
  }
};

const formatMetricValue = (value: number, unit?: string) => {
  if (unit === '$') {
    return value < 0 ? `-$${Math.abs(value).toFixed(2)}` : `$${value.toFixed(2)}`;
  }
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  return value.toFixed(2);
};

const RiskDashboard: React.FC<RiskDashboardProps> = ({
  alerts = defaultAlerts,
  metrics = defaultMetrics,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Risk Management</h2>
          <div className={styles.loading}>Loading risk data...</div>
        </div>
      </div>
    );
  }

  const highRiskAlerts = alerts.filter(alert => alert.type === 'high');
  const overallRiskScore =
    metrics.reduce((acc, metric) => {
      if (metric.status === 'danger') return acc + 3;
      if (metric.status === 'warning') return acc + 2;
      return acc + 1;
    }, 0) / metrics.length;

  const getRiskLevel = (score: number) => {
    if (score >= 2.5) return { level: 'High Risk', color: 'var(--color-danger-500)' };
    if (score >= 1.5) return { level: 'Medium Risk', color: 'var(--color-warning-500)' };
    return { level: 'Low Risk', color: 'var(--color-success-500)' };
  };

  const riskAssessment = getRiskLevel(overallRiskScore);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h2 className={styles.title}>Risk Management</h2>
          <div className={styles.riskLevel} style={{ color: riskAssessment.color }}>
            {riskAssessment.level}
          </div>
        </div>
        <div className={styles.alertCount}>
          {highRiskAlerts.length > 0 && (
            <span className={styles.highAlertBadge}>
              {highRiskAlerts.length} High Risk Alert{highRiskAlerts.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div className={styles.content}>
        {/* Risk Alerts */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Active Alerts</h3>
          <div className={styles.alerts}>
            {alerts.length === 0 ? (
              <div className={styles.noAlerts}>
                <span className={styles.checkIcon}>✓</span>
                No active risk alerts
              </div>
            ) : (
              alerts.map(alert => (
                <div key={alert.id} className={`${styles.alert} ${styles[alert.type]}`}>
                  <div className={styles.alertHeader}>
                    <span
                      className={styles.alertIcon}
                      style={{ backgroundColor: getRiskColor(alert.type) }}
                    >
                      {alert.type === 'high' ? '⚠' : alert.type === 'medium' ? '⚡' : 'ℹ'}
                    </span>
                    <span className={styles.alertTitle}>{alert.title}</span>
                  </div>
                  <p className={styles.alertMessage}>{alert.message}</p>
                  {alert.value !== undefined && alert.threshold !== undefined && (
                    <div className={styles.alertMetric}>
                      Current:{' '}
                      {formatMetricValue(alert.value, alert.title.includes('%') ? '%' : undefined)}|
                      Threshold:{' '}
                      {formatMetricValue(
                        alert.threshold,
                        alert.title.includes('%') ? '%' : undefined
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Risk Metrics */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Risk Metrics</h3>
          <div className={styles.metrics}>
            {metrics.map((metric, index) => {
              const percentage = (Math.abs(metric.value) / Math.abs(metric.maxValue)) * 100;
              const cappedPercentage = Math.min(percentage, 100);

              return (
                <div key={index} className={styles.metric}>
                  <div className={styles.metricHeader}>
                    <span className={styles.metricLabel}>{metric.label}</span>
                    <span className={styles.metricValue}>
                      {formatMetricValue(metric.value, metric.unit)}
                    </span>
                  </div>
                  <div className={styles.metricBar}>
                    <div
                      className={styles.metricProgress}
                      style={{
                        width: `${cappedPercentage}%`,
                        backgroundColor: getRiskColor(metric.status),
                      }}
                    />
                  </div>
                  <div className={styles.metricFooter}>
                    <span className={styles.metricLimit}>
                      Limit: {formatMetricValue(metric.maxValue, metric.unit)}
                    </span>
                    <span
                      className={styles.metricStatus}
                      style={{ color: getRiskColor(metric.status) }}
                    >
                      {metric.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskDashboard;
