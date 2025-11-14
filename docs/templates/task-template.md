# Task: [Task Title]

**Task ID:** `[001-XXX]`  
**Status:** `[pending|in_progress|completed|blocked]`  
**Created:** [Date]  
**Assigned:** [Name/Team]

---

## Objective

[One sentence describing what this task accomplishes]

---

## Context

[50-100 word summary of why this task exists and what problem it solves]

**Related Epic:** [Link to epic or parent task]  
**Depends on:** [Task IDs that must complete first]  
**Blocks:** [Task IDs that depend on this]

---

## Constraints

- [Constraint 1 - e.g., "Must maintain backward compatibility"]
- [Constraint 2 - e.g., "Cannot break existing tests"]
- [Constraint 3 - e.g., "Must follow ADR-001 decision"]

---

## Contract

**Optional but recommended for spec-driven development.** Defines the technical interface: API contracts, component interfaces, or data structures.

Examples:

- **Component:** `LoginPage` at `/login` with props `{ onSubmit: (email: string, password: string) => Promise<void> }`
- **API:** `POST /api/auth/login` accepts `{ email: string, password: string }` returns `{ token: string, user: User }`
- **Data Structure:** `User` type with `{ id: string, email: string, subscriptionTier: 'free' | 'pro' }`

If not provided, Contract can be derived from Related Files, Constraints, or Implementation Notes. See `.cursor/rules/spec_playwright.md` for spec-driven development workflow.

---

## Acceptance Criteria

- [ ] Criterion 1 - [Specific, testable requirement]
- [ ] Criterion 2 - [Specific, testable requirement]
- [ ] Criterion 3 - [Specific, testable requirement]
- [ ] Tests pass - [Unit/E2E tests written and passing]
- [ ] Documentation updated - [If applicable]

---

## Related Files

### Code Files to Modify

- `src/path/to/file.ts` - [What needs to change]
- `src/path/to/component.tsx` - [What needs to change]

### Code Files to Create

- `src/path/to/new-file.ts` - [Purpose of new file]

### Documentation

- `docs/decisions/001-decision.md` - [Relevant ADR]
- `docs/reference/spec.md` - [Relevant specification]

---

## Implementation Notes

[Optional: Technical details, approach, considerations]

---

## Next Actions (2-3 steps max)

1. **[Step 1]** - [Concrete action with file paths]
2. **[Step 2]** - [Concrete action with file paths]
3. **[Step 3]** - [Optional third step]

---

## Testing Requirements

### Unit Tests

- [ ] Test case 1 - [What to test]
- [ ] Test case 2 - [What to test]

### E2E Tests

- [ ] E2E scenario 1 - [User flow to test]

### Manual Testing

- [ ] Manual test 1 - [What to verify]

---

## Notes

[Optional: Additional context, questions, or blockers]

---

## Completion

**Completed:** [Date]  
**Time Spent:** [Hours]  
**Commits:** [Commit hashes or PR links]  
**Lessons Learned:** [Optional: What worked well, what didn't]
