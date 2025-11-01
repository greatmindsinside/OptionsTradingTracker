import React, { type ReactNode } from 'react';
import styles from './ChartContainer.module.css';

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  loading?: boolean;
  error?: string;
  height?: number;
  className?: string;
  actions?: ReactNode;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  subtitle,
  children,
  loading = false,
  error,
  height = 300,
  className = '',
  actions,
}) => {
  if (loading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h3 className={styles.title}>{title}</h3>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
        <div className={styles.content} style={{ height }}>
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <span>Loading chart data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.header}>
          <div className={styles.titleSection}>
            <h3 className={styles.title}>{title}</h3>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
        <div className={styles.content} style={{ height }}>
          <div className={styles.error}>
            <div className={styles.errorIcon}>⚠️</div>
            <div className={styles.errorText}>
              <strong>Chart Error</strong>
              <span>{error}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{title}</h3>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      <div className={styles.content} style={{ height }}>
        <div className={styles.chartWrapper}>{children}</div>
      </div>
    </div>
  );
};

export default ChartContainer;
