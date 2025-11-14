# Documentation Rules

**Scope:** `docs/**`

**Note:** When using E2E test-driven development with Playwright, the `.cursor/rules/spec_playwright.md` rule takes precedence for workflow and test creation. This rule provides general documentation standards that complement spec-driven development.

## Task File Rules

### When Reading Tasks

- **Always read the open task file first** - Primary context source
- **Read linked files only** - Don't pull entire codebase
- **Summarize in 50-100 words** - Brief context summary
- **List constraints explicitly** - Technical limitations
- **Reference only what's needed** - Keep context tight

### Task Structure

- **One objective per task** - Single, clear purpose
- **Objective in one sentence** - At the top (required)
- **Context section** - Why this task exists
- **Constraints section** - What can't be changed
- **Contract section** - Optional: API contract, component interface, or data structure (recommended for spec-driven development; see `.cursor/rules/spec_playwright.md`)
- **Acceptance criteria** - Checkbox format (required)
- **Related files** - Links to code files
- **Next actions** - Maximum 2-3 steps

**Contract Note:** For spec-driven development with Playwright, an explicit Contract section is preferred. If not present, Contract can be derived from Related Files, Constraints, or Implementation Notes. See `.cursor/rules/spec_playwright.md` for details.

### Content Length

- **Keep tasks under 200 lines** - If longer, create part_2
- **Link to reference docs** - Don't duplicate long content
- **Use ADRs for decisions** - Link, don't explain
- **Reference code files** - Don't paste code

## Planning Rules

### Plan Mode Behavior

- **Read only open task** - Plus explicitly linked files
- **Reference ADRs** - When decisions are needed
- **Link to code files** - For context, not full content
- **Propose 2-3 steps max** - Small, actionable steps
- **Include file paths** - For all new files
- **Full content for new files** - No placeholders

### Plan Structure

- **Step 1: [Action]** - First concrete step
- **Step 2: [Action]** - Second step
- **Step 3: [Action]** - Third step (optional)
- **File paths** - Exact paths for new files
- **Test requirements** - What to test

## Documentation Standards

### ADRs (Architecture Decision Records)

- **Decision in title** - Clear statement
- **Status** - Proposed, Accepted, Deprecated, Superseded
- **Context** - Why this decision
- **Decision** - What was decided
- **Consequences** - Pros and cons
- **Link from tasks** - When decision applies

### Reference Documents

- **Long-form content** - Detailed specifications
- **Link from tasks** - Don't duplicate
- **Keep updated** - Version with code changes
- **Indexable** - Cursor can search and index

### Task Templates

- **Use template** - `docs/templates/task-template.md`
- **Fill all sections** - Complete information
- **Number sequentially** - `001-`, `002-`, etc.
- **Update status** - In progress, completed, blocked

## Code References

### Linking to Code

- **Use relative paths** - `src/pages/wheel/WheelPage.tsx`
- **Reference specific functions** - `useWheelDatabase()` hook
- **Mention file purpose** - Brief context
- **Don't paste code** - Link instead

### Linking to Docs

- **Use relative paths** - `docs/decisions/001-backend-framework.md`
- **Reference sections** - `#decision` anchor links
- **Keep links updated** - If files move

## Task Execution

### Before Starting

- **Read task file** - Understand objective
- **Read linked ADRs** - Understand decisions
- **Read linked code files** - Understand context
- **Check constraints** - What can't change

### During Execution

- **Follow task steps** - In order, unless using spec-driven development workflow
- **For E2E test-driven development** - Follow `.cursor/rules/spec_playwright.md` workflow (parse spec → create tests → implement)
- **Update task status** - Mark progress
- **Add notes** - If issues arise
- **Link new files** - If created

### After Completion

- **Update acceptance criteria** - Check off items
- **Update task status** - Mark completed
- **Add completion notes** - What was done
- **Link to commits** - If applicable

## Context Management

### Keep Context Tight

- **Only open task** - Primary context
- **Only linked files** - Explicit references
- **No codebase search** - Unless task requires
- **No unrelated files** - Stay focused

### When Context Grows

- **Split task** - Create part_2
- **Create sub-tasks** - Break down further
- **Link to reference** - Move details there
- **Summarize** - Don't duplicate

## File Naming

### Tasks

- **Format:** `001-task-name.md` - Sequential number
- **Descriptive names** - Clear purpose
- **Lowercase with hyphens** - `001-backend-setup.md`

### ADRs

- **Format:** `001-decision-name.md` - Sequential number
- **Decision in name** - `001-backend-framework.md`
- **Lowercase with hyphens** - Consistent format

### Reference

- **Format:** `topic-name.md` - Descriptive
- **Lowercase with hyphens** - `migration-plan.md`
- **Group by topic** - Related files together
