# Phase 0: Project Setup 🚀

## Goals

- Bootstrap Vite + React + TypeScript foundation
- Establish file structure and development workflow
- Configure essential tooling and dependencies
- Set up Git repository and GitHub integration
- Ensure proper version control from project start

## Inputs

- Requirements specification
- Technology stack decisions
- GitHub account for repository hosting

## Outputs

- Runnable development environment
- Project scaffold with proper structure
- Package.json with all dependencies
- Development and build scripts
- Git repository with GitHub remote
- Initial commit with project foundation

## Tasks Checklist

### Project Initialization

- [ ] Initialize Git repository (`git init`)
- [ ] Create `.gitignore` for Node.js/React projects
- [ ] Initialize Vite + React + TypeScript project
- [ ] Install core dependencies (React, TypeScript, Vite)
- [ ] Install data processing deps (Papa Parse, sql.js/wa-sqlite, zod)
- [ ] Install UI deps (Recharts/Chart.js, styling solution)
- [ ] Install state management (Zustand or Redux Toolkit)

### Development Tooling

- [ ] Install development dependencies (ESLint, Prettier, Vitest)
- [ ] Install testing framework dependencies (Vitest, React Testing Library, Playwright, axe-core)
- [ ] Configure ESLint with TypeScript and React rules
- [ ] Set up Prettier for consistent code formatting
- [ ] Configure test pyramid: unit/component/e2e/accessibility testing
- [ ] Set up development environment documentation (.vscode/settings.json, extensions.json)
- [ ] Configure TypeScript path mapping for cleaner imports
- [ ] Set up environment-specific configurations (dev/staging/prod)

### Advanced Tooling

- [ ] Add bundle analyzer for build optimization
- [ ] Configure source map generation for debugging
- [ ] Set up hot module replacement (HMR) for faster development
- [ ] Add performance monitoring setup (Web Vitals)
- [ ] Configure CSP (Content Security Policy) headers for security
- [ ] Set up Storybook for component development
- [ ] Add API documentation generation (TypeDoc)
- [ ] Configure debugging tools (Redux DevTools, React DevTools)
- [ ] Set up component performance profiling
- [ ] Add automated dependency vulnerability scanning

### Project Structure

- [ ] Create folder structure (/src/pages, /components, /modules, etc.)
- [ ] Create testing folder structure (/tests/unit, /tests/e2e, /tests/fixtures)
- [ ] Configure TypeScript (tsconfig.json, strict mode)
- [ ] Set up development scripts (dev, build, preview, test, lint, format)
- [ ] Add comprehensive testing scripts (test:unit, test:e2e, test:a11y, test:all)
- [ ] Create basic App.tsx with routing placeholder
- [ ] Set up React Router for navigation
- [ ] Configure path aliases (@/ for src/) in Vite and TypeScript
- [ ] Add environment variables setup (.env files)
- [ ] Create error boundary component for development
- [ ] Set up basic global styles and CSS architecture
- [ ] Add sample CSV files in /public/sample-csv

### Git Workflow & CI/CD

- [ ] Set up Git workflow and branch protection
- [ ] Configure pre-commit hooks with Husky (lint, format, test:all)
- [ ] Create branch naming conventions and PR templates
- [ ] Create GitHub repository (options-trading-tracker)
- [ ] Push initial commit to main and protect main branch
- [ ] Configure GitHub branch protection rules
- [ ] Set up README.md with Git workflow documentation
- [ ] Set up GitHub Actions for CI/CD with comprehensive test pipeline
- [ ] Create issue and PR templates for GitHub
- [ ] Configure Dependabot for dependency updates
- [ ] Test complete Git workflow: branch → all tests → PR → merge
- [ ] Add license file (MIT recommended for open source)
- [ ] Set up commit message conventions (Conventional Commits)

## Dependencies

- Node.js 18+ and yarn package manager
- GitHub account for repository hosting
- VS Code for development environment
- Git CLI tools properly configured
- Husky for Git hooks (automated)
- Playwright browsers for E2E testing
- Storybook for component development
- TypeDoc for API documentation

## Test Pyramid Strategy

- **Unit Tests (Vitest):** Pure functions, calculations, utilities, database operations
- **Component Tests (Vitest + React Testing Library):** React components, user interactions, state management
- **End-to-End Tests (Playwright):** Complete user workflows, CSV import → analysis → export
- **Accessibility Tests (axe-core + Playwright):** WCAG compliance, screen reader compatibility
- **Integration Tests:** Database + UI workflows, multi-component interactions

## Git Workflow Requirements

- **Branch Strategy:** Feature branches from main, no direct main commits
- **Branch Naming:** `feat/feature-name`, `fix/bug-name`, `docs/update-name`, `test/test-name`
- **Pre-commit Checks:** ESLint, Prettier, TypeScript compilation, full test suite
- **PR Requirements:** All checks pass, all tests pass, code review (if team), squash merge
- **Main Branch Protection:** Require PR, require status checks, require test passage, no force push

## Acceptance Tests

- [ ] ESLint catches common TypeScript/React issues
- [ ] Prettier formats code consistently on save
- [ ] VS Code provides proper IntelliSense and debugging
- [ ] Environment variables load correctly in development
- [ ] Path aliases resolve properly (@/components/...)
- [ ] Error boundaries catch and display development errors
- [ ] GitHub Actions CI passes on all PRs
- [ ] All yarn scripts work correctly (lint, format, test)
- [ ] Unit tests achieve >90% coverage on critical modules
- [ ] Component tests cover user interactions and edge cases
- [ ] E2E tests verify complete user workflows
- [ ] Accessibility tests pass WCAG AA standards
- [ ] Pre-commit hooks block commits with failing tests
- [ ] Cannot push directly to main branch (protection enabled)
- [ ] PR creation triggers comprehensive test pipeline
- [ ] Merge requires all tests (unit/component/e2e/a11y) to pass

## Risks & Mitigations

- **Risk:** Inconsistent code formatting across team/time
  - **Mitigation:** Prettier + ESLint integration, pre-commit hooks
- **Risk:** VS Code configuration inconsistencies
  - **Mitigation:** Workspace settings, recommended extensions file
- **Risk:** Environment variable management complexity
  - **Mitigation:** Clear .env examples, documentation in README
- **Risk:** CI/CD pipeline failures
  - **Mitigation:** Start simple, test locally first, gradual complexity
- **Risk:** Developers bypassing Git workflow
  - **Mitigation:** Branch protection, pre-commit hooks, clear documentation
- **Risk:** Merge conflicts from parallel development
  - **Mitigation:** Small PRs, frequent rebasing, clear branching strategy
- **Risk:** Test suite becoming slow and blocking development
  - **Mitigation:** Fast unit tests, selective E2E runs, parallel execution
- **Risk:** Accessibility regressions going unnoticed
  - **Mitigation:** Automated axe-core testing, manual accessibility reviews

## Demo Script

See [setup-demo.sh](../scripts/setup-demo.sh) for complete project initialization script.

## Strict Git Workflow Protocol

```bash
# FOR EVERY CHANGE - NO EXCEPTIONS

# 1. Start from updated main
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feat/your-feature-name

# 3. Make changes and test locally
yarn lint    # Must pass
yarn format  # Must pass
yarn test:all # Must pass
yarn build   # Must pass

# 4. Commit with conventional commits
git add .
git commit -m "feat: descriptive commit message"
# Pre-commit hooks automatically run full test suite

# 5. Push branch and create PR
git push -u origin feat/your-feature-name
gh pr create --title "Your Feature" --body "Description"

# 6. Wait for CI checks, merge when green
gh pr merge --squash

# 7. Clean up
git checkout main && git pull
git branch -d feat/your-feature-name
```

## Status

⏳ **Not Started**

**Files Created:** _None yet_

**Next Step:** Initialize Vite project and install dependencies

**Next Phase:** [Phase 1 - Database & Schema](./phase-1-database.md)
