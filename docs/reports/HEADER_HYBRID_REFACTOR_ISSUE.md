# Issue: Adopt Hybrid Header (Global AppHeader + Page Subheaders) and Verify Wheel Header Copy

## Summary

- Introduce a minimal global header shown on all pages (AppHeader) with brand + top‑level nav (Wheel, Journal).
- Keep page‑specific tools in each page’s own subheader:
  - Wheel keeps `WheelHeader` (search + open Actions).
  - Journal uses a small subheader (filters/search) as needed.
- Verify and correct the Wheel title copy if necessary (ensure leading “W” in “Wheel To Tendies Pipeline”).

## Motivation

- Consistent global navigation improves orientation and reduces duplication.
- Page subheaders preserve focus and avoid overloading a single global bar.
- Current state shows header styles duplicated and named inconsistently across pages.

## Current State (scan)

- `WheelPage.tsx` renders:
  - `WheelContainer` (dark surface + glows)
  - `WheelHeader` (search + actions)
- `JournalPage.tsx` renders its own header using `wheel-header` CSS classes with a different title.
- No existing `AppHeader` or `AppLayout`.
- Routes (`src/App.tsx`) render pages directly without a shared layout wrapper.

## Conflicts / Decisions Needed

1. Journal header class names
   - Journal currently uses `wheel-header` class names. Should we rename to a neutral `page-header` or to `journal-header`?
   - Proposal: use neutral `page-header` for shared subheader styles; variants per page via modifiers.

2. Layout layering with `WheelContainer`
   - `WheelContainer` sets the dark background and renders large glow shapes (absolute positioned).
   - A global `AppHeader` (sticky + blur) will sit above. Z-index and stacking context should be set to ensure header remains above glows.
   - Proposal: keep `WheelContainer` as-is for Wheel only; `AppHeader` uses `sticky top-0 z-30 bg-black/70 backdrop-blur`.

3. E2E selectors
   - Keep `data-testid="wheel.title"` in `WheelHeader` (subheader) so existing Playwright tests continue to pass.
   - If we rename classes for Journal, ensure any tests referencing them are updated (none found by quick grep, but confirm during PR).

4. Brand copy and emoji
   - Confirm global brand string (e.g., “Options Tracker”).
   - Keep emoji in page subheaders or remove for a cleaner look?

If you want different choices for any of the above, please specify and I’ll adjust the implementation plan.

## Proposed Implementation

- Add `src/components/layout/AppHeader.tsx` (global header with brand and Wheel/Journal nav).
- Add `src/components/layout/AppLayout.tsx` (wraps `AppHeader` + provides centered content area via `<Outlet />`).
- Update `src/App.tsx` routes to nest all pages under `AppLayout`.
- Leave `WheelHeader` as Wheel’s subheader; no structural change needed except ensuring copy is correct.
- Convert `JournalPage` top bar into a subheader (rename classes to `page-header` or `journal-header`).
- Keep `WheelContainer` for Wheel’s page-level background + glows (no change needed); confirm `AppHeader` z-index is above it.

## Acceptance Criteria

- A global header appears on Wheel and Journal with:
  - Brand on the left.
  - Nav links: Wheel, Journal (active state highlighted).
- Wheel page still shows its subheader with search and “Open Actions” button.
- Journal page shows its own subheader (existing journal title and any filters retained), with neutralized class names (`page-header*` or `journal-header*`).
- The Wheel header title renders correctly with a leading “W”: “Wheel To Tendies Pipeline”.
- Playwright tests referring to `data-testid="wheel.title"` and `data-testid="wheel.action.open"` continue to pass (no locator changes).
- No visual overlap: global header remains readable above Wheel’s glow background.

## Test Plan

- Unit: existing unit tests should remain green.
- E2E (manual/visual):
  - Navigate `/` → see global header + Wheel subheader, search works, Actions opens.
  - Navigate `/journal` → see global header + Journal subheader/title; nav active state correct.
  - Keyboard nav: Tab focus visible in global nav and subheaders.
  - High contrast/HC mode renders borders and focus rings appropriately.

## Estimated Effort

- 2–4 hours including refactor, visual pass, and test verification.

## Notes

- The selection showing “heel To Tendies Pipeline” suggests a possible missing “W”; source currently renders “💰 Wheel To Tendies Pipeline”. We will verify in UI and correct if necessary.

## Checklist

- [ ] Create `AppHeader.tsx`
- [ ] Create `AppLayout.tsx`
- [ ] Route nesting under `AppLayout` in `src/App.tsx`
- [ ] Keep `WheelHeader` as subheader; verify title copy
- [ ] Convert `JournalPage` header to subheader; rename classes
- [ ] Verify z-index stacking with Wheel glows
- [ ] Run typecheck, build, unit tests, and key Playwright flows

---

Created by: Hybrid Header refactor plan based on prior discussion and code scan.
