# Options Trading Tracker 📈

![Build Status](https://img.shields.io/badge/tests-240%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

A comprehensive web application for tracking and analyzing options trading strategies, built with React, TypeScript, and Vite. Designed for individual traders who want professional-grade analytics without the subscription fees.

## ✨ Quick Start

```bash
# Clone the repository
git clone https://github.com/greatmindsinside/OptionsTradingTracker.git
cd OptionsTradingTracker

# Install dependencies
yarn install

# Start development server
yarn dev

# Open your browser to http://localhost:5173
```

## 🚀 Features

### 🧮 **Options Calculations Engine**

- **Covered Calls**: Break-even, max profit, return analysis, Greeks
- **Cash-Secured Puts**: Effective basis, assignment probability, risk metrics
- **Long Calls**: Intrinsic/time value, moneyness classification, P&L scenarios
- **Interactive Calculators**: Real-time updates with parameter changes

### 🎡 **Wheel Strategy Tracking**

- **Complete Lifecycle Management**: CSP → Assignment → CC → Close cycle tracking
- **Automated Trade Linking**: Intelligent detection and chaining of wheel components
- **Interactive Timeline**: Visual progression of wheel cycles with events and P&L
- **Performance Analytics**: ROO/ROR calculations, cycle metrics, portfolio aggregation
- **Management Dashboard**: Filter, search, and analyze wheel performance

### 💰 **Tax Lot Management**

- **Multiple Allocation Methods**: FIFO, LIFO, HIFO, LOFO lot tracking
- **Wash Sale Detection**: Automated 61-day wash sale identification and adjustment
- **Tax-Loss Harvesting**: Optimization recommendations and timing strategies
- **Cost Basis Tracking**: Accurate basis calculations with adjustment history

### 📊 **Advanced Analytics**

- **Portfolio Analysis**: Comprehensive P&L tracking and risk metrics
- **Performance Dashboards**: Interactive charts and KPI monitoring
- **Risk Management**: Position sizing and exposure analysis
- **Historical Tracking**: Time-series analysis of strategy performance

### 🔧 **Data Management**

- **CSV Import/Export**: Multi-broker data import with normalization
- **SQLite Database**: Browser-based storage with OPFS persistence
- **Price Data Integration**: Historical tracking and real-time valuation
- **Backup/Restore**: Complete data export and import capabilities

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Database**: SQLite-WASM with OPFS storage
- **Testing**: Vitest + Playwright + axe-core
- **Styling**: CSS Modules with CSS Variables
- **State**: Zustand for state management
- **Charts**: Recharts for data visualization

## 📋 Prerequisites

- Node.js 18+
- Yarn 4.7.0+ (with Corepack enabled)
- Git with SSH or HTTPS access to GitHub

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/greatmindsinside/OptionsTradingTracker.git
cd OptionsTradingTracker

# Install dependencies
yarn install

# Start development server
yarn dev

# Run tests
yarn test:all

# Build for production
yarn build
```

## 📁 Project Structure

```
src/
├── components/              # Reusable UI components
│   ├── Button/              # Component library with CSS modules
│   ├── CalculatorCard/      # Options strategy calculators
│   ├── ChartContainer/      # Chart wrapper with loading states
│   ├── GreeksChart/         # Greeks visualization
│   ├── LifecycleTimeline/   # Wheel cycle timeline visualization
│   ├── OptionsCalculator/   # Interactive strategy calculator
│   ├── PnLChart/           # Portfolio performance charts
│   ├── PortfolioSummary/   # Portfolio metrics dashboard
│   ├── PositionTracker/    # Individual position management
│   ├── RiskDashboard/      # Risk metrics and analysis
│   └── ThemeToggle/        # Dark/light theme switcher
├── contexts/               # React context providers
│   ├── theme.ts           # Theme configuration
│   └── ThemeContext.tsx   # Theme state management
├── hooks/                 # Custom React hooks
│   └── useTheme.ts       # Theme toggle functionality
├── modules/              # Core business logic
│   ├── calc/            # Options calculations engine
│   │   ├── cashSecuredPut.ts    # CSP strategy calculations
│   │   ├── coveredCall.ts       # CC strategy calculations
│   │   ├── longCall.ts          # Long call calculations
│   │   └── common.ts            # Shared calculation utilities
│   ├── csv/             # CSV import/export functionality
│   │   ├── parse.ts           # CSV parsing utilities
│   │   └── brokers/           # Broker-specific parsers
│   ├── db/              # Database layer
│   │   ├── sqlite.ts          # SQLite-WASM wrapper
│   │   ├── migrations.ts      # Database migrations
│   │   ├── query-helpers.ts   # Database query utilities
│   │   └── dao/               # Data access objects
│   ├── import/          # Data import pipeline
│   │   ├── BatchImportService.ts  # Bulk import processing
│   │   └── brokers/               # Broker adapters
│   ├── price/           # Price data management
│   │   └── adapters/          # Price data sources
│   ├── tax/             # Tax calculations
│   │   ├── lots.ts           # Tax lot management
│   │   ├── washSales.ts      # Wash sale detection
│   │   └── scheduleD.ts      # Tax reporting
│   └── wheel/           # Wheel strategy logic
│       ├── lifecycle.ts      # Cycle detection and linking
│       └── analytics.ts      # Performance calculations
├── pages/               # Page components
│   ├── HomePage.tsx         # Dashboard and overview
│   ├── ImportPage.tsx       # CSV import interface
│   ├── VisualizationPage.tsx # Charts and analytics
│   ├── PortfolioPage.tsx    # Portfolio management
│   ├── TaxPage.tsx          # Tax reporting
│   └── Wheel.tsx            # Wheel strategy dashboard
├── styles/              # Global styles and themes
│   ├── themes.css          # Theme variables
│   ├── base.css           # Base styles
│   ├── utilities.css      # Utility classes
│   └── accessibility.css # A11y improvements
├── utils/               # Utility functions
│   └── env.ts            # Environment configuration
└── workers/             # Web workers (future use)
```

│ └── WheelTimelineDemo.tsx # Demo components
├── pages/ # Route-level page components  
│ ├── Wheel.tsx # Wheel strategy management
│ ├── TaxPage.tsx # Tax lot management
│ ├── AnalysisPage.tsx # Options analysis
│ └── HomePage.tsx # Portfolio dashboard
├── modules/ # Business logic modules
│ ├── calc/ # Options calculations (✅ Complete)
│ │ ├── common.ts # Shared utilities & Greeks
│ │ ├── coveredCall.ts # Covered Call calculator
│ │ ├── cashSecuredPut.ts # Cash-Secured Put calculator
│ │ ├── longCall.ts # Long Call calculator
│ │ └── index.ts # Module exports
│ ├── wheel/ # Wheel strategy system (✅ Complete)
│ │ ├── lifecycle.ts # State machine and enums
│ │ ├── engine.ts # Cycle detection logic
│ │ ├── analytics.ts # Performance calculations
│ │ └── index.ts # Module exports
│ ├── tax/ # Tax management (✅ Complete)
│ │ ├── lot-manager.ts # Tax lot allocation engine
│ │ ├── wash-sales.ts # Wash sale detection
│ │ └── index.ts # Module exports
│ ├── price/ # Price data system (🚧 In Progress)
│ │ ├── manager.ts # Price data coordination
│ │ ├── adapters/ # Data source adapters
│ │ └── storage.ts # Price history storage
│ ├── db/ # Database operations (✅ Complete)
│ │ ├── sqlite.ts # SQLite-WASM integration
│ │ ├── migrations/ # Database migrations
│ │ └── validation.ts # Schema validation
│ └── import/ # CSV import system
│ ├── batch-import.ts # Import orchestration  
│ ├── broker-adapters/ # Broker-specific parsers
│ └── csv-parser.ts # Core CSV parsing
├── utils/ # Utility functions
└── workers/ # Web Workers for calculations

tests/
├── unit/ # Unit tests (Vitest) - 240 tests ✅  
│ ├── modules/ # Business logic tests
│ │ ├── calc/ # Options calculations
│ │ ├── db/ # Database operations
│ │ ├── tax/ # Tax calculations
│ │ ├── wheel/ # Wheel strategy logic
│ │ └── price/ # Price data management
│ ├── components/ # React component tests
│ └── integration/ # Integration tests
├── e2e/ # End-to-end tests (Playwright) - 20 tests ✅
│ ├── workflows/ # Complete user journeys
│ └── accessibility/ # A11y compliance tests
├── fixtures/ # Test data and mocks
│ ├── csv/ # Sample CSV files
│ └── mocks/ # Mock implementations
└── setup.ts # Test configuration

## 📚 User Guide

### 🔄 Getting Started with CSV Import

1. **Navigate to Import Page**: Click "Import Data" from the main navigation
2. **Upload CSV File**: Drag and drop or click to select your broker's CSV export
   - **Supported Brokers**: Robinhood, TD Ameritrade, Schwab, E\*TRADE, IBKR
3. **Review Data**: Preview parsed trades and verify accuracy
4. **Import**: Click "Import" to process data into your portfolio

### 🎡 Tracking Wheel Strategies

1. **Automatic Detection**: The system automatically identifies wheel cycles:
   - Cash-Secured Put → Assignment → Covered Call → Close
2. **Manual Linking**: Use the Wheel page to manually link related trades
3. **Analytics**: View cycle performance, ROO/ROR, and timeline visualization

### 💰 Tax Lot Management

1. **Configuration**: Choose your preferred lot selection method (FIFO/LIFO/etc.)
2. **Wash Sale Detection**: Automatically flags potential wash sales
3. **Tax Reports**: Generate Schedule D compatible reports

### 📊 Analysis and Visualization

1. **Portfolio Dashboard**: Overview of positions, P&L, and risk metrics
2. **Strategy Calculators**: Interactive tools for covered calls, CSPs, and long calls
3. **Performance Charts**: Historical P&L, Greeks evolution, and risk analysis

## 🧪 Testing

Our comprehensive test suite ensures reliability and maintainability:

```bash
# Run all tests
yarn test:all

# Unit tests only
yarn test:unit

# Component tests
yarn test:component

# E2E tests
yarn test:e2e

# Watch mode for development
yarn test:watch

# Coverage report
yarn test:coverage
```

### Test Statistics

- **240 unit tests** - 100% passing ✅
- **20 E2E tests** - Complete workflow coverage ✅
- **95%+ code coverage** across all modules
- **Accessibility testing** with axe-core integration

## 🚀 Deployment

### Development Server

```bash
yarn dev --port 5173
```

### Production Build

```bash
# Build optimized production bundle
yarn build

# Preview production build locally
yarn preview

# Serve static files
npx serve dist/
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

Upload the `dist/` folder to any static hosting provider:

- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting
- Surge.sh

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Application Info
VITE_APP_TITLE="Options Trading Tracker"
VITE_APP_VERSION="1.0.0"

# Database Configuration
VITE_DB_NAME="options_tracker"
VITE_DB_VERSION="1"

# Feature Flags
VITE_ENABLE_DEBUG_MODE="true"
VITE_ENABLE_ANALYTICS="false"
VITE_ENABLE_PERFORMANCE_MONITORING="false"

# CSV Import Limits
VITE_MAX_FILE_SIZE_MB="50"

# Chart Configuration
VITE_CHART_THEME="light"
VITE_CHART_ANIMATION_DURATION="300"
```

### Database Storage

- **Browser Storage**: Uses OPFS (Origin Private File System) for persistence
- **Export/Import**: Full database backup and restore capabilities
- **Migration System**: Automatic schema updates between versions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Test** your changes: `yarn test:all`
4. **Commit** with conventional commits: `git commit -m 'feat: add amazing feature'`
5. **Push** to your fork: `git push origin feature/amazing-feature`
6. **Open** a Pull Request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Automatic code formatting
- **Tests**: Required for all new features
- **Coverage**: Maintain >90% test coverage

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check our [Wiki](https://github.com/greatmindsinside/OptionsTradingTracker/wiki)
- **Issues**: [GitHub Issues](https://github.com/greatmindsinside/OptionsTradingTracker/issues)
- **Discussions**: [GitHub Discussions](https://github.com/greatmindsinside/OptionsTradingTracker/discussions)

## 🗺️ Roadmap

- [ ] **PWA Support**: Offline functionality and app installation
- [ ] **Mobile App**: React Native companion app
- [ ] **Advanced Analytics**: Machine learning insights
- [ ] **Multi-Broker Sync**: Direct API integrations
- [ ] **Social Features**: Share strategies and analysis
- [ ] **Plugin System**: Custom calculation modules

## 🙏 Acknowledgments

- **SQLite-WASM**: For browser-based database functionality
- **Recharts**: For beautiful, responsive charts
- **Vite**: For lightning-fast development experience
- **Playwright**: For reliable end-to-end testing

---

Built with ❤️ by traders, for traders. Happy trading! 📈

````

## 🔄 Git Workflow

We follow a strict Git workflow to ensure code quality and prevent bugs.

### Branch Naming Convention

- `feat/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `docs/update-name` - Documentation updates
- `test/test-name` - Test additions/updates
- `refactor/refactor-name` - Code refactoring
- `chore/task-name` - Maintenance tasks

### Development Workflow

```bash
# 1. Start from updated master
git checkout master
git pull origin master

# 2. Create feature branch
git checkout -b feat/your-feature-name

# 3. Make changes and test locally
yarn lint          # Must pass
yarn format        # Must pass
yarn test:all      # Must pass
yarn build         # Must pass

# 4. Commit with conventional commits
git add .
git commit -m "feat: descriptive commit message"
# Pre-commit hooks automatically run full test suite

# 5. Push and create PR
git push -u origin feat/your-feature-name
# Create PR in GitHub UI

# 6. After approval and CI passes, squash merge
# 7. Clean up branch
git checkout master && git pull
git branch -d feat/your-feature-name
````

### Pre-commit Hooks

Every commit automatically runs:

- ESLint (code quality)
- Prettier (code formatting)
- TypeScript type checking
- Full test suite (unit + e2e + accessibility)

## 🧪 Testing

**Current Status: 150+ tests passing** 🎉

We use a comprehensive test pyramid covering all major functionality:

### **Test Categories**

- **📊 Options Calculations**: Complete test coverage for all strategies
- **🎡 Wheel Lifecycle**: State machine transitions and trade linking
- **💰 Tax Lot Management**: FIFO/LIFO allocation and wash sale detection
- **🔢 Price Data**: Adapter functionality and data validation
- **🗄️ Database**: Schema validation and query operations
- **⚛️ React Components**: UI behavior and accessibility

```bash
# Unit tests (fast, isolated)
yarn test:unit

# Component tests (React Testing Library)
yarn test:unit --testNamePattern="Component"

# End-to-end tests (full user workflows)
yarn test:e2e

# Accessibility tests (WCAG compliance)
yarn test:a11y

# Run all tests with coverage
yarn test:coverage

# Interactive test UI (Vitest UI)
yarn test:ui

# Run specific module tests
yarn test:unit src/modules/wheel
yarn test:unit src/modules/tax
yarn test:unit src/modules/calc
```

### **Test Coverage Highlights**

- ✅ **Options Calculations**: 100% coverage with edge cases
- ✅ **Wheel Analytics**: Complete ROO/ROR calculation validation
- ✅ **Tax Lot Engine**: All allocation methods and wash sale scenarios
- ✅ **Database Operations**: Schema migrations and data integrity
- ✅ **Component Rendering**: UI components with accessibility checks

## 📦 Scripts

| Script           | Description               |
| ---------------- | ------------------------- |
| `yarn dev`       | Start development server  |
| `yarn build`     | Build for production      |
| `yarn preview`   | Preview production build  |
| `yarn lint`      | Run ESLint                |
| `yarn format`    | Format code with Prettier |
| `yarn typecheck` | TypeScript type checking  |
| `yarn test:all`  | Run complete test suite   |
| `yarn test:unit` | Run unit tests            |
| `yarn test:e2e`  | Run E2E tests             |
| `yarn test:a11y` | Run accessibility tests   |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Follow our coding standards (ESLint + Prettier)
4. Write tests for new functionality
5. Ensure all tests pass (`yarn test:all`)
6. Create a Pull Request

### Code Style

- Use TypeScript strict mode
- Follow ESLint rules (no warnings allowed)
- Use Prettier for formatting
- Write JSDoc comments for complex functions
- Use semantic naming conventions

### Pull Request Guidelines

- Fill out the PR template completely
- Ensure CI checks pass
- Request review from maintainers
- Squash commits before merging
- Delete branch after merge

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📚 [Documentation](./docs/)
- 🐛 [Issue Tracker](https://github.com/greatmindsinside/OptionsTradingTracker/issues)
- 💬 [Discussions](https://github.com/greatmindsinside/OptionsTradingTracker/discussions)

## 🏗️ Project Status

- ✅ **Phase 0**: Project Setup (Complete)
- ✅ **Phase 1**: Database & Schema (Complete)
- ✅ **Phase 2**: CSV Import/Export (Complete)
- ✅ **Phase 3**: Portfolio Analysis (Complete)
- ✅ **Phase 4**: Core Calculations (Complete)
- �️ **Phase 5**: User Interface Components (Next)

### Recently Completed - Phase 4: Core Calculations

**Major Achievement:** Complete options calculation engine with 97 tests passing!

**New Features:**

- 🧮 **Covered Call Calculator**: Break-even, max profit, return on outlay
- 💰 **Cash-Secured Put Calculator**: Effective basis, assignment probability
- 📈 **Long Call Calculator**: Intrinsic/time value, moneyness classification
- ⚠️ **Risk Analysis System**: Automated risk flagging and thresholds
- 🔢 **Greeks Approximations**: Delta, theta, gamma calculations
- 🎯 **Interactive Demo**: Browser-tested calculation showcase

**Technical Implementation:**

- 31 new unit tests added (comprehensive calculation coverage)
- Modular calculation engine (`src/modules/calc/`)
- Type-safe interfaces with Zod-style validation
- Real-time calculation updates in browser demo
- Risk assessment with configurable thresholds

---

**Built with ❤️ for options traders by traders**
