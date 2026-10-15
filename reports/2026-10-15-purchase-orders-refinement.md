# Purchase Orders Refinement Report — 2026-10-15

Targeted remediation of two implementation-quality issues. No business logic,
schema, migration, invoice behavior, or unrelated code was changed.

## 1. Files inspected

- `AGENTS.md`, applicable `/rules` (presentation taxonomy, boundaries,
  TypeScript, styling, components, testing, definition of done).
- `src/features/invoices/presentation/components/InvoiceItemsSection.tsx`
  (layout reference), `src/shared/components/table/Table.tsx`,
  `src/shared/components/form/Select.tsx` (children + `options` API,
  no `aria-label` prop).
- `src/features/billing-settings/presentation/` in full (`page/`, `forms/`,
  `components/`, `index.ts`) plus `billing-settings/index.ts` (root barrel
  deliberately excludes presentation — page reached via route import).
- Current `PurchaseOrderItemsSection.tsx`, `PurchaseSettingsPage.tsx`,
  prior report `reports/2026-10-15-purchase-orders-implementation.md`.
- Working tree: only prior-task purchase files + two dashboard-navigation
  files; all preserved.

## 2. Fix 1 — Order Items layout

**Causes of the spacing problem** (confirmed against the screenshot and code):
`Table` wrapped in an extra bordered `overflow-x-auto` container (the shared
`Table` already provides the scroll container); no `table-fixed` so columns
sized to content (`min-w-45` item cell vs `w-18/20/22/24` numeric cells);
rows `align-middle` with full `p-3`-style padding and stacked
Select-then-description doubling row height; numeric inputs oversized
relative to content; amount in variable-precision currency; remove action a
full secondary button.

**Revised layout** (`purchase-orders/presentation/components/
PurchaseOrderItemsSection.tsx`, rewritten):
- Same skeleton as `InvoiceItemsSection`: icon-box header + subtitle,
  `Table className="min-w-[860px] table-fixed text-xs"`, identical column
  proportions (`#` 4 / Item 36 / HSN 11 / Qty 8 / Rate 13 / Disc 8 / Tax 9 /
  Amount 11 / action 4 with matching `min-w` floors), `align-top` rows,
  `py-3.5 pr-3` cells with `pt-4`/`pt-5` control alignment, `#` row numbers,
  stacked Select → custom-name input → description, `startIcon ₹`,
  `%` suffix, `tabular-nums` 2dp amounts, icon-only remove, shared-`Button`
  Add Item. Responsive strategy is invoice's: fixed minima + built-in
  horizontal scroll from shared `Table`.
- **Reuse decision**: `InvoiceItemsSection` is *not* reused — it is private
  to invoices (absent from its public index) and bound to `InvoiceLineItem`
  + `sellingPrice` semantics. A direct import would breach feature
  boundaries and a shared abstraction is unjustified for divergent types.
  Pattern (layout/spacing) is shared; PO behavior stays PO-owned:
  `productId` tracking, `purchasePrice ?? sellingPrice` pricing,
  fractional `step="any"` quantities with zero-floor clamping, 18% tax
  reset, existing `items.N.*` error keys (plus invoice-style `item-N` key).
- Functionality preserved: selection (rich `[Type] name (SKU) — ₹price /
  unit` labels, loading/empty/custom states), add/remove (remove disabled
  single-line), HSN/description editing, tax select, per-line amounts,
  invoice-identical totals math untouched, server validation untouched.

## 3. Fix 2 — Purchase Settings presentation structure

Canonical names follow the repo rule and billing-settings exactly:
`page/` (singular), `forms/`, `components/`.

```
purchase-settings/presentation/
  page/PurchaseSettingsPage.tsx          # thin composition only
  page/PurchaseSettingsPage.test.ts      # composition regression test
  forms/PurchaseOrderSettingsForm.tsx    # all form state/handlers/sections
  components/PurchaseSettingsHeader.tsx  # title block (cf. BillingSettingsHeader)
  components/PurchaseOrderNumberPreview.tsx  # live preview (cf. DocumentNumberPreviewCard)
  index.ts                               # barrel (cf. billing presentation/index.ts)
```

- Page composes header + isolation banner + form; zero field logic remains.
- Form is a verbatim move (state, validation, `savePurchaseSettingsAction`,
  reset, cards, footer); only the preview box is delegated to the new
  preview component, which formats internally via domain
  `formatPurchaseOrderNumber` with an invalid-format fallback — same
  responsibility split as billing.
- No new source of truth, no model/persistence/auth changes; feature-root
  exports and the `/settings/purchases` route import path are unchanged, so
  the settings → purchase-order wiring (numbering, delivery window, payment
  terms, notes/terms) is intact.

## 4. Shared-UI rule

Grep over both refactored presentation trees for `<input|<select|
<textarea|<button|window.confirm|window.alert|window.prompt`: **zero
matches**. Only shared `Input/Select/Textarea/Label/Button` (+ `Tabs`
untouched) are used. No new libraries, no design-system duplicates.
(`aria-label` is used on shared `Input`, which forwards HTML attributes;
row `Select`s use `sr-only` `Label` since `SelectProps` lacks `aria-label`.)

## 5. Verification (actual results)

| Check | Result |
|---|---|
| Focused PO + settings tests | 9 files / 62 tests PASS (1 DB file skips, no test DB) |
| Full suite (`npm test`) | 150 files PASS, 986 tests PASS, 0 failures (11 files / 96 skipped: DB-gated) |
| Typecheck (`tsc --noEmit`) | PASS, exit 0 |
| ESLint (both features) | PASS, exit 0 |
| Production build | PASS; `/purchase-orders*` + `/settings/purchases` emitted |
| Structural parity probe (temporary test, since removed) | PASS — identical column widths, headers, `min-w-[860px] table-fixed`, `align-top` in both sections |
| New regression tests | `PurchaseOrderItemsSection.test.ts` (headers, catalogue labels, custom entry, errors, remove-disabled), `PurchaseSettingsPage.test.ts` (header, banner, numbering, `PO-0007`/`PO-0042` previews, actions) |
| Browser visual check | BLOCKED — routes are authenticated and no session credentials exist in this environment; parity evidenced structurally (above) plus static-render assertions |

## 6. Exceptions / blockers

- None functional. Live-browser screenshot comparison was not possible
  (authenticated routes, no credentials); recommended as a follow-up in a
 seeded environment.
- `DocumentSettingsForm`'s pre-existing raw `<button>`/`window.confirm`
  usage was observed but left untouched as out of scope.

## Assessment: PASS

Both the items-layout refinement and the settings presentation refactor are
complete, behavior is preserved with regression coverage, and typecheck,
lint, full tests, and build are green with honest evidence above.
