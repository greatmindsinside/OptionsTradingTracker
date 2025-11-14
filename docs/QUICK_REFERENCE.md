# Quick Reference

Common commands and workflows for Options Trading Tracker development.

---

## 🚀 Getting Started

```bash
# Clone and setup
git clone https://github.com/greatmindsinside/OptionsTradingTracker.git
cd OptionsTradingTracker
yarn install

# Start dev server
yarn dev
# → http://localhost:5173
```

---

## 📝 Development Commands

```bash
# Development
yarn dev              # Start dev server with HMR
yarn typecheck        # Check TypeScript types
yarn lint             # Run ESLint
yarn lint:fix         # Fix lint errors
yarn format           # Format code with Prettier

# Testing
yarn test             # Run unit tests
yarn test:watch       # Watch mode
yarn test:coverage    # Coverage report
yarn test:e2e         # E2E tests with Playwright
yarn test:e2e:ui      # E2E interactive mode

# Build
yarn build            # Production build
yarn preview          # Preview production build

# All checks
yarn validate         # Lint + typecheck + test
```

---

## 🎨 Feature Flags

Enable features in `.env.local`:

```env
# Journal editing
VITE_FEATURE_JOURNAL_EDIT_DRAWER=true
VITE_FEATURE_JOURNAL_EDIT_FLOW=true

# Trade DTE picker
VITE_FEATURE_TRADE_DTE=true

# Development
VITE_ENABLE_DEBUG_MODE=true
VITE_ENABLE_ANALYTICS=false
```

---

## 🗂️ File Structure

```
src/
├── pages/           # Route pages
│   ├── wheel/       # Dashboard (/)
│   └── journal/     # Journal (/journal)
├── components/      # Reusable UI
│   ├── Button/      # CVA button
│   └── ui/          # Input, Modal, Select
├── stores/          # Zustand state
├── hooks/           # Custom hooks
├── utils/           # Utilities
│   ├── dates.ts     # DTE calculations
│   ├── env.ts       # Feature flags
│   └── telemetry.ts # Event tracking
└── modules/         # Business logic
```

---

## 🔧 Common Tasks

### Add a new feature flag

1. Add to `.env.example` and `.env.local`
2. Parse in `src/utils/env.ts`:
   ```typescript
   features: {
     myFeature: parseBool(import.meta.env.VITE_FEATURE_MY_FEATURE, false),
   }
   ```
3. Use in component:
   ```typescript
   import { env } from '@/utils/env';
   if (env.features.myFeature) {
     /* ... */
   }
   ```

### Add telemetry event

1. Add event name to `src/utils/telemetry.ts`:
   ```typescript
   export type TelemetryEventName = 'existing_event' | 'my_new_event';
   ```
2. Track in component:
   ```typescript
   import { track } from '@/utils/telemetry';
   track('my_new_event', { prop: 'value' });
   ```

### Create a new component

```typescript
// src/components/MyComponent/MyComponent.tsx
interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div className="p-4">
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
};
```

### Add unit test

```typescript
// tests/unit/myUtil.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '@/utils/myUtil';

describe('myFunction', () => {
  it('returns expected result', () => {
    expect(myFunction('input')).toBe('output');
  });
});
```

### Add E2E test

```typescript
// tests/e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test('feature works correctly', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /submit/i }).click();
  await expect(page.getByText('Success')).toBeVisible();
});
```

---

## 🐛 Troubleshooting

### TypeScript errors after pull

```bash
# Reinstall dependencies
rm -rf node_modules yarn.lock
yarn install

# Restart VS Code TypeScript server
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### HMR not working

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Restart dev server
yarn dev
```

### Tests failing locally

```bash
# Clear test cache
yarn test --clearCache

# Update snapshots if needed
yarn test -u
```

### Build fails but dev works

```bash
# Check for dynamic imports or env vars
yarn build --debug

# Verify vite.config.ts base path
```

---

## 📖 Documentation

- **Features:** `docs/FEATURES.md`
- **Development:** `docs/DEVELOPMENT.md`
- **Architecture:** `docs/DATA_ARCHITECTURE.md`
- **Changelog:** `docs/CHANGELOG.md`

---

## 🔗 Links

- **GitHub:** https://github.com/greatmindsinside/OptionsTradingTracker
- **Issues:** https://github.com/greatmindsinside/OptionsTradingTracker/issues
- **Discussions:** https://github.com/greatmindsinside/OptionsTradingTracker/discussions
