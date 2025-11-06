# Development Guide

**Last Updated:** November 4, 2025

This document provides guidelines for developers working on the Options Trading Tracker application.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [CSS Architecture](#css-architecture)
- [Testing](#testing)
- [Build & Deployment](#build--deployment)
- [Code Standards](#code-standards)
- [Changelog](#changelog)

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (20+ recommended)
- **Yarn** 1.22+ (or npm 9+)
- **Git**
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

### Initial Setup

```bash
# Clone repository
git clone https://github.com/greatmindsinside/OptionsTradingTracker.git
cd OptionsTradingTracker

# Install dependencies
yarn install

# Start development server
yarn dev

# Open browser to http://localhost:5173
```

### Environment Configuration

Create `.env.local` in project root:

```env
# Application
VITE_APP_TITLE="Options Trading Tracker (Dev)"
VITE_APP_VERSION="0.1.0-dev"

# Database
VITE_DB_NAME="options_tracker_dev"
VITE_DB_VERSION=1

# Feature Flags (opt-in)
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_ANALYTICS=false
VITE_FEATURE_JOURNAL_EDIT_DRAWER=true
VITE_FEATURE_JOURNAL_EDIT_FLOW=true
VITE_FEATURE_TRADE_DTE=true

# Optional: Analytics endpoint for telemetry
# VITE_ANALYTICS_ENDPOINT=http://localhost:4000/telemetry
```

Restart dev server after changing environment variables.

---

## Development Workflow

### Branch Strategy

- `master` - Production-ready code
- `develop` - Integration branch for features
- `feat/*` - Feature branches (e.g., `feat/input-demo-modal`)
- `fix/*` - Bug fix branches
- `refactor/*` - Refactoring work

### Commit Convention

Use Conventional Commits:

```bash
feat: add date picker to Trade drawer
fix: resolve DTE calculation for leap years
refactor: consolidate DTE utilities
docs: update FEATURES.md with Trade DTE
test: add unit tests for dates utility
chore: upgrade Tailwind to v4.1.16
```

### Development Commands

```bash
# Development server with HMR
yarn dev

# Type checking
yarn typecheck

# Linting
yarn lint
yarn lint:fix

# Code formatting
yarn format

# Run all checks
yarn validate

# Unit tests
yarn test
yarn test:watch
yarn test:coverage

# E2E tests
yarn test:e2e
yarn test:e2e:ui    # Interactive mode

# Build for production
yarn build
yarn preview        # Preview production build
```

### Hot Module Replacement

Vite provides instant HMR. Changes to React components, CSS, and TypeScript files update without full page reload.

**Tips:**
- Keep components small for faster HMR
- Use React Fast Refresh compatible patterns
- Avoid side effects in module scope

---

## CSS Architecture

### Overview

We use **Tailwind CSS v4** with a consolidated design system in `src/index.css`.

**Key Principles:**
1. **Single source of truth** - All styles in `src/index.css`
2. **Utility-first** - Use Tailwind utilities for 95% of styling
3. **Component patterns** - Use `@layer components` for reusable patterns
4. **No CSS Modules** - Deprecated; use global patterns or inline Tailwind
5. **Minimal custom CSS** - Only when Tailwind can't express it

### File Structure

```
src/
├── index.css                    # SINGLE SOURCE OF TRUTH
│   ├── @import 'tailwindcss'   # Tailwind v4
│   ├── CSS variables (tokens)   # Design system
│   ├── Base styles             # Resets, defaults
│   ├── @layer components       # Reusable patterns
│   └── Utility classes         # Custom utilities
└── styles/
    └── wheel-header.css         # Complex animations (exception)
```

### Design Tokens (CSS Variables)

```css
:root {
  /* Colors */
  --color-primary: #10b981;      /* Emerald 500 */
  --color-danger: #ef4444;       /* Red 500 */
  --color-warning: #f59e0b;      /* Amber 500 */
  --color-success: #10b981;      /* Emerald 500 */
  
  /* Dark theme surfaces */
  --zinc-900: #18181b;
  --zinc-800: #27272a;
  --zinc-700: #3f3f46;
  
  /* Spacing */
  --spacing-unit: 0.25rem;       /* 4px base unit */
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'Fira Code', monospace;
  
  /* Shadows */
  --shadow-glow-green: 0 0 20px rgba(16, 185, 129, 0.3);
  --shadow-glow-red: 0 0 20px rgba(239, 68, 68, 0.3);
}
```

### Component Patterns

Defined in `@layer components` of `index.css`:

#### Modal Patterns

```css
.modal-overlay { /* Fixed overlay with backdrop blur */ }
.modal { /* Dialog box */ }
.modal-header { /* Header with border */ }
.modal-title { /* Title styling */ }
.modal-content { /* Scrollable content */ }
.modal-close { /* Close button */ }
```

#### Table Patterns

```css
.table-container { /* Wrapper with border and bg */ }
.table { /* Base table styles */ }
.table thead { /* Header row */ }
.table th { /* Header cells */ }
.table td { /* Data cells */ }
.table tbody tr:hover { /* Row hover state */ }
```

#### Button Patterns (CVA-based)

Defined in `src/components/Button/Button.tsx` using `class-variance-authority`:

```typescript
const buttonVariants = cva('base-button-classes', {
  variants: {
    variant: {
      primary: 'bg-emerald-500 text-white',
      secondary: 'bg-zinc-700 text-zinc-200',
      danger: 'bg-red-500 text-white',
    },
    size: {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});
```

### Styling Guidelines

**DO:**
- ✅ Use Tailwind utilities directly in JSX
- ✅ Extract repeated patterns to `@layer components`
- ✅ Use CVA for component variants (Button, Input, etc.)
- ✅ Keep color palette consistent (emerald, zinc, red)
- ✅ Use spacing scale (0.25rem multiples: 0, 1, 2, 3, 4, etc.)

**DON'T:**
- ❌ Create new CSS Modules
- ❌ Use inline styles (except for dynamic values)
- ❌ Add vendor-specific CSS without autoprefixer
- ❌ Use absolute pixel values (use rem/em)
- ❌ Override Tailwind defaults without reason

### Accessibility

Always include:
- Focus states (`:focus-visible`)
- High contrast mode support (`@media (prefers-contrast: high)`)
- Reduced motion support (`@media (prefers-reduced-motion: reduce)`)
- ARIA attributes for interactive elements
- Keyboard navigation (Tab, Enter, Escape)

Example:

```tsx
<button
  className="focus-visible:ring-2 focus-visible:ring-emerald-500"
  aria-label="Close dialog"
  onClick={handleClose}
>
  Close
</button>
```

### Recent Cleanup (November 2025)

**Removed:**
- 6 deprecated pages (HomePage, PortfolioPage, VisualizationPage, etc.)
- 15+ orphaned components (dashboard, chart, demo)
- 9+ CSS Modules for deleted components
- 2 orphaned style files (accessibility.css, themes.css)

**Result:**
- CSS: 121.72 kB → 89.89 kB (-31.83 kB, -26.1%)
- Gzipped: 20.43 kB → 15.09 kB (-5.34 kB)
- All builds passing, TypeScript clean

---

## Testing

### Test Stack

- **Vitest** - Unit and component tests
- **Testing Library** - React component testing
- **Playwright** - E2E tests (Chromium, Firefox, WebKit)
- **Axe** - Accessibility testing

### Unit Tests

Located in `tests/unit/`:

```bash
# Run unit tests
yarn test

# Watch mode
yarn test:watch

# Coverage report
yarn test:coverage
```

**Example unit test** (`tests/unit/dates.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { calcDTE, dateFromDTE } from '@/utils/dates';

describe('dates utils - DTE', () => {
  const now = new Date('2024-02-28T12:34:56');

  it('calcDTE returns 0 for same-day expiration', () => {
    expect(calcDTE('2024-02-28', now)).toBe(0);
  });

  it('calcDTE returns 1 for next day', () => {
    expect(calcDTE('2024-02-29', now)).toBe(1);
  });
});
```

### Component Tests

Use Testing Library for component tests:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradeTab } from '@/pages/wheel/components/drawers/TradeTab';

it('renders date picker when feature flag is enabled', () => {
  env.features.tradeDTE = true;
  render(<TradeTab />);
  
  expect(screen.getByLabelText(/Expiration/i)).toHaveAttribute('type', 'date');
});
```

### E2E Tests

Located in `tests/e2e/`:

```bash
# Run E2E tests
yarn test:e2e

# Interactive mode
yarn test:e2e:ui

# Headed mode (watch browser)
yarn test:e2e --headed

# Specific test file
yarn test:e2e tests/e2e/smoke.spec.ts
```

**Example E2E test** (`tests/e2e/smoke.spec.ts`):

```typescript
import { test, expect } from '@playwright/test';

test('wheel page loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('wheel.header')).toBeVisible();
});
```

### Accessibility Testing

Run Axe in E2E tests:

```typescript
import { test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('journal page has no accessibility violations', async ({ page }) => {
  await page.goto('/journal');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

### Test Coverage Goals

- **Overall:** >90%
- **Critical paths:** 100% (trade entry, journal edit, wheel calculations)
- **Utilities:** 100% (dates, calculations, formatters)
- **Components:** >85%

---

## Build & Deployment

### Production Build

```bash
# Build optimized bundle
yarn build

# Output: dist/ folder
# - index.html
# - assets/
#   ├── index-[hash].js
#   ├── index-[hash].css
#   └── [other assets]

# Preview locally
yarn preview
```

### Build Configuration

**Vite config** (`vite.config.ts`):

```typescript
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@headlessui/react', 'lucide-react'],
        },
      },
    },
  },
});
```

### Deployment Platforms

#### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

#### Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Static Hosting

Upload `dist/` folder to:
- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting
- Surge.sh

### Environment Variables

For production, set in hosting platform:

```env
VITE_APP_TITLE="Options Trading Tracker"
VITE_APP_VERSION="1.0.0"
VITE_DB_NAME="options_tracker"
VITE_ENABLE_ANALYTICS=true
VITE_ANALYTICS_ENDPOINT=https://api.example.com/telemetry
```

---

## Code Standards

### TypeScript

- **Strict mode enabled**
- **No implicit any**
- **Explicit return types** for exported functions
- **Interface over type** for object shapes

```typescript
// ✅ Good
interface User {
  id: string;
  name: string;
}

export function getUser(id: string): User | null {
  // ...
}

// ❌ Bad
type User = {
  id: string;
  name: string;
}

export function getUser(id) {
  // ...
}
```

### React

- **Functional components** with hooks
- **Named exports** for components
- **Props interface** defined above component
- **Memoization** for expensive computations

```typescript
// ✅ Good
interface UserCardProps {
  user: User;
  onEdit: (id: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onEdit }) => {
  const displayName = useMemo(() => formatName(user.name), [user.name]);
  
  return (
    <div>
      <h3>{displayName}</h3>
      <button onClick={() => onEdit(user.id)}>Edit</button>
    </div>
  );
};
```

### File Naming

- **Components:** `PascalCase.tsx` (e.g., `TradeTab.tsx`)
- **Utilities:** `camelCase.ts` (e.g., `formatCurrency.ts`)
- **Hooks:** `use*.ts` (e.g., `useWheelDatabase.ts`)
- **Types:** `camelCase.ts` or `PascalCase.ts` (e.g., `entry.ts`, `User.ts`)
- **Tests:** `*.test.ts` or `*.spec.ts`

### Imports

Order imports:

1. External libraries (React, etc.)
2. Internal modules (`@/modules/*`)
3. Components (`@/components/*`)
4. Utilities (`@/utils/*`)
5. Types (`@/types/*`)
6. Relative imports

```typescript
import React, { useState } from 'react';
import { calcDTE } from '@/utils/dates';
import { Button } from '@/components/Button';
import type { Entry } from '@/types/entry';
import { useTradeComposer } from '../hooks/useTradeComposer';
```

### Git Hooks

**Pre-commit** (via Husky):
- Lint + format staged files (lint-staged)
- Type check (tsc)
- Run unit tests (Vitest)

**Pre-push:**
- Build check

---

## Changelog

### November 4, 2025 - Trade DTE Feature

**Added:**
- ✅ Trade drawer date picker UI (feature-flagged)
- ✅ DTE chip showing calculated days to expiration
- ✅ Advanced toggle for direct numeric DTE input
- ✅ Past-date warning with confirmation dialog
- ✅ Shared DTE utility (`src/utils/dates.ts`)
- ✅ Telemetry events for Trade interactions
- ✅ Unit tests for dates utility
- ✅ Component tests for Trade UI
- ✅ Feature documentation in FEATURES.md

**Changed:**
- ✅ Wheel DTE calculation now uses shared utility
- ✅ Feature flag system extended with `VITE_FEATURE_TRADE_DTE`

**Files:**
- `src/utils/dates.ts` (new)
- `src/utils/env.ts` (extended)
- `src/utils/telemetry.ts` (new events)
- `src/hooks/useWheelDatabase.ts` (refactored)
- `src/pages/wheel/components/drawers/TradeTab.tsx` (enhanced)
- `tests/unit/dates.test.ts` (new)
- `tests/unit/trade-tab-dte.test.tsx` (new)

### November 3, 2025 - Project Cleanup

**Removed:**
- ✅ 6 deprecated pages (HomePage, PortfolioPage, VisualizationPage, AnalysisPage, TaxPage, ImportPage)
- ✅ 15+ orphaned components (dashboard, chart, demo, legacy UI)
- ✅ 9+ CSS Modules for deleted components
- ✅ 2 orphaned style files (accessibility.css, themes.css)

**Added:**
- ✅ High-contrast mode support in `index.css`
- ✅ Modal and table global patterns

**Results:**
- CSS: 121.72 kB → 89.89 kB (-31.83 kB, -26.1%)
- Gzipped: 20.43 kB → 15.09 kB (-5.34 kB)
- All builds passing, TypeScript clean

**Documentation:**
- ✅ Updated PROJECT_ORGANIZATION.md
- ✅ Created cleanup reports

### November 3, 2025 - Journal Edit Feature

**Added:**
- ✅ Journal edit drawer with slide-in panel
- ✅ Full-field editing with audit trail
- ✅ Soft-delete pattern (deleted_at, edit_reason)
- ✅ Auto-calculation for assignment types
- ✅ Telemetry tracking (open, close, save, error)
- ✅ Feature flag: `VITE_FEATURE_JOURNAL_EDIT_DRAWER`

**Components:**
- `src/pages/journal/components/drawers/JournalDrawer.tsx` (new)
- `src/stores/useJournalUIStore.ts` (new)
- `src/stores/useEntriesStore.ts` (extended)

### October 2025 - Core Platform

**Added:**
- ✅ Wheel strategy dashboard
- ✅ Journal transaction history
- ✅ CSV import with multi-broker support
- ✅ SQLite database with OPFS persistence
- ✅ React 19 + TypeScript 5.9 + Vite 7
- ✅ Tailwind CSS v4 design system
- ✅ E2E tests with Playwright
- ✅ Unit tests with Vitest

---

## Troubleshooting

### Common Issues

**Issue:** "Module not found" after adding new file

**Solution:** Restart TypeScript server in VS Code:
- `Ctrl/Cmd + Shift + P`
- "TypeScript: Restart TS Server"

---

**Issue:** HMR not working

**Solution:**
- Check browser console for errors
- Clear Vite cache: `rm -rf node_modules/.vite`
- Restart dev server

---

**Issue:** Tests failing with "Cannot find module '@/...'"

**Solution:** Check `vitest.config.ts` has correct alias:

```typescript
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
  },
},
```

---

**Issue:** Build succeeds but preview shows blank page

**Solution:**
- Check browser console for errors
- Verify base path in `vite.config.ts`:
  ```typescript
  base: './', // For static hosting
  ```

---

## Resources

- **React Documentation:** https://react.dev
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/
- **Tailwind CSS:** https://tailwindcss.com/docs
- **Vite Guide:** https://vitejs.dev/guide/
- **Vitest:** https://vitest.dev
- **Playwright:** https://playwright.dev

---

## Support

- **GitHub Issues:** https://github.com/greatmindsinside/OptionsTradingTracker/issues
- **GitHub Discussions:** https://github.com/greatmindsinside/OptionsTradingTracker/discussions
- **Documentation:** See other docs in `docs/` folder
