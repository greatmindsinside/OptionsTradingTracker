# Changelog

All notable changes to the Options Trading Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Price data integration framework (in progress)
- Options chain integration planning
- Portfolio risk analytics framework

## [0.8.0] - 2025-10-25

### Added

- **Tax Lot Management System**
  - Complete tax lot allocation engine with FIFO/LIFO/HIFO/LOFO methods
  - Automated wash sale detection within 61-day periods
  - Tax-loss harvesting recommendations with timing optimization
  - Comprehensive tax management dashboard with filtering and export
  - Cost basis tracking with adjustment history
- **Price Data Integration** (Phase 1)
  - Multi-source price adapter framework
  - Historical price tracking and storage system
  - Manual price entry interface
  - Price history validation and cleanup
- **Enhanced Documentation**
  - Updated README with current feature set
  - Comprehensive test coverage documentation
  - Updated project roadmap and status

### Changed

- Improved tax optimization algorithms for better recommendations
- Enhanced error handling in price data adapters
- Updated test coverage to 150+ tests across all modules

### Fixed

- Edge case handling in tax lot allocation when quantities are zero
- Price data subscription cleanup to prevent memory leaks
- TypeScript type safety improvements across tax and price modules

## [0.7.0] - 2025-10-24

### Added

- **Wheel Analytics Dashboard**
  - Comprehensive ROO (Return on Options) and ROR (Return on Risk) calculations
  - Performance metrics aggregation across portfolio
  - Advanced analytics with win rates, cycle duration analysis
  - KPI dashboard with visual performance indicators
  - Cycle comparison and filtering capabilities
- **Enhanced Wheel Management**
  - Tabbed interface combining cycle management with analytics
  - Performance trend analysis
  - Risk metrics calculation (max capital at risk, margin efficiency)
  - Portfolio-level wheel strategy aggregation

### Changed

- Improved wheel analytics calculation engine performance
- Enhanced UI with professional dashboard layout
- Better error handling for edge cases in analytics

### Fixed

- Analytics calculations for empty cycle collections
- Memory optimization in large dataset processing
- TypeScript strict mode compliance across analytics modules

## [0.6.0] - 2025-10-23

### Added

- **Complete Wheel Strategy Tracking System**
  - Full lifecycle state machine (CSP_OPEN → CSP_ASSIGNED → CC_OPEN → CC_CLOSED/CC_ASSIGNED)
  - Automated wheel cycle detection from imported trade data
  - Intelligent trade linking across CSV imports
  - Lifecycle event logging and state transition validation
- **Interactive Timeline Visualization**
  - Complete `LifecycleTimeline` React component
  - Visual wheel progression with events, dates, and P&L tracking
  - Responsive timeline design with status indicators
  - Multiple view modes (full, compact, minimal)
- **Wheel Management Interface**
  - Professional `/wheel` page with comprehensive cycle management
  - Real-time filtering and search capabilities
  - Interactive cycle cards with expandable detailed views
  - Summary statistics dashboard with key metrics
- **Database Integration**
  - Complete wheel-specific schema with migrations
  - Efficient wheel cycle queries with pagination support
  - Event logging system for audit trails

### Changed

- Enhanced database schema to support complex wheel lifecycle tracking
- Improved CSV import pipeline to detect and link wheel trades
- Better error handling and validation throughout wheel system

### Fixed

- TypeScript compilation errors in import modules
- Promise handling in CSV parsing operations
- Database query optimization for large wheel datasets

## [0.5.0] - 2025-10-20

### Added

- **Core Options Calculations Engine**
  - Comprehensive covered call calculator with break-even analysis
  - Cash-secured put calculator with assignment probability
  - Long call calculator with intrinsic/time value breakdown
  - Greeks approximations (Delta, Theta, Gamma) for risk analysis
  - P&L scenario analysis across price ranges
- **Interactive Calculator Components**
  - Real-time calculation updates with parameter changes
  - Professional UI with input validation
  - Educational tooltips and explanation text
  - Responsive design for mobile and desktop
- **Risk Analysis Framework**
  - Automated risk threshold monitoring
  - Position sizing recommendations
  - Greeks-based risk metrics
  - Moneyness classification system

### Changed

- Improved calculation accuracy with edge case handling
- Enhanced UI responsiveness and user experience
- Better error messages and input validation

## [0.4.0] - 2025-10-15

### Added

- **Database Foundation**
  - SQLite-WASM integration with sql.js-httpvfs
  - Complete normalized database schema
  - Migration system with version control
  - Type-safe database operations with Zod validation
  - OPFS storage with IndexedDB fallback
- **Data Models**
  - Portfolio, trades, positions, and analytics tables
  - Wheel cycle tracking schema
  - Tax lot management tables
  - Comprehensive foreign key relationships
- **Query System**
  - Type-safe query helpers and DAOs
  - Efficient indexing for performance
  - Transaction support for data integrity

### Changed

- Migrated from planning to implementation phase
- Established robust data layer foundation
- Implemented comprehensive validation system

## [0.3.0] - 2025-10-10

### Added

- **Project Foundation**
  - Vite + React + TypeScript project setup
  - Tailwind CSS integration with custom design system
  - Comprehensive folder structure and conventions
  - ESLint, Prettier, and Husky pre-commit hooks
- **Testing Framework**
  - Vitest unit testing setup
  - Playwright E2E testing configuration
  - axe-core accessibility testing integration
  - Test fixtures and utilities
- **Development Tools**
  - Hot module replacement for fast development
  - TypeScript strict mode configuration
  - Git workflow with conventional commits
  - Automated CI/CD pipeline setup

### Changed

- Established development standards and practices
- Created comprehensive tooling ecosystem
- Implemented quality gates and automation

## [0.2.0] - 2025-10-05

### Added

- **Project Planning & Architecture**
  - Comprehensive development plan with 11 phases
  - Technical architecture decisions
  - Database schema design
  - UI/UX wireframes and component planning
  - Risk analysis and mitigation strategies

### Changed

- Finalized technology stack decisions
- Established project timeline and milestones
- Created detailed acceptance criteria for all phases

## [0.1.0] - 2025-10-01

### Added

- **Initial Project Conception**
  - Core requirements analysis
  - Feature specification and scope definition
  - Technology research and evaluation
  - Initial repository setup and documentation

---

## Release Notes

### Major Features by Version

- **v0.8.0**: Tax optimization and price data integration
- **v0.7.0**: Advanced wheel analytics and performance tracking
- **v0.6.0**: Complete wheel strategy lifecycle management
- **v0.5.0**: Core options calculations and risk analysis
- **v0.4.0**: Database foundation and data modeling
- **v0.3.0**: Development environment and testing framework
- **v0.2.0**: Project architecture and planning
- **v0.1.0**: Initial conception and requirements

### Upcoming Releases

- **v0.9.0**: Options chain integration and strategy planning
- **v1.0.0**: Portfolio risk analytics and advanced dashboards
- **v1.1.0**: Trade execution interface and broker integration
- **v1.2.0**: PWA features and offline capabilities
