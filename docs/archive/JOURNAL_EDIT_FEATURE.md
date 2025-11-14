# Journal Edit Flow + Slide Menu (Feature Spec)

Updated: 2025-11-03
Owners: You (product/engineering), Copilot (assist)  
Status: In progress (flagged rollout)

## Overview

Enable full-field editing for every Journal entry and ship a new slide-in editor menu that matches the Trade drawer’s layout, behavior, and interaction. The feature is gated behind a flag and emits telemetry for open, close, save, and error events.

Goals:

- Users can edit any Journal field with validations and clear error messages.
- Slide-in panel mirrors our existing drawer pattern (Ticker/Trade), supports keyboard and screen readers, and works on mobile/desktop.
- Feature shipped behind a flag with telemetry visibility.

Non-goals:

- Bulk edit across multiple rows (future work).

## User stories

- As a user, I can open an entry editor from the Journal table to change any field and save or cancel.
- As a user, I can revert changes by canceling before save.
- As a user, I must provide an edit reason; the app preserves an audit trail by soft-deleting the original and inserting a corrected row.
- As a keyboard user, I can open/close the editor with Enter/Escape and tab through fields in order.
- As a screen reader user, I perceive a dialog with a title and can navigate labeled fields.
- As a stakeholder, I can confirm telemetry for open, close, save, and error shows up in our dashboard/dev view.

## UX specs

- Entry point: Edit icon in Journal table Actions column.
- Container: Right-side slide drawer, max-width 24–28rem, overlay with 60% black and backdrop blur.
- Focus management: Focus moves to first form control on open; Escape closes; overlay click closes; focus returns to the originating Edit button on close.
- Controls: Cancel and Save buttons, with Save disabled while saving.
- Fields rendered (all editable):
  - Date (ts, date input) – default from entry
  - Account (account_id, text)
  - Symbol (uppercase enforced)
  - Type (select from supported types)
  - Qty (nullable number)
  - Amount (number)
  - Strike (nullable number)
  - Expiration (nullable date)
  - Underlying Price (nullable number)
  - Notes (textarea)
  - Edit Reason (required textarea)
- Error presentation: Inline alert via prompt for now; form-level messaging and inline field markers can be added in a subsequent pass.
- Animations: Same visual pattern and utility classes as current drawers (Ticker/Actions) – shadow, border, overlay.

## Data and state changes

- DB: No schema changes. Uses existing journal table and audit columns (deleted_at, edit_reason, etc.).
- Store APIs: Reuse `useEntriesStore.editEntry(entryId, updates, reason)` which soft-deletes the original and inserts a corrected row.
- UI state: New `useJournalUIStore` manages drawer open state and selected entry.
- Feature flags (src/utils/env.ts):
  - `VITE_FEATURE_JOURNAL_EDIT_DRAWER` → `env.features.journalEditDrawer`
  - `VITE_FEATURE_JOURNAL_EDIT_FLOW` → `env.features.journalEditFlow`

## Validation rules

- Symbol must be non-empty; force uppercase.
- Type must be one of TradeType values.
- Amount is required numeric (positive or negative allowed depending on type).
- Qty/Strike/Underlying/Expiration are nullable; blank converts to null.
- Date fields accept YYYY-MM-DD; converted to ISO before save.
- Edit reason is required; save is blocked without it.
- The candidate entry is validated with Zod (`EntrySchema.safeParse`) before persistence.

## Accessibility notes

- Drawer has role="dialog" and aria-labelledby on title.
- Escape key closes; overlay click closes.
- Controls have visible focus styles; labels are associated with inputs.
- Works in high-contrast theme (leverages existing color tokens and tailwind classes).

## Risks & mitigations

- Risk: Data loss if user navigates mid-edit.
  - Mitigation: Save only on explicit Save; non-destructive until written. Consider unsaved-change guard later.
- Risk: Inconsistent date/time formats.
  - Mitigation: Convert YYYY-MM-DD → ISO; validate with Zod; display via format helpers.
- Risk: Flagged rollout confusion.
  - Mitigation: Document flags and defaults in README and here.

## Open questions

- Should symbol/type be locked for certain entry types (e.g., derived from templates)?
- Should amount sign be auto-derived from type (e.g., income vs expense)?
- Multi-account support: Do we need a select for account_id rather than text?
- Future: Inline field errors vs. alert()?

## Implementation summary (done in this PR)

- Feature flags added in `src/utils/env.ts`.
- Telemetry utility in `src/utils/telemetry.ts` with localStorage buffer and optional POST.
- Journal UI store: `src/stores/useJournalUIStore.ts`.
- Drawer component: `src/pages/journal/components/drawers/JournalDrawer.tsx` with full-field edit form and Zod validation.
- Journal page integration behind flag; legacy modal retained as fallback.

## Test plan

- Unit tests
  - Store: `useJournalUIStore` open/close behavior.
  - Telemetry: `track` logs to localStorage (dev), and honors env.features.analytics.
- Integration/UI tests
  - Journal drawer opens on edit when `VITE_FEATURE_JOURNAL_EDIT_DRAWER=true`.
  - Save triggers `useEntriesStore.editEntry` with transformed fields and required reason.
  - Escape and overlay click close the drawer and emit close telemetry.
  - Keyboard tab order is traversable (smoke test via testing-library focus moves).
- E2E (Playwright – follow-up)
  - Happy path: open drawer → change fields → save → row updates.
  - Error path: invalid data triggers validation message → save blocked → error telemetry.

## Telemetry

- Events emitted (via `track`):
  - `journal_edit_open` { id, symbol, type }
  - `journal_edit_close` { id }
  - `journal_edit_save` { id, updates[] }
  - `journal_edit_error` { id, error }
- Visibility:
  - In dev: console + localStorage (key: telemetry.events)
  - Optional endpoint: set `VITE_ANALYTICS_ENDPOINT` to POST to a dashboard collector.

## Rollout & flags

- `VITE_FEATURE_JOURNAL_EDIT_DRAWER=false` (default)
- `VITE_FEATURE_JOURNAL_EDIT_FLOW=false` (default)
- To enable locally, add to `.env.local`:
  - VITE_FEATURE_JOURNAL_EDIT_DRAWER=true
  - VITE_FEATURE_JOURNAL_EDIT_FLOW=true
  - VITE_ENABLE_ANALYTICS=true (for telemetry persistence)

## Progress checklist (living)

- [x] Audit journal/types/templates and trade drawers
- [x] Add feature flags in env.ts
- [x] Add telemetry utility and wire events
- [x] Add Journal UI store
- [x] Implement slide drawer matching drawer style
- [x] Integrate behind flag; keep modal fallback
- [ ] Unit tests (store, telemetry)
- [ ] Integration/UI tests (drawer open/close/save)
- [ ] E2E coverage (happy/error paths)
- [ ] Docs polish (screenshots, copy tweaks)

## Owners & dates

- Spec & scaffolding: Copilot — 2025-11-03
- Tests & rollout: You — TBA
