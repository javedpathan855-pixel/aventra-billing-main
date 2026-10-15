# Purchase Orders Implementation Report — 2026-10-15

## 1. Instructions and rules reviewed

- Root `AGENTS.md` (authority hierarchy, mandatory workflow, non-negotiables).
- All `/rules` files `01–21`: architecture, project structure, domain/data/
  infrastructure/presentation/shared taxonomies, import boundaries, TypeScript
  (arrow functions, no `any`), styling/design tokens, components/icons,
  animation, packages, Prisma/PostgreSQL, Better Auth, Vitest testing, mocks,
  security/accessibility/performance, errors/config/git, definition of done,
  agent procedure.
- Existing feature implementations used as binding conventions:
  `sales-orders` (document workflow template), `sales-settings`
  (settings/numbering template), `suppliers` (master-data + server pagination
  template), `products` (catalogue lookup), `billing-settings`, `invoices`
  (`determineTaxMode`), dashboard navigation metadata.
- Prior sales architecture reports in `reports/` consulted for pattern
  context only; no Sales business logic was copied into Purchasing.

## 2. Schema and feature findings (pre-implementation)

- No `Purchase*` models, enums, routes, features, or settings existed.
- `Supplier` (org-scoped, `ACTIVE`/`INACTIVE`, `@@unique([organizationId, gstin])`)
  and `Product` (`sellingPrice` + `purchasePrice`, `taxRate`, `unit`) already
  provided the required master data and canonical `findById(org, id)` lookups.
- `SalesOrder`/`SalesOrderItem` + `SalesSettings.allocateNext*Number`
  (row-lock `SELECT … FOR UPDATE`, collision-skip loop, in-transaction
  allocation) defined the mandated document/numbering pattern.
- Established gaps deliberately fixed in the new work (not refactored in
  Sales): `window.confirm` usage in `SalesOrderDetailPage`, and client-only
  list filtering. Purchase Orders uses `ConfirmDialog` and URL-driven
  server-side search/filter/pagination.
- `DashboardNavigationHref` + `dashboardNavigationSections` is the single
  navigation source; `purchases-orders` was `planned`, no
  `/settings/purchases` route existed.

## 3. Final architecture and directory structure

```
src/features/purchase-settings/
  domain/{entities/purchase-settings.ts, errors/, rules/purchase-settings-rules.ts,
    repositories/purchase-settings-repository.ts}
  data/{dto/, validators/purchase-settings-schemas.ts, context/, queries/get-purchase-settings.ts,
    mutations/save-purchase-settings.ts (+test)}
  infrastructure/{mappers/prisma-purchase-settings-mapper.ts,
    repositories/prisma-purchase-settings-repository.ts}
  presentation/page/PurchaseSettingsPage.tsx
  index.ts
src/features/purchase-orders/
  domain/{entities/purchase-order.ts, errors/, rules/purchase-order-rules.ts (+test),
    rules/purchase-order-lifecycle-rules.ts (+test), repositories/purchase-order-repository.ts}
  data/{dto/, validators/purchase-order-schemas.ts (+test), context/,
    queries/{get-purchase-orders.ts, get-purchase-order-by-id.ts},
    mutations/{purchase-order-mutations.ts (+test), purchase-order-database.test.ts}}
  infrastructure/{mappers/prisma-purchase-order-mapper.ts,
    repositories/prisma-purchase-order-repository.ts}
  presentation/{components/{StatusBadge, Table, FilterBar, SummaryCards, SupplierSection,
    ItemsSection, SummarySection, AdditionalChargesAndDiscountSection,
    AdditionalInfoSection, Document}, page/{ListPage (+test), CreatePage, DetailPage}}
  index.ts
src/app/(app)/purchase-orders/{page.tsx, new/page.tsx, [id]/page.tsx, [id]/edit/page.tsx}
src/app/(app)/settings/purchases/page.tsx
prisma/{schema.prisma, migrations/20261015120000_add_purchase_orders/migration.sql}
```

Dependency direction preserved: presentation → data → domain,
infrastructure → domain contracts. Domain imports nothing but domain types.
Presentation never touches Prisma. Cross-feature use mirrors the sanctioned
sales-orders precedent (`supplierRepository`/`productRepository` server
lookups, `determineTaxMode`, `getSupplierTaxContext`).

## 4. Files created and modified

- Created: 2 features (33 source/test files), 5 app routes, 1 migration.
- Modified: `prisma/schema.prisma` (relations + 4 new models/enum),
  `dashboardNavigation.ts` (`/purchase-orders` available, `/settings/purchases`
  available), `dashboardNavigation.test.ts` (inventory counts 18→20
  available, 88→89 total, new route assertions).
- No unrelated files touched; `git status` shows only the above.

## 5. Purchase Order workflows implemented

- Listing: server-side `status/query/supplierId/from/to` filters + `page/pageSize`
  pagination in `listWithFilters`; route parses `?q=&status=&page=`; ListPage
  drives URL filters, `Pagination`, summary cards, empty/error/populated states,
  Draft-only edit actions.
- Create: supplier + product catalogue selection, order/delivery dates,
  server-allocated `PO-` number (custom override with per-org uniqueness check),
  line discounts, doc-level charges/discount, CGST+SGST/IGST slabs, payment
  terms, notes/terms, live totals preview + document preview. All money
  recomputed server-side via `calculatePurchaseOrderTotals`; header + lines
  written in one `$transaction`; creation restricted to Draft/Confirmed.
- Detail/edit: authorized fetch, receiving progress, Confirm/Receive/Cancel/
  Delete/Print actions gated by lifecycle guards; edit route redirects
  non-Draft orders.
- Lifecycle: Draft → Confirmed/Cancelled; Confirmed →
  PartiallyReceived/Received/Cancelled; PartiallyReceived → Received/Cancelled;
  Received/Cancelled terminal. All transitions validated server-side via
  `validatePurchaseOrderStatusTransition`; delete Draft-only.
- Cancellation: `ConfirmDialog`, server-side guard, terminal state, history
  preserved (no hard delete of non-draft documents).
- Receiving: `recordReceivingAction` + `updateItemReceiving` derive
  PartiallyReceived/Received exclusively from recorded receipts; over-receipt
  rejected (`OverReceivingError`); approval alone never marks receipt.
  No inventory/stock side effects (none exist in the app); no speculative
  bill/return/payment modules.

## 6. Purchase Settings — source of truth and data flow

- Source of truth: `purchase_settings` table (one row per org) owned by the new
  `purchase-settings` feature. No duplicate system; nothing stored in Billing
  or Sales Settings.
- Persisted fields (minimum genuinely required): `purchaseOrderPrefix`
  (`PO-`), `purchaseOrderSuffix`, `purchaseOrderNextNumber`,
  `purchaseOrderPadding`, `defaultDeliveryDays` (15), `defaultPaymentTerms`
  (`Net 30 days`), `defaultPurchaseOrderNotes`, `defaultPurchaseOrderTerms`.
- Write path: `PurchaseSettingsPage` (shared Input/Select/Textarea/Button +
  live `formatPurchaseOrderNumber` preview) → `savePurchaseSettingsAction`
  (admin-only via `isOrganizationAdmin`, zod + domain validators, collision
  check against existing orders) → `upsert` → `revalidatePath`
  (`/settings/purchases`, `/purchase-orders`, `/purchase-orders/new`).
- Read path: `getPurchaseSettings()` → `resolvePurchaseSettingsContext()`
  (server org context, never client-supplied) → repository `getSettings`
  (collision-skipped ephemeral defaults when no row exists).
- Consumption: `createPurchaseOrderAction` reads settings server-side inside
  the creation transaction — allocates the number via
  `allocateNextPurchaseOrderNumber` (row lock + collision-skip + sequence
  bump), prefills delivery date/payment terms/notes/terms. Missing settings
  fall back to `DEFAULT_PURCHASE_SETTINGS` semantics.
- Semantics: settings changes affect only subsequent orders; existing orders
  keep stored numbers/terms (covered by DB test); org isolation enforced at
  every query (`organizationId` scoping + cross-org negative tests).

## 7. Supplier and Product integration

- Suppliers: `getSuppliers({status:"ACTIVE"})` for selection,
  `supplierRepository.findById(org, id)` server revalidation, snapshot
  (name/email/address/gstin/place-of-supply/payment-terms) stored on the order.
- Products: `getProducts({status:"ACTIVE"})` catalogue, purchase-price-first
  pricing (`purchasePrice ?? sellingPrice`), HSN/tax prefill,
  `productRepository.findById(org, id)` server revalidation.
- Cross-org supplier/product IDs rejected with
  `InvalidPurchaseOrderReferenceError`; no duplicated models or tax logic
  (`determineTaxMode`, `calculate*Totals` mechanics reused).

## 8. Numbering and transactions

- `PurchaseOrderStatus` enum + `purchase_order`/`purchase_order_item`/
  `purchase_settings` tables, `@@unique([organizationId, orderNumber])`,
  FK `Supplier SetNull`, `Product SetNull`, `Organization Cascade`,
  `Decimal(14,2)` money / `Decimal(12,3)` quantities.
- Creation, allocation, and line writes share one `$transaction`; failure
  leaves no partial rows (DB test asserts count stability).
- `prisma validate` PASS; `prisma generate` PASS; migration SQL hand-written
  to match the `add_sales_orders` precedent (DB-gated `migrate deploy` not
  run — no live database in this environment).

## 9. Organization scoping and authorization evidence

- Every query/mutation resolves org via `getAuthState()` server context;
  client org IDs never trusted.
- Repository reads use `findFirst({where:{id, organizationId}})` /
  composite unique `organizationId_orderNumber`; writes `deleteMany` scoped;
  referenced supplier/product re-fetched per org at mutation time.
- Settings saves require `isOrganizationAdmin`; settings reads/writes scoped
  per org.
- Tests: cross-org find/update rejection, foreign supplier/product rejection,
  non-admin settings rejection, missing-document safe errors, terminal-state
  transition rejection.

## 10. Shared UI components reused

- `form`: Input, Select, DatePicker, Textarea, Label, Button.
- `table`: Table family + Pagination. `ConfirmDialog`, no `Tabs` needed
  (single-section settings page). Lucide icons, `cn()`, semantic tokens only.

## 11. Native controls confirmation

- Grep over both features for `<input|<select|<textarea|<button|`
  `window.confirm|window.alert|window.prompt`: **zero matches**.
- Print uses `window.print()` (not a form control/widget — same as Sales
  detail page). No browser-native date pickers, dialogs, or alerts.

## 12. Verification results

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | PASS |
| ESLint (new + edited) | `npx eslint src/features/purchase-orders src/features/purchase-settings …dashboardNavigation.ts …routes` | PASS |
| New tests | `vitest run src/features/purchase-orders src/features/purchase-settings` | PASS — 7 files, 55 tests (1 DB file skipped, no test DB) |
| Full suite | `npm test` | PASS — 148 files, 979 tests, 0 failures (11 files / 96 tests skipped: DB-gated) |
| Prisma | `prisma validate` / `prisma generate` | PASS |
| Build | `npm run build` | PASS — all `/purchase-orders*` + `/settings/purchases` routes emitted |
| Sweeps | native-control / `any` / color-literal / domain-import / presentation-prisma greps | PASS (Prisma imports infrastructure-only) |

## 13. Exceptions, blockers, deferred decisions

- DB-gated integration suites (`purchase-order-database.test.ts`) SKIP without
  `AVENTRA_TEST_DATABASE_URL`; logic is covered by 55 mocked/pure tests, but a
  migrated test database run is still recommended before release.
- Migration `20261015120000_add_purchase_orders` is written but not applied to
  any live database here; run `prisma migrate deploy` in an environment with
  `DATABASE_URL`.
- Supplier eligibility beyond org-membership/active-listing is undocumented;
  inactive suppliers are excluded from selection but a stale `supplierId` on an
  existing order is preserved as snapshot (matches customer behavior).
- No receiving/inventory side effects implemented — correct per current app
  capabilities; extension point is `updateItemReceiving` status derivation.

## 14. Assessment: PASS

End-to-end Purchase Orders with genuinely wired Purchase Settings, org-scoped
persistence, concurrency-safe numbering, enforced lifecycle, shared-component
UI with zero native controls, and green typecheck/lint/tests/build evidence.
