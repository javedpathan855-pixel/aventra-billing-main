# Purchase Order Financial UI Alignment Report — 2026-10-15

Targeted alignment of the Purchase Order Additional Charges, Discount, and
Order Summary sections with the Create Invoice implementation. No financial
logic, schema, invoice code, or unrelated files were changed.

## 1. Files inspected and changed

Inspected: `AGENTS.md` + applicable `/rules`; invoices
`AdditionalChargesAndDiscountSection.tsx`, `InvoiceSummarySection.tsx`,
`InvoiceCreatePage.tsx` (§6 composition grid); shared `Button`, `Table`,
`Select`; current PO charges/discount/summary components and create-page
composition; working tree (only prior-task purchase files preserved).

Changed:
- `purchase-orders/presentation/components/
  PurchaseOrderAdditionalChargesAndDiscountSection.tsx` (rewritten)
- `purchase-orders/presentation/components/PurchaseOrderSummarySection.tsx`
  (rewritten)
- `purchase-orders/presentation/page/PurchaseOrderCreatePage.tsx`
  (one-line grid class-order normalization)
- `purchase-orders/presentation/components/
  PurchaseOrderFinancialSections.test.ts` (new: 6 regression tests)

## 2. Invoice patterns reused (not blindly copied)

Both components now share invoice's exact skeleton: `flex h-full flex-col
justify-between` cards, icon-box headers with subtitles, `mt-5` rhythm,
`h-9 text-sm` inputs, `mb-1.5 block text-xs` labels, `tabular-nums` amounts,
`min-w` responsive behavior. Deliberate divergences, all justified:
- Invoice's components are private to invoices (absent from its public
  index), so direct import would breach feature boundaries; PO keeps its own
  components with PO vocabulary ("Order Discount", "Total Order Value",
  freight/packaging presets) and PO props (`PurchaseOrderTotals`).
- Slabs render from `totals.taxBreakdown` (proportional, server-authoritative)
  instead of invoice's client-side slab recomputation — strictly more
  correct for persisted values.
- Invoice's raw `<button>` chips/toggles were rebuilt with shared `Button`
  (`variant="link"` + merged classes) per the no-native-controls rule.

## 3. Before / after

- Charges/Discount: bordered mini-header + uneven `sm:grid-cols-2` panels,
  `text-xs` inputs, always-visible `0` values, trailing note paragraphs →
  invoice header block, balanced `md:grid-cols-2` panels with descriptions,
  `text-sm` inputs, empty-with-`0.00`-placeholder zero state, ₹ start-icon,
  Type+Rate 2-col grid with percentage `max="100"`, preset-chip rows.
- Summary: mixed hierarchy, conditional-only rows, two large mode buttons,
  filled-primary total bar, variable-precision currency → invoice hierarchy
  (Subtotal → discounts → charges → Taxable → Tax Amount), GST sub-card with
  segmented CGST+SGST/IGST toggle + CGST/SGST/IGST rows + Rate Slabs,
  border-t baseline total in 2xl primary-light with exact 2dp formatting.

## 4. Behavior preserved

Single charge + label, fixed/percentage discount + reason, NaN/negative→0
normalization, percentage bounds, charge→discount→taxable→tax→total order,
round2/round3 conventions, server-side recomputation, settings defaults
wiring — all untouched (presentation-only diff; mutations/domain not
modified). No new charge types, no schema migration (single-charge model
confirmed against the domain), no invoice side effects (invoice tests green).

## 5. Verification (actual results)

| Check | Result |
|---|---|
| Focused PO + settings + invoice tests | 29 files / 239 tests PASS |
| Full suite (`npm test`) | 151 files PASS, 992 tests PASS, 0 failures (11 files / 96 skipped: DB-gated) |
| Typecheck (`tsc --noEmit`) | PASS, exit 0 |
| ESLint (both purchase features) | PASS, exit 0 |
| Production build | PASS; all purchase routes emitted |
| Native-control grep (both sections) | zero matches |
| Browser/screenshot check | BLOCKED — authenticated routes, no session credentials available; alignment evidenced by shared class-level patterns plus static-render assertions (headers, presets, `max="100"`, exact `₹95,000.00`/`₹17,100.00`/`₹1,12,100.00`, IGST switch, zero-row hiding) |

## 6. Exceptions

None. Responsive behavior inherits the existing page grid
(`lg:grid-cols-[1.35fr_1fr]…`, `items-stretch`, `h-full` equal heights) and
shared-Table scroll already verified in prior tasks.

## Assessment: PASS

Financial UI matches the invoice pattern, calculations/settings wiring are
preserved, and all applicable checks are green with honest evidence above.
