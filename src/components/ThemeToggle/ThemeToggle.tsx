import React from 'react';

import { useTheme } from '../../hooks/useTheme';
import styles from './ThemeToggle.module.css';

const ThemeToggle: React.FC = () => {
  const { theme, effectiveTheme, toggleTheme } = useTheme();

  const getIcon = () => {
    if (theme === 'auto') {
      return effectiveTheme === 'dark' ? '🌙' : '☀️';
    }
    return theme === 'dark' ? '🌙' : '☀️';
  };

  const getLabel = () => {
    if (theme === 'auto') {
      return `Auto (${effectiveTheme})`;
    }
    return theme === 'dark' ? 'Dark' : 'Light';
  };

  return (
    <button
      onClick={toggleTheme}
      className={styles.toggleButton}
      title={`Current theme: ${getLabel()}. Click to cycle between Light → Dark → Auto`}
      aria-label={`Switch theme. Current: ${getLabel()}`}
    >
      <span className={styles.icon}>{getIcon()}</span>
      <span className={styles.label}>{getLabel()}</span>
    </button>
  );
};

export default ThemeToggle;
