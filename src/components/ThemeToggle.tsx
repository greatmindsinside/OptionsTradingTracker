import type { Theme } from '../contexts/theme';
import { useIsDark, useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = useIsDark();

  const themes = [
    { value: 'light', label: '☀️ Light', icon: '☀️' },
    { value: 'dark', label: '🌙 Dark', icon: '🌙' },
    { value: 'auto', label: '💻 Auto', icon: '💻' },
  ] as const;

  return (
    <div className={`theme-toggle ${isDark ? 'dark' : 'light'}`}>
      <select
        value={theme}
        onChange={e => setTheme(e.target.value as Theme)}
        className="theme-select"
        aria-label="Choose theme"
      >
        {themes.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
