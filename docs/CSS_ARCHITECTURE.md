# CSS Architecture Guide

This document explains the CSS architecture and design system used in the Options Trading Tracker application.

## Overview

Our CSS architecture follows a modular, scalable approach using:

- **CSS Variables**: Design tokens for consistency
- **CSS Modules**: Component-scoped styles
- **Utility Classes**: Functional CSS for rapid development
- **Global Styles**: Base styles and resets

## File Structure

```
src/styles/
├── variables.css     # Design system tokens (colors, spacing, typography)
├── base.css         # Global styles, resets, and base elements
└── utilities.css    # Utility classes for common patterns

src/components/
└── [Component]/
    └── [Component].module.css  # Component-specific styles
```

## Design System Tokens

### Colors

Our color system uses semantic naming:

```css
/* Primary colors */
--color-primary-500: #3b82f6;
--color-primary-600: #2563eb;

/* Semantic colors */
--color-success-600: #16a34a;
--color-warning-600: #d97706;
--color-error-600: #dc2626;

/* Contextual colors */
--color-background: var(--color-gray-50);
--color-text: var(--color-gray-900);
--color-border: var(--color-gray-200);
```

### Typography

Typography follows a modular scale:

```css
/* Font sizes */
--font-size-sm: 0.875rem; /* 14px */
--font-size-base: 1rem; /* 16px */
--font-size-lg: 1.125rem; /* 18px */

/* Font weights */
--font-weight-normal: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
```

### Spacing

Consistent spacing using a 4px base unit:

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-4: 1rem; /* 16px */
--space-8: 2rem; /* 32px */
```

## Component Styles (CSS Modules)

Use CSS Modules for component-specific styles:

```tsx
// Button.tsx
import styles from './Button.module.css';

export function Button({ variant = 'primary', size = 'medium', children }) {
  return (
    <button className={`${styles.button} ${styles[variant]} ${styles[size]}`}>{children}</button>
  );
}
```

```css
/* Button.module.css */
.button {
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.primary {
  background-color: var(--color-primary-600);
  color: white;
}

.small {
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
}
```

## Utility Classes

For rapid development, use utility classes:

```tsx
<div className="flex items-center gap-4 p-6 bg-surface rounded-lg shadow">
  <h2 className="text-xl font-semibold">Title</h2>
  <p className="text-muted">Description</p>
</div>
```

### Available Utilities

- **Layout**: `flex`, `grid`, `container`
- **Spacing**: `p-4`, `m-2`, `gap-4`
- **Typography**: `text-lg`, `font-bold`, `text-center`
- **Colors**: `text-primary`, `bg-surface`
- **Responsive**: `md:grid-cols-2`, `lg:text-xl`

## Dark Mode Support

Dark mode is handled through CSS variables:

```css
/* Light mode (default) */
:root {
  --color-background: var(--color-gray-50);
  --color-text: var(--color-gray-900);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: var(--color-gray-900);
    --color-text: var(--color-gray-100);
  }
}

/* Manual dark mode toggle */
.dark {
  --color-background: var(--color-gray-900);
  --color-text: var(--color-gray-100);
}
```

## Responsive Design

Use mobile-first responsive design:

```css
/* Mobile first */
.container {
  padding: var(--space-4);
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    padding: var(--space-6);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    max-width: var(--container-lg);
  }
}
```

## Accessibility

Our styles include accessibility features:

- Focus indicators: `outline: 2px solid var(--color-border-focus)`
- Reduced motion: `@media (prefers-reduced-motion: reduce)`
- High contrast support through semantic colors
- Screen reader utilities: `.sr-only`

## Best Practices

### 1. Use Design Tokens

```css
/* ✅ Good */
color: var(--color-primary-600);
padding: var(--space-4);

/* ❌ Avoid */
color: #2563eb;
padding: 16px;
```

### 2. Prefer Utilities for Simple Styles

```tsx
/* ✅ Good for simple layouts */
<div className="flex items-center gap-4" />

/* ✅ Good for complex components */
<button className={styles.complexButton} />
```

### 3. Use Semantic Class Names

```css
/* ✅ Good */
.submitButton {
}
.errorMessage {
}

/* ❌ Avoid */
.redButton {
}
.bigText {
}
```

### 4. Follow BEM for CSS Modules

```css
/* ✅ Good */
.card {
}
.card__header {
}
.card__title {
}
.card--featured {
}

/* ❌ Avoid */
.cardHeaderTitle {
}
.featured-card-title {
}
```

## Performance

- CSS is optimized and minified in production
- Unused styles are automatically removed
- Critical CSS is inlined in the HTML
- CSS Modules prevent style conflicts

## Migration Guide

When converting existing styles:

1. Extract hardcoded values to CSS variables
2. Replace global styles with CSS Modules
3. Use utility classes for simple layouts
4. Ensure responsive design principles
5. Test accessibility and dark mode

## Tools and Plugins

- **PostCSS**: For CSS processing
- **CSS Modules**: Component scoping
- **Vite**: Build-time optimizations
- **ESLint**: CSS-in-JS linting

## Resources

- [MDN CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [CSS Modules Documentation](https://github.com/css-modules/css-modules)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
