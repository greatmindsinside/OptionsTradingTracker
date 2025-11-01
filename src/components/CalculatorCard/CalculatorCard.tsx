/**
 * CalculatorCard Component
 * A reusable card container for options calculator interfaces
 */

import React from 'react';
import styles from './CalculatorCard.module.css';

interface CalculatorCardProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  isActive?: boolean;
  onActivate?: () => void;
}

export function CalculatorCard({
  title,
  description,
  icon,
  children,
  className = '',
  isActive = false,
  onActivate,
}: CalculatorCardProps) {
  return (
    <div
      className={`${styles.card} ${isActive ? styles.active : ''} ${className}`}
      onClick={onActivate}
      role={onActivate ? 'button' : undefined}
      tabIndex={onActivate ? 0 : undefined}
      onKeyDown={
        onActivate
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onActivate();
              }
            }
          : undefined
      }
    >
      <div className={styles.header}>
        {icon && <div className={styles.icon}>{icon}</div>}
        <div className={styles.titleSection}>
          <h3 className={styles.title}>{title}</h3>
          {description && <p className={styles.description}>{description}</p>}
        </div>
      </div>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
