# Spec Driven Development with Playwright

**Scope:** `docs/tasks/**`, `docs/decisions/**`, `docs/reference/**`, `src/**`, `apps/**`, `packages/**`, `tests/e2e/**`

## Precedence

**This rule takes precedence over other rules when:**

- A task file is open under `docs/tasks/`
- E2E test-driven development is being used
- The workflow involves writing Playwright tests before implementation

For E2E tests, this rule's test-first workflow supersedes general task execution rules. See `.cursor/rules/docs.rules.md` and `.cursor/rules/project.md` for general task and project guidelines.

## Intent

Use a short written spec as the source of truth. Turn acceptance criteria into Playwright end-to-end checks first. Write code only to satisfy those checks.

## Workflow

### When a Task File is Open Under `docs/tasks/`

1. **Restate the objective** in one sentence.
2. **Parse the spec:**
   - Extract Objective, Contract (or derive from Related Files/Constraints/Implementation Notes), and Acceptance Criteria
   - Contract can be explicit (dedicated section) or implicit (in Related Files, Constraints, or Implementation Notes)
   - If Objective or Acceptance Criteria are missing, propose minimal edits to the spec and stop
   - If Contract cannot be derived, propose adding it explicitly or extracting from existing sections
   - Do not proceed until the spec is complete
3. **Create or update tests:**
   - For each acceptance criterion, create or update a test at `tests/e2e/<issue_slug>.spec.ts`
   - Map each test title directly to one acceptance criterion
4. **Run tests to confirm they fail:**
   - Execute `npx playwright test tests/e2e/<issue_slug>.spec.ts`
   - Verify all new tests fail for the expected reason
5. **Propose the smallest code change:**
   - Make only the current failing test pass
   - Return diffs showing exact changes
   - Do not implement features beyond what the test requires

## Test Authoring Rules

### Test Structure

- **One test per acceptance criterion** - Map each test title to exactly one acceptance criterion
- **Descriptive test names** - Test title should clearly state what is being verified
- **Use issue slug for filename** - `tests/e2e/<issue_slug>.spec.ts` where slug is derived from task filename

### Locators

- **Prefer stable locators in order:**
  1. `getByRole()` - Most accessible and stable
  2. `getByLabel()` - For form inputs
  3. `getByTestId()` - When semantic locators aren't sufficient
  4. `getByText()` - As fallback only
- **Avoid fragile selectors:**
  - No CSS selectors like `.class-name` or `#id`
  - No XPath unless absolutely necessary
  - No text content matching that could break with UI changes

### Waiting and Timing

- **Avoid sleeps** - Never use `page.waitForTimeout()` or `sleep()`
- **Wait on visible state:**
  - `expect(locator).toBeVisible()`
  - `expect(locator).toBeInViewport()`
- **Wait on URL changes:**
  - `expect(page).toHaveURL(/pattern/)`
- **Wait on network idle:**
  - `page.waitForLoadState('networkidle')`
  - `page.waitForResponse()` for specific API calls

### External Dependencies

- **Stub or route external calls** that would be flaky:
  - Use `page.route()` to intercept API calls
  - Mock responses with `route.fulfill()`
  - Avoid real external API calls in tests
- **Use fixtures** for test data from `tests/fixtures/`

### Test Organization

- **Group related tests** with `test.describe()` blocks
- **Use beforeEach/afterEach** for setup and cleanup
- **Keep tests independent** - Each test should be able to run in isolation

## Run Rules

### Retry Strategy

- **Retries: 2** - Configure in `playwright.config.ts`
- **Trace on first retry** - Enable trace for debugging
- **Keep video on failure** - Record video only when test fails

### Test Tagging

- **Tag tests appropriately:**
  - `@smoke` - Critical path tests for quick validation
  - `@regression` - Full regression suite
  - Use tags for selective test runs: `npx playwright test --grep @smoke`

### Local Testing Requirements

- **All tests must pass locally** with `npx playwright test` on a clean repo
- **No flaky tests** - Tests should be deterministic and stable
- **Fast feedback** - Tests should complete in reasonable time

## Output Format

Every run must include:

1. **One sentence objective** - Clear, concise statement of what we're building
2. **Exact file paths** - List all files to create or update with full paths
3. **Full contents** - Complete file contents for any new or changed files (no placeholders)
4. **Next three actions only** - Then stop and wait for approval

### Example Output Format

```
Objective: Add user authentication with email and password login.

Files to create/update:
- tests/e2e/auth-login.spec.ts
- src/pages/auth/LoginPage.tsx
- src/components/auth/LoginForm.tsx

[Full file contents here]

Next actions:
1. Run tests to verify they fail
2. Implement LoginForm component
3. Wire up LoginPage with routing
```

## Integration with Task Files

### Task File Requirements

Task files in `docs/tasks/` must include:

- **Objective** - One sentence describing the goal (required)
- **Contract** - API contract, component interface, or data structure (preferred explicit, but can be derived from Related Files/Constraints/Implementation Notes)
- **Acceptance Criteria** - List of specific, testable criteria (required, one per checkbox)

**Contract Extraction:**

- **Preferred:** Explicit "Contract" section with API endpoints, component interfaces, or data structures
- **Fallback:** Extract from "Related Files" (component/API names), "Constraints" (technical requirements), or "Implementation Notes" (API contracts, interfaces)
- If Contract cannot be determined, propose adding an explicit Contract section to the task file

### Example Task Structure

**With explicit Contract:**

```markdown
## Objective

Add user login functionality.

## Contract

- Component: `LoginPage` at `/login`
- API: `POST /api/auth/login` returns `{ token: string }`

## Acceptance Criteria

- [ ] User can enter email and password
- [ ] Form shows validation errors for invalid input
- [ ] Successful login redirects to dashboard
```

**With Contract in Related Files (fallback):**

```markdown
## Objective

Add user login functionality.

## Related Files

### Code Files to Create

- `src/pages/auth/LoginPage.tsx` - Login page component at `/login`
- `src/api/auth.ts` - API client with `login(email, password)` returning `{ token: string }`

## Acceptance Criteria

- [ ] User can enter email and password
- [ ] Form shows validation errors for invalid input
- [ ] Successful login redirects to dashboard
```

## Best Practices

### Test-First Development

- **Write tests before code** - Tests define the behavior
- **Make tests fail first** - Verify tests catch the right issues
- **Make tests pass** - Implement minimal code to pass
- **Refactor** - Improve code while keeping tests green

### Incremental Development

- **One acceptance criterion at a time** - Don't implement multiple features in one go
- **Smallest change possible** - Only add what's needed to pass the current test
- **Review after each test** - Get feedback before moving to next criterion

### Maintainability

- **Keep tests readable** - Clear test names and structure
- **Avoid test duplication** - Use helpers and fixtures
- **Update tests with code** - Tests are living documentation
