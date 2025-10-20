# Options Trading Tracker 📈

A comprehensive web application for tracking and analyzing options trading strategies, built with React, TypeScript, and Vite.

## 🚀 Features

- **CSV Import/Export**: Import trading data from multiple brokers
- **Portfolio Analysis**: Track P&L, Greeks, and risk metrics
- **Tax Optimization**: Calculate wash sales and tax implications
- **Wheel Strategy**: Specialized tools for wheel trading
- **Real-time Calculations**: Live options pricing and Greeks
- **Accessibility**: WCAG AA compliant interface

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
├── components/     # Reusable UI components
├── pages/          # Route-level page components
├── modules/        # Business logic modules
│   ├── calc/       # Options calculations
│   ├── csv/        # CSV import/export
│   ├── db/         # Database operations
│   ├── tax/        # Tax calculations
│   └── wheel/      # Wheel strategy tools
├── utils/          # Utility functions
└── workers/        # Web Workers for heavy calculations

tests/
├── unit/           # Unit tests (Vitest)
├── e2e/            # End-to-end tests (Playwright)
├── fixtures/       # Test data and fixtures
└── setup.ts        # Test configuration
```

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
```

### Pre-commit Hooks

Every commit automatically runs:

- ESLint (code quality)
- Prettier (code formatting)
- TypeScript type checking
- Full test suite (unit + e2e + accessibility)

## 🧪 Testing

We use a comprehensive test pyramid:

```bash
# Unit tests (fast, isolated)
yarn test:unit

# Component tests (React Testing Library)
yarn test:unit --testNamePattern="Component"

# End-to-end tests (full user workflows)
yarn test:e2e

# Accessibility tests (WCAG compliance)
yarn test:a11y

# Run all tests
yarn test:all

# Test with coverage
yarn test:coverage

# Interactive test UI
yarn test:ui
```

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
- 🏗️ **Phase 1**: Database & Schema (Next)
- 📋 **Phase 2**: CSV Import/Export
- 📊 **Phase 3**: Portfolio Analysis
- 💰 **Phase 4**: Tax Calculations
- 🎯 **Phase 5**: Wheel Strategy Tools

---

**Built with ❤️ for options traders by traders**
