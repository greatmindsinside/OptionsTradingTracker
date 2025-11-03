# Project Organization

This document provides a complete, up-to-date view of the repository layout and what each folder is responsible for. Use it as a quick orientation guide when navigating the codebase.

Last updated: 2025-11-03 18:30

---

## Top-level layout

```
.
├─ .github/                 # CI, issue templates, workflows
├─ .husky/                  # Git hooks
├─ .vscode/                 # Editor settings & recommendations
├─ dist/                    # Production build output (generated)
├─ docs/                    # Documentation (architecture, reports, troubleshooting)
├─ node_modules/            # Installed dependencies
├─ public/                  # Static assets served as-is
├─ scripts/                 # Maintenance & one-off scripts
├─ src/                     # Application source code (React + TS)
├─ tests/                   # Unit + E2E test suites
├─ playwright-report/       # Playwright HTML reports (generated)
├─ test-results/            # Playwright trace/snapshots (generated)
├─ index.html               # Vite entry HTML
├─ package.json             # Package manifest (workspaces, scripts)
├─ tailwind.config.js       # Tailwind token mapping / theme
├─ vite.config.ts           # Vite configuration
├─ vite.config.perf.ts      # Perf profiling build (optional)
├─ tsconfig*.json           # TypeScript configs
└─ yarn.lock                # Dependency lockfile
```

---

## docs/

```
docs/
├─ CSS_ARCHITECTURE_IMPLEMENTATION.md   # CSS design system & progress
├─ DATA_ARCHITECTURE.md                 # Data model & storage plan
├─ CLEANUP_COMPLETION_REPORT.md         # Code cleanup completion summary
├─ PROJECT_ORGANIZATION.md              # (this file) full project tree
├─ reports/                             # Point-in-time technical reports
│  ├─ MODAL_TABLE_PATTERN_MIGRATION.md
│  └─ PHASE_3_COMPONENT_MIGRATIONS.md
├─ troubleshooting/                     # Known issues & fixes
└─ complete/                            # Archived docs (finished streams)
```

---

## public/

```
public/
├─ manifest.json        # PWA manifest
├─ sw.js                # Service worker (offline support)
├─ offline.html         # Offline fallback page
├─ sql-wasm.wasm        # SQLite WASM binary
├─ icons/               # PWA icons & favicons
└─ sample-csv/          # Example import files for testing
```

---

## src/ (application)

```
src/
├─ App.tsx              # App shell & routes
├─ main.tsx             # React entry point
├─ index.css            # Single source of truth (tokens + patterns)
├─ assets/              # Local images/fonts/etc.
├─ components/          # Reusable UI building blocks
│  ├─ Button/           # CVA-based button component
│  ├─ ThemeToggle/      # Dark/light theme toggle
│  ├─ ui/               # UI primitives (Input, Modal, Select)
│  ├─ EditEntryForm.tsx # Journal editor form
│  ├─ ErrorBoundary.tsx # Error boundary wrapper
│  ├─ (legacy, unused)  # CalculatorCard/, StrategySelector/, ResultsDisplay/,
│  │                    # PortfolioSummary/, InputGroup/ — kept for reference
│  └─ (note)            # Legacy folders exist but are not referenced in app
├─ contexts/            # React context providers
├─ db/                  # Client-side DB utilities / glue
├─ hooks/               # Custom React hooks
├─ lib/                 # Generic libraries/helpers
├─ models/              # Type-centric models/entities
├─ modules/             # Core business logic (domain modules)
│  ├─ calc/             # Options math & shared utilities
│  ├─ csv/              # CSV parsing/normalization helpers
│  ├─ db/               # DB access & query helpers
│  ├─ import/           # Import pipeline services
│  ├─ price/            # Price adapters & helpers
│  ├─ tax/              # Tax calculations & wash-sale logic
│  └─ wheel/            # Wheel strategy engine & analytics
├─ pages/               # Route-level pages
│  ├─ wheel/            # WheelPage (root route)
│  ├─ journal/          # JournalPage (/journal)
│  └─ NotFoundPage.tsx  # 404 handler
├─ store/               # (deprecated) prefer stores/
├─ stores/              # Zustand stores (app state)
├─ styles/              # Global non-Tailwind CSS
│  └─ wheel-header.css  # Complex header animations (kept separate)
├─ types/               # Shared TypeScript types
├─ utils/               # Utilities (formatting, helpers)
└─ workers/             # Web workers (if/when used)
```

Notes:

- Components listed as legacy are present on disk but not used in the app. They can be archived or removed in a follow-up.
- Styling uses Tailwind v4 + consolidated `index.css` patterns; CSS Modules are minimal and only for edge cases.

---

## tests/

```
tests/
├─ unit/                # Vitest unit tests
├─ e2e/                 # Playwright end-to-end tests
├─ fixtures/            # Test data & mocks (e.g., CSVs)
└─ setup.ts             # Test runner setup & globals
```

---

## scripts/

```
scripts/
└─ generate-icons.js    # PWA icon generation helper
```

---

## How to navigate

- Start at `src/pages/` to find route entries.
- Dive into `src/components/` for building blocks and `src/modules/` for domain logic.
- Global styles live in `src/index.css` (tokens, base, utilities, component patterns).
- Static assets are under `public/`; anything imported from `src/assets/` is bundled.

If anything looks out-of-date or you want this exported as a visual sitemap, ping me and I’ll generate it.
