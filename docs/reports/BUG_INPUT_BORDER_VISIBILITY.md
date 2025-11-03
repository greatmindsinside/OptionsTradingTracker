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

### dark modal design spec (updated)

Design a dark theme modal where every form input is clearly visible against the background. Place each input on a slightly lighter surface with gentle elevation. Use a subtle outline at rest and a strong focus ring for interaction.

Requirements:

- Input surface: near black but lighter than the page; target ~6–8% white over black.
- Text: body fg rgb(229 231 235); placeholder 70% of body; labels 90% of body.
- Outline at rest: 1px, low contrast, separates from the page.
- Focus state: 2px ring in primary green, add soft outer glow.
- Error state: red ring and message below the field.
- Disabled state: lower contrast text and no glow.
- Radius: 12px, vertical padding 10–12px, horizontal padding 14–16px.
- Shadow: soft, small spread to lift the input from the page.
- Contrast: meet WCAG AA 4.5:1 for labels and values.
- Hover feedback for clickable inputs and icons.
- Keep the rest of the modal dark so the inputs read as a lighter island.

## acceptance criteria

- All inputs and selects in Trade drawer and Journal forms have a clearly visible resting border and a 2px focus-visible ring.
- Contrast remains acceptable in dark theme (meets or approaches WCAG guidance for component boundaries).
- No visual regressions in Wheel header search or unrelated inputs.
- Unit tests pass; optional a11y check via Playwright tag can be added later.
- Inputs sit on a slightly lighter near-black surface with soft shadow; modal background remains darker.
- Resting outline is 1px low-contrast; focus shows 2px primary-green ring with soft outer glow.
- Error state presents red ring and inline message below the field; disabled state lowers text contrast and removes glow.
- Border radius ≈12px; padding falls within 10–12px (vertical) and 14–16px (horizontal).
- Labels and values meet WCAG AA 4.5:1; placeholders at ~70% of body text.
- Hover feedback is present for clickable inputs and icons.

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

---

## spec → Tailwind mapping (implementation guide)

Use these class recommendations to translate the spec into Tailwind v4 utilities while staying aligned with our current design tokens and dark theme.

Foundation

- Surface (input background): `bg-zinc-950/60` (near-black, slightly lighter than page)
- Text: `text-zinc-200` (≈ rgb 229 231 235)
- Placeholder: `placeholder:text-zinc-200/70`
- Label: `text-zinc-200/90`
- Radius: `rounded-xl` (≈ 12px)
- Padding: `px-4 py-3` (≈ 16px × 12px). Alternative: `py-2.5` for ~10px if desired.
- Shadow: `shadow` or custom: `shadow-[0_1px_2px_0_rgba(0,0,0,0.5)]`

States

- Rest (outline): `border border-green-500/60`
- Focus: `focus:border-green-400/70 focus:ring-2 focus:ring-green-500/30`
  - Optional soft glow: `focus:shadow-[0_0_0_4px_rgba(16,185,129,0.12)]`
- Error: `border-red-500/50 focus:border-red-400/70 focus:ring-red-500/50`
  - Message text: `text-red-400 text-xs mt-1`
- Disabled: `disabled:text-zinc-500 disabled:cursor-not-allowed disabled:shadow-none`
- Hover feedback: `hover:border-green-400/70 hover:bg-zinc-900/60`

Example input class (single element)

```
rounded-xl bg-zinc-950/60 text-zinc-200 placeholder:text-zinc-200/70
border border-green-500/60 shadow px-4 py-3
focus:outline-none focus:border-green-400/70 focus:ring-2 focus:ring-green-500/30
hover:border-green-400/70 hover:bg-zinc-900/60
disabled:text-zinc-500 disabled:cursor-not-allowed
```

Label example

```
mb-1 ml-0.5 text-[11px] tracking-wide uppercase text-zinc-200/90
```

Select example (with chevron and padding for icon)

```
h-9 w-full pl-9 pr-10 appearance-none rounded-xl bg-zinc-950/60 text-zinc-200
border border-green-500/60 shadow
focus:outline-none focus:border-green-400/70 focus:ring-2 focus:ring-green-500/30
```

Notes

- Keep modal container darker than input surface (e.g., `bg-black/90`) so inputs appear as a lighter island.
- Ensure labels and values meet WCAG AA 4.5:1; current `text-zinc-200` on near‑black exceeds this.
- For Number/Date inputs, preserve existing padding logic for icons and calendar pickers in `Input.tsx`.
