# Bug: Inputs lack visible borders making fields hard to see and focus

Date: 2025-11-03
Owner: TBD
Priority: P2 (usability + accessibility)
Status: Open
Scope: Wheel Trade drawer (TradeTab), Journal forms

## context

Users report that inputs blend into the dark background and are difficult to locate and focus. Screenshot attached in chat shows low-contrast borders and weak focus affordance in the Wheel trade composer modal.

We currently have three input styling paths:

- Global patterns in `src/index.css` (classes: `.input`, `.input-wrapper`, `.label`) using low-opacity borders (`border-green-500/20`).
- Componentized fields in `src/components/ui/Input.tsx` and `src/components/ui/Select.tsx` with their own Tailwind classes (also low-opacity borders).
- Raw fields in `Wheel` and some pages with ad‑hoc classes, notably `TradeTab.tsx`.

This inconsistency makes inputs visually faint and focus states uneven.

## reproduction

1. Open Wheel page.
2. Click the Actions button to open the drawer.
3. On the Trade tab, inspect the Symbol, Qty, DTE, Strike, Premium, Fees fields.
4. Observe faint borders and subtle focus states on dark background.

## actual

- Resting borders are ~20–30% opacity, barely distinguishable from background.
- Focus ring/border not strong enough to clearly indicate focus.

## expected (design spec)

- Resting border: subtle but clearly visible; use ~60% opacity on border color. Token-aligned with existing green accent.
- Focus ring: 2px ring with accent color and border color bump; use `:focus-visible` for keyboard users.
- Applies to Trade drawer and Journal forms; other areas unchanged for now.

## acceptance criteria

- All inputs and selects in Trade drawer and Journal forms have a clearly visible resting border and a 2px focus-visible ring.
- Contrast remains acceptable in dark theme (meets or approaches WCAG guidance for component boundaries).
- No visual regressions in Wheel header search or unrelated inputs.
- Unit tests pass; optional a11y check via Playwright tag can be added later.

## proposed solution (chosen)

Option 2 — Standardize on component usage in key forms.

1. Update UI components defaults

- `src/components/ui/Input.tsx`:
  - Change resting border from `border-green-500/20` to `border-green-500/60`.
  - Keep `focus:ring-2` and bump border color on focus to `border-green-400/70` (or similar).
- `src/components/ui/Select.tsx`:
  - Same adjustments as `Input.tsx`.

2. Replace raw fields with components in Trade drawer

- `src/pages/wheel/components/drawers/TradeTab.tsx`:
  - Replace `<input>` for Symbol, Qty, DTE, Strike, Premium, Fees with `<Input />`.
  - Replace `<select>` for Type and Side with `<Select />`.
  - Preserve labels, placeholders, and event handlers.

3. Journal forms

- `src/pages/journal/JournalPage.tsx`: already uses `<Input />` in most places; after component defaults change, borders/ring should improve automatically.

4. Keep global patterns as-is

- No changes to `.input`/`.input-wrapper` for this ticket to reduce blast radius. We may align them later.

## risks and mitigations

- Visual deltas beyond forms: Low; changes are confined to Input/Select components and their usages.
- Select alignment/chevron: Confirm padding after border/ring changes.
- Number/date inputs: Verify padding for date picker icon and centered alignment logic in `Input.tsx` remains correct.
- Playwright tests: Update screenshot baselines if any visual assertions exist.

## implementation checklist

- [ ] Update `Input.tsx` default classes to use `border-green-500/60` and `focus:border-green-400/70 focus:ring-2`.
- [ ] Update `Select.tsx` default classes similarly.
- [ ] Refactor `TradeTab.tsx` to use `<Input />` and `<Select />` components instead of raw inputs/selects.
- [ ] Smoke-test Wheel Trade drawer and Journal locally in dark mode.
- [ ] Optional: Add a small a11y test to assert focus-visible ring renders on tabbing to the Symbol field (`@accessibility`).
- [ ] Run format, lint, typecheck, build, and unit tests.

## out of scope (for this ticket)

- Global `.input` / `.input-wrapper` pattern overhaul.
- Wheel header search input (`wheel-header__search-input`).
- Token introduction (`--input-border`, `--input-ring`).

## done when

- Trade drawer and Journal inputs/selects have visible borders (≈0.6 opacity) and clear 2px focus-visible rings.
- Screenshots included in PR description showing before/after for at least one field.
- All checks pass (format, lint, typecheck, unit tests; E2E optional).
