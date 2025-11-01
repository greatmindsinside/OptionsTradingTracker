import { useContext } from 'react';
import { ThemeContext } from '../contexts/theme';

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};

export const useEffectiveTheme = () => {
  const { effectiveTheme } = useTheme();
  return effectiveTheme;
};

export const useIsDark = () => {
  const { effectiveTheme } = useTheme();
  return effectiveTheme === 'dark';
};

export const useIsLight = () => {
  const { effectiveTheme } = useTheme();
  return effectiveTheme === 'light';
};
