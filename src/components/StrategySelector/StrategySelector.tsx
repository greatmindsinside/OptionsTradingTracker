/**
 * StrategySelector Component
 * A segmented control for selecting options trading strategies
 */

import clsx from 'clsx';
import styles from './StrategySelector.module.css';

export type StrategyType = 'covered-call' | 'cash-secured-put' | 'long-call';

interface Strategy {
  id: StrategyType;
  label: string;
  description: string;
  icon: string;
}

interface StrategySelectorProps {
  selectedStrategy: StrategyType;
  onStrategyChange: (strategy: StrategyType) => void;
  className?: string;
}

const strategies: Strategy[] = [
  {
    id: 'covered-call',
    label: 'Covered Call',
    description: 'Own shares, sell call option',
    icon: '📈',
  },
  {
    id: 'cash-secured-put',
    label: 'Cash-Secured Put',
    description: 'Sell put with cash backing',
    icon: '📉',
  },
  {
    id: 'long-call',
    label: 'Long Call',
    description: 'Buy call option',
    icon: '🚀',
  },
];

export function StrategySelector({
  selectedStrategy,
  onStrategyChange,
  className = '',
}: StrategySelectorProps) {
  return (
    <div className={`${styles.container} ${className}`}>
      <h3 className={styles.title}>Select Strategy</h3>

      <div className={styles.selector} role="radiogroup" aria-label="Options trading strategy">
        {strategies.map(strategy => (
          <button
            key={strategy.id}
            className={clsx(
              'card',
              styles.option,
              selectedStrategy === strategy.id && styles.selected
            )}
            onClick={() => onStrategyChange(strategy.id)}
            role="radio"
            aria-checked={selectedStrategy === strategy.id}
            data-testid={`strategy-${strategy.id}`}
          >
            <div className={styles.icon}>{strategy.icon}</div>
            <div className={styles.content}>
              <div className={styles.label}>{strategy.label}</div>
              <div className={styles.description}>{strategy.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
