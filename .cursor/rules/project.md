# Project Rules - Options Tracking Page

## Objective

Build a cloud-based, monetizable options trading tracker with React frontend and Node.js backend, migrating from browser-only SQLite to PostgreSQL with authentication and subscriptions.

## House Style

### TypeScript

- **Strict mode enabled** - Maximum type safety
- **No `any` types** - Use `unknown` or proper types
- **Explicit return types** - For public functions and components
- **Interface over type** - Prefer interfaces for object shapes

### React Patterns

- **Functional components only** - No class components
- **Hooks for state** - useState, useEffect, custom hooks
- **Zustand for global state** - No Redux
- **Component composition** - Small, focused components
- **Props interface** - Always define props interface

### Code Organization

- **Feature-based structure** - Group by feature, not by type
- **Co-locate tests** - Tests near source files
- **Barrel exports** - Use index.ts for clean imports
- **Single responsibility** - One purpose per file/function

### Naming Conventions

- **Components**: PascalCase (`TradeTab.tsx`)
- **Hooks**: camelCase with `use` prefix (`useWheelDatabase.ts`)
- **Utilities**: camelCase (`dates.ts`, `telemetry.ts`)
- **Types/Interfaces**: PascalCase (`JournalEntry`, `Position`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_FILE_SIZE_MB`)

## Test Posture

### Unit Tests (Vitest)

- **Test business logic** - Calculations, transformations, utilities
- **Test hooks** - Custom React hooks
- **Test components** - User interactions, rendering
- **Target: 80%+ coverage** - Focus on critical paths

### E2E Tests (Playwright)

- **Test user flows** - Complete workflows end-to-end
- **Test critical paths** - Login, trade entry, import
- **Cross-browser** - Chromium, Firefox, WebKit
- **Accessibility** - Use @axe-core/playwright
- **Test-first development** - When using spec-driven development, follow `.cursor/rules/spec_playwright.md` workflow (write E2E tests before implementation)

### Test Files

- **Co-locate** - `*.test.ts` or `*.test.tsx` next to source
- **E2E in tests/e2e/** - Separate directory for E2E
- **Fixtures in tests/fixtures/** - Shared test data

## Small Steps Policy

### Agent Execution Rules

- **Maximum 2-3 actions per Agent run** - Prevents context bloat
- **Stop after each logical unit** - Review before continuing
- **Always read task file first** - Context from `docs/tasks/`
- **Return full file paths** - For any new files created
- **Propose exact content** - Don't leave placeholders

### Task Workflow

1. Open task file from `docs/tasks/`
2. Read task + linked references only
3. **For E2E test-driven development:** Follow `.cursor/rules/spec_playwright.md` workflow (parse spec → create tests → implement)
4. **For general tasks:** Create plan with 2-3 concrete steps
5. Execute first 2-3 steps
6. Review changes
7. Commit if approved
8. Update task status
9. Move to next steps or next task

### Code Changes

- **One feature per commit** - Atomic commits
- **Meaningful commit messages** - Describe what and why
- **Test before commit** - Run relevant tests
- **E2E test-first** - When using spec-driven development, write E2E tests first (see `.cursor/rules/spec_playwright.md`)
- **No breaking changes** - Without migration path

## Documentation Standards

### Task Files (`docs/tasks/`)

- **One objective per task** - Clear, single purpose
- **50-100 word summary** - Brief context
- **List constraints** - Technical limitations
- **Acceptance criteria** - Checkbox format
- **Link to ADRs** - Reference decisions
- **Link to related files** - Code references

### ADRs (`docs/decisions/`)

- **Decision in title** - Clear statement
- **Context section** - Why this decision
- **Consequences** - Pros and cons
- **Status** - Proposed, Accepted, Deprecated

### Reference Docs (`docs/reference/`)

- **Long-form content** - Detailed specifications
- **Link from tasks** - Don't duplicate
- **Keep updated** - Version with code

## File Creation Rules

### New Files

- **Always propose full path** - `src/pages/auth/LoginPage.tsx`
- **Include full content** - No TODOs or placeholders
- **Follow existing patterns** - Match project style
- **Add to appropriate index** - Update barrel exports

### New Components

- **Create component file** - `ComponentName.tsx`
- **Create props interface** - `ComponentNameProps`
- **Add to component index** - If using barrel exports
- **Write tests** - Component and integration tests

## Error Handling

### Backend

- **Try-catch blocks** - All async operations
- **Error middleware** - Centralized error handling
- **Structured errors** - Consistent error format
- **Log errors** - With context and stack trace

### Frontend

- **Error boundaries** - Catch React errors
- **Toast notifications** - User-friendly error messages
- **Fallback UI** - Graceful degradation
- **Log to console** - In development only

## Security

### Authentication

- **JWT tokens** - Access + refresh tokens
- **HttpOnly cookies** - For refresh tokens
- **Password hashing** - bcrypt with salt rounds
- **Rate limiting** - On auth endpoints

### API Security

- **Input validation** - Zod schemas
- **SQL injection prevention** - Use ORM/parameterized queries
- **CORS configuration** - Restrict origins
- **HTTPS only** - In production

## Performance

### Frontend

- **Code splitting** - Route-based splitting
- **Lazy loading** - Heavy components
- **Memoization** - React.memo, useMemo, useCallback
- **Bundle size** - Monitor with build analyzer

### Backend

- **Database indexing** - On frequently queried columns
- **Connection pooling** - Reuse database connections
- **Response caching** - For read-heavy endpoints
- **Query optimization** - Avoid N+1 queries

## Migration Strategy

### Backward Compatibility

- **Support both modes** - Local and cloud
- **Feature flags** - Gradual rollout
- **Data export** - Always available
- **Migration tool** - User-friendly import

### Breaking Changes

- **Deprecation warnings** - Before removal
- **Migration guides** - Step-by-step instructions
- **Versioning** - API versioning for changes
