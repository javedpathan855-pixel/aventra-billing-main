# Purchase Bills Implementation Report — 2026-10-15

## 1. Instructions and rules reviewed

- Root `AGENTS.md` (authority hierarchy, mandatory workflow, non-negotiables).
- All `/rules` files 01–21: architecture, project structure, domain/data/
  infrastructure/presentation/shared taxonomies, import boundaries, TypeScript
  (arrow functions, no `any`), styling tokens, components/icons, animation,
  packages, Prisma/PostgreSQL, Better Auth, Vitest testing, mocks,
  security/accessibility/performance, errors/config/git, definition of done,
  agent procedure.
- Prior reports (`purchase-orders-implementation`, `purchase-orders-refinement`,
  `purchase-financial-ui-alignment`) consulted for pattern context only.
- Working tree inspected first; all unrelated prior work preserved
  (purchase-orders, purchase-settings, reports, dashboard navigation).

## 2. Initial findings

- **No purchase-bill code existed anywhere**: no feature directory, routes,
  navigation href, Prisma models, or tests (verified by glob + repo-wide
  grep for purchase-bill/purchaseBill/purchase_bill, and bill/payable test
  references — zero hits).
- Navigation had `purchases-bills` as `planned` (no href); Supplier payments,
  Purchase returns/reports remain planned and were **not** implemented.
- No supplier-payments/payables module exists, so bills carry **no**
  paid/outstanding fields. No inventory side effects exist on any document
  flow, so bills create **none** (receiving owns stock).

## 3. Final architecture and directory structure

```
src/features/purchase-bills/
  domain/entities/purchase-bill.ts
  domain/errors/purchase-bill-errors.ts
  domain/rules/purchase-bill-rules.ts (+test)
  domain/rules/purchase-bill-lifecycle-rules.ts (+test)
  domain/repositories/purchase-bill-repository.ts
  data/dto/purchase-bill-dto.ts
  data/validators/purchase-bill-schemas.ts (+test)
  data/context/purchase-bill-context.ts
  data/queries/get-purchase-bills.ts, get-purchase-bill-by-id.ts
  data/mutations/purchase-bill-mutations.ts (+test, +database.test.ts)
  infrastructure/mappers/prisma-purchase-bill-mapper.ts
  infrastructure/repositories/prisma-purchase-bill-repository.ts (+test)
  presentation/components/{StatusBadge, Table, FilterBar, SummaryCards,
    SupplierSection, ItemsSection, AdditionalChargesAndDiscountSection,
    SummarySection, AdditionalInfoSection, Document,
    FinancialSections.test.ts}
  presentation/page/{ListPage (+test), CreatePage, DetailPage}
  index.ts
src/app/(app)/purchase-bills/{page.tsx, new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx}
prisma/migrations/20261015120001_add_purchase_bills/migration.sql
```

Dependency direction preserved (presentation → data → domain,
infrastructure → domain contracts). Domain imports nothing but domain types.
Presentation never touches Prisma. Cross-feature imports follow the
sanctioned sales/purchase-orders precedent: public barrels
(`SupplierDto`, `ProductDto`, `PurchaseOrder` type, `determineTaxMode`,
`formatSupplierAddress`) and server-side repository lookups for ownership
validation — no private-internals imports.

## 4. Files created and modified

- Created: `purchase-bills` feature (30 source/test files), 4 app routes,
  1 migration, this report.
- Modified: `prisma/schema.prisma` (2 models + 1 enum + 7 settings columns +
  4 reverse relations); `purchase-settings` (entity, rules, repo contract,
  DTO, zod schemas, mapper, infra repo incl. bill allocation, feature index,
  bill preview component, settings form bill card, rules + page tests);
  `dashboardNavigation.ts` (`/purchase-bills` available) +
  `dashboardNavigation.test.ts` (21 available hrefs, bills item, purchases
  destinations, route-resolution test).
- No unrelated files touched; no commits or pushes.

## 5. Workflows completed

- **Listing**: server-side `status/query/supplierId/purchaseOrderId/from/to`
  filters + `page/pageSize` pagination; route parses `?q=&status=&page=`;
  URL-driven search/filter/pagination, summary cards
  (All/Confirmed/Drafts/Cancelled), empty/populated states, Draft-only edit
  actions.
- **Create/edit**: supplier + product catalogue selection, supplier invoice
  number/date, internal `PB-` number (allocated or custom unique), bill/due
  dates (due defaults to bill + `defaultDueDays`), optional PO link with
  line prefill, charges/discounts, CGST+SGST/IGST slabs, payment terms,
  notes/terms, live totals + document preview. Creation restricted to
  Draft/Confirmed; edit route redirects non-Draft bills. Header + lines
  persist atomically; totals always recomputed server-side.
- **Detail**: authorized fetch, PO-link banner, Confirm/Edit/Print/
  Cancel/Delete actions gated by lifecycle guards, `ConfirmDialog`
  confirmations (no `window.confirm` anywhere).
- **Lifecycle**: Draft → Confirmed/Cancelled; Confirmed → Cancelled;
  terminal Confirmed/Cancelled (reopening rejected). Delete Draft-only.
  All transitions validated server-side.

## 6. Purchase Settings integration (source of truth)

- Single source of truth remains the `purchase_settings` row, extended in
  place — **no parallel system**: `purchaseBillPrefix` (`PB-`) / Suffix /
  NextNumber / Padding, `defaultDueDays` (30), `defaultPurchaseBillNotes`,
  `defaultPurchaseBillTerms`. Shared `defaultPaymentTerms` reused as-is.
- Write path: settings form bill card (shared components + live
  `PurchaseBillNumberPreview`) → admin-gated `savePurchaseSettingsAction`
  (zod + domain validators, per-document collision checks) → upsert;
  revalidation extended to `/purchase-bills` + `/purchase-bills/new`.
- Read path: bill creation reads settings server-side in-transaction —
  `allocateNextPurchaseBillNumber` (row lock + collision-skip + sequence
  bump, same pattern as orders), prefills due date/terms/notes/terms.
- Missing settings fall back to `DEFAULT_PURCHASE_SETTINGS`; changes affect
  only subsequent bills (DB-test verified); everything org-scoped.

## 7. Supplier, Product, Purchase Order integration

- Suppliers/products: `getSuppliers({status:"ACTIVE"})` /
  `getProducts({status:"ACTIVE"})` for selection; `findById(org, id)`
  server revalidation; snapshots stored on the bill.
- Purchase Orders: optional link, route-prefetched (100) and filtered
  client-side by supplier + non-cancelled; server enforces same-org,
  non-cancelled, and supplier-counterparty equality; snapshot
  `purchaseOrderNumber` survives PO deletion (SetNull); multiple bills per
  PO allowed (partial billing); PO lifecycle/history untouched.

## 8. Financial calculations and numbering

- `calculatePurchaseBillTotals` (domain-owned, same GST mechanics as sibling
  documents): gross subtotal → line discounts → clamped fixed/percentage
  document discount (taxable never negative) → charges → proportional slab
  allocation → CGST/SGST split or IGST; round2 throughout; `Decimal(14,2)`
  money / `Decimal(12,3)` quantities persisted.
- Internal numbers unique per org (`@@unique`); supplier-invoice uniqueness
  per (org, supplier) enforced app-side (friendly error) **and** by a
  partial unique index (concurrency backstop), with P2002 mapped to typed
  domain errors in the repository (supplier precedent: duck-typed `code`
  check, no Prisma runtime import in mutations).
- dueDate ≥ billDate enforced in schema (create) and against effective
  values (update).

## 9. Inventory / accounting / payment boundaries

- Creating/confirming a bill changes **no** stock, ledgers, or payables and
  sets **no** paid status — receiving owns inventory, and supplier payments
  do not exist yet. No journal entries, allocations, returns, or payment
  modules were invented. Bill entity carries no payment fields, so no
  future payment workflow is blocked or pre-empted.

## 10. Security and organization-scope evidence

- Every query/mutation resolves org from `getAuthState()` server context;
  no client-supplied org IDs. Repository reads scope `organizationId`;
  deletes use scoped `deleteMany`; supplier/product/PO re-validated per org
  at mutation time; settings saves require `isOrganizationAdmin`.
- Tests: cross-org find/update rejection, foreign supplier/product/PO
  rejection, PO supplier-mismatch and cancelled-PO rejection, duplicate
  invoice rejection (incl. concurrent P2002 path), non-admin settings
  rejection (existing), missing-document safe errors, terminal-state
  transition rejection. No error leaks DB internals (P2002 messages mapped).

## 11. Shared UI components reused

- `form`: Input, Select, DatePicker, Textarea, Label, Button.
- `table`: Table family + Pagination. `ConfirmDialog`, Lucide icons,
  `cn()`, semantic tokens only. Layout/patterns mirror Create Invoice and
  Purchase Orders (financial sections identical in structure).

## 12. Native controls confirmation

- Grep over the feature + routes for `<input|<select|<textarea|<button|`
  `window.confirm|window.alert|window.prompt`: **zero matches**. Print uses
  `window.print()` only (same as sibling detail pages).

## 13. Verification results

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | PASS, exit 0 |
| ESLint (bills, settings, dashboard, routes) | `npx eslint …` | PASS |
| Focused bills/settings/dashboard tests | `vitest run …` | PASS — 15 files, 128 tests |
| Full suite + isolated scratch test DB | `vitest run` with `AVENTRA_TEST_DATABASE_URL` | PASS — **170 files, 1166 tests, 0 failures** (incl. 8 new bill DB tests: exact totals, PB- numbering, settings defaults, PO link, dedup, isolation, atomicity, lifecycle) |
| Full suite, standard state (no test DB) | `npm test` | PASS — 158 files, 1062 tests, 12 DB suites skipped |
| Prisma | `validate` / `generate` / `migrate dev` + fresh `migrate deploy` replay on scratch DB | PASS — all 17 migrations replay cleanly |
| Production build | `npm run build` | PASS — all 4 `/purchase-bills*` routes emitted |
| Sweeps | native-control / `any` / color / domain-import / presentation-prisma greps | PASS (Prisma imports infra-only; one `domain` grep hit is the English word “next”) |

Note: one full-run showed a single flaky failure in unrelated
`recurring-database.test.ts`; it passes in isolation and on re-run
(170/170, 1166/1166). Scratch test DB and helper scripts were removed
afterwards; no environment side effects remain.

## 14. Exceptions, blockers, deferred decisions

- **Migration history repair (done, documented)**: the new migration first
  generated as `…083527` sorted before the prior session’s hand-stamped
  `…15120000_add_purchase_orders`, breaking fresh replays (its
  `purchase_settings` ALTERs ran before that table existed). Repaired by
  reverting the just-created empty objects on local dev, removing its
  history row, renaming to `20261015120001_add_purchase_bills` (with the
  dedup index merged in), re-applying, and proving full-history
  `migrate deploy` on a scratch database. No production data involved;
  nothing committed.
- **Business decisions** (reasoned, minimal, documented in code): bill
  lifecycle Draft/Confirmed/Cancelled; no paid status without a payments
  module; supplier-invoice optional but unique per (org, supplier) when
  present; PO link requires same supplier counterparty and non-cancelled
  order; dueDate ≥ billDate; no inventory/accounting side effects.
- Browser/screenshot verification was not available (authenticated routes,
  no session); layout parity is evidenced by shared class-level patterns
  plus static-render assertions (headers, presets, exact `₹` amounts, IGST
  switch, zero-row hiding).

## Assessment: PASS

Purchase Bills works end-to-end — persisted listing, validated
create/edit/detail/cancel/delete, PO linkage, settings-driven PB-
numbering and defaults, server-recomputed GST totals, org isolation —
with architecture, UI, and verification evidence above and no unresolved
rule violations.
