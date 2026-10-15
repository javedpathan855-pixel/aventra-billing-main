# Remaining Purchase Features Implementation Report — 2026-10-15

## 1. Instructions and rules reviewed

- Root `AGENTS.md` (authority hierarchy, mandatory workflow, non-negotiables).
- All `/rules` files 01–21 (architecture, taxonomy, boundaries, TypeScript,
  styling, components, packages, Prisma, auth, testing, mocks,
  security/a11y/perf, errors/config/git, definition of done, procedure).
- Working tree inspected first; all unrelated prior work preserved.
- Prior purchase reports (orders, bills, refinements) consulted for pattern
  context only.

## 2. Initial state of each feature (verified, not assumed)

- **Purchase Returns / Supplier Payments / Purchase Reports: entirely
  missing.** Repo-wide grep for purchase-return(s)/supplier-payment(s)/
  purchase-report(s) in code: zero hits (one unrelated
  `supplier-payment-terms` form id). Navigation entries existed as
  `planned` placeholders only. No `/purchase-returns`, `/supplier-payments`,
  `/purchase-reports` routes or hrefs.
- **No inventory/stock-movement models or code** (only `Product.trackInventory`,
  `receivedQuantity` columns, and RESTOCK copy). No ledger/journal/bank/
  payable models (only Better-Auth `Account`). No reports feature, no
  dashboard metrics, no CSV/export support anywhere, and `recharts` is not
  installed despite AGENTS.md naming it the default chart system.
- **Reference implementations used**: `sales-returns` (return lifecycle,
  remaining-qty aggregation, returnable-source queries, dispositions),
  `payments` (customer-side record/allocate/reverse with full-allocation
  policy, idempotency + P2002 race handling, FOR UPDATE locking,
  conditional reversal), `purchase-bills`/`purchase-orders` (listing,
  forms, numbering, settings, navigation, test conventions),
  `purchase-settings` (single settings source, allocation pattern).

## 3. Final architecture and directory structure

```
src/features/purchase-returns/      # domain/data/presentation/infrastructure + index.ts
  domain/{entities,rules(totals/remaining/lifecycle),repositories,errors}
  data/{dto,validators,context,queries(get,list,by-id,by-number,returnable-bills),
        mutations(create,status,delete)}
  infrastructure/{mappers,repositories}
  presentation/{components ×9,page(List,Create,Detail)}
src/features/supplier-payments/     # domain/data/presentation/infrastructure + index.ts
  domain/{supplier-payment(entity+allocation helpers),rules(eligibility/availability),repositories,errors}
  data/{dto,validators,context,queries(payments,payable-bills),mutations(record,reverse)}
  infrastructure/{mappers,repositories}
  presentation/{components ×7,page(List,Create,Detail)}
src/features/purchase-reports/      # domain/data/presentation/infrastructure + index.ts
  domain/{entities(metric definitions+outstanding calc),repositories,errors}
  data/{context,queries}
  infrastructure/{repositories(aggregate/groupBy)}
  presentation/{components ×7,page(ReportsPage)}
src/app/(app)/{purchase-returns/{page,new,[id]},supplier-payments/{page,new,[id]},purchase-reports/page}
```

Dependency direction preserved throughout; domain imports nothing but
domain/shared-money types; presentation never touches Prisma.
Cross-feature imports follow the sanctioned precedent (public barrels for
types, server-side repository lookups for ownership validation):
returns→suppliers/products/bills/orders/settings/invoices(determineTaxMode);
payments→suppliers/bills/auth; reports→none at runtime (own aggregates);
bill detail route→supplier-payments + purchase-reports (type + queries).

## 4. Files created and modified

- Created: 3 features (~60 source/test files), 8 app routes, 2 migrations,
  this report.
- Modified: `prisma/schema.prisma` (4 models, 1 enum, enum reuse ×2,
  7 settings columns, 8 reverse relations); `purchase-settings`
  (entity/rules/repo-contract/DTO/schemas/mapper/infra-repo incl.
  `allocateNextPurchaseReturnNumber`, index, returns form card + preview,
  rules + page tests); `purchase-bills` detail page + route (payments card
  wiring) + new `BillPaymentsCard`; `dashboardNavigation.ts` (3 entries
  planned→available + hrefs) + its test (24 available, destinations,
  route-resolution).
- No unrelated files touched; no commits or pushes.

## 5. Purchase Returns workflows and side effects

- Listing (server filters + pagination + cards), create (bill prefill with
  remaining quantities, manual lines, dispositions, settings reason/notes/
  terms defaults, PR- allocation, draft or approve-on-create), detail
  (Draft→Approve→Complete, Cancel from Draft/Approved, Draft-only delete,
  bill banner, print document), custom-number support with per-org
  uniqueness.
- Remaining quantities enforced **inside the creation transaction** against
  authoritative aggregates (non-cancelled returns), so concurrent returns
  cannot over-return; pre-checks outside transactions are display-only.
- Source eligibility: bills must be Confirmed and same-supplier; orders
  existence-checked. Partial returns fully supported via remaining balances.
- **Side effects: none by design.** No inventory writes (no stock models
  exist — same as sales-returns, which also writes none despite RESTOCK
  copy), no credit-note generation (no supplier-side credit model exists;
  debit-notes are customer-side), no bill mutation on return.
  Dispositions classify lines only. All documented in code and UI copy.

## 6. Supplier Payments workflows and allocation semantics

- New `SupplierPayment` + `SupplierPaymentAllocation` models (own tables;
  customer `Payment` untouched), reusing Prisma `PaymentMethod`/
  `PaymentStatus` enums. Statuses Active/Reversed; reversal is a
  conditional state transition, never a delete.
- Record (admin-only): full-allocation equality enforced, future dates
  rejected, supplier/bill ownership + Confirmed-eligibility + same-supplier
  verified, per-bill outstanding enforced in-transaction under FOR UPDATE
  locks in sorted order, idempotency pre-check + P2002 race returns the
  winner, `spay_`/`spalloc_` ids.
- Reverse (admin-only): conditional Active-only transition (repeat-safe),
  bills locked, outstanding recomputed (no bill writes needed — nothing
  derived is stored). No edit action (allocations immutable, mirroring
  customer payments).
- Outstanding = bill.total − active allocations, always computed; bill
  statuses never change on payment. Bill detail page shows a payments card
  (Billed/Paid/Outstanding + linked payments + Record Payment shortcut).
- No bank/cash accounts (none exist), no advance/unallocated balances
  (full-allocation policy, mirroring customer payments), no ledger postings
  (no ledger exists) — all documented.

## 7. Purchase Reports implemented and metric definitions

Seven sections from real authorized data (server aggregate/groupBy, bounded
display rows, no N+1, no browser-side dataset loading):
- Summary cards: Gross (Confirmed bills), Returns (Completed),
  Net = gross − returns, Outstanding payables.
- Purchases by supplier (gross/returns/net/tax/outstanding; exact,
  truncation-proof via grouped aggregates).
- Outstanding payables (per-bill rows capped at 200 by due date with
  explicit truncation note; totals exact over the full set).
- Input tax (CGST/SGST/IGST gross, returns tax, net) + reconciliation panel.
- Payments (active only, by method + by supplier).
- Orders and returns by status (counts + totals).
- Filters: date range + supplier, URL-driven, applied server-side to every
  query. Draft/Cancelled bills and non-completed returns excluded from
  completed-purchase figures (documented in domain types).
- No charts (recharts not installed; tables + cards are the established
  convention — installing a library was not justified) and no CSV export
  (no export support exists anywhere in the repo).

## 8. Purchase Settings source of truth and wiring

- Single `purchase_settings` row extended in place — no parallel systems:
  `purchaseReturnPrefix` (`PR-`) / Suffix / NextNumber / Padding,
  `defaultPurchaseReturnReason`, `defaultPurchaseReturnNotes`,
  `defaultPurchaseReturnTerms`. Supplier payments need no settings
  (mirrors customer payments, which have no numbering/defaults);
  reports need none (no established report-config requirement).
- Returns consume numbering (`allocateNextPurchaseReturnNumber`: row lock +
  collision-skip) and reason/notes/terms defaults through the same
  server-side paths as orders/bills; form card + live `PR-` preview added
  to the existing settings form; missing settings fall back to defaults;
  history never renumbered (tested).
- Data flow demonstrated by tests: configured `RET/00007` allocated,
  defaults prefilled, settings change leaves history intact.

## 9. Integrations

- Returns ↔ bills (validated link + remaining enforcement + snapshot +
  bill revalidation), returns ↔ orders (existence link), payments ↔ bills
  (eligibility + allocation + revalidation), payments → bill detail card,
  reports → bills/returns/payments/orders aggregates, all features →
  suppliers/products/settings/invoices(tax).
- Narrow bills-feature edits only: detail page payments card + route
  wiring. No changes to orders, suppliers, settings behavior, invoices, or
  customer payments.

## 10. Organization-scoping and authorization evidence

- All queries/mutations resolve org from `getAuthState()` server context;
  every repository call carries `organizationId`; deletes are scoped
  `deleteMany`; supplier/product/bill/order ownership re-validated per
  mutation; payments record/reverse require `isOrganizationAdmin`;
  settings saves unchanged (admin-only).
- Negative tests: cross-org bill/return/payment access, foreign
  supplier/product/bill/order references, supplier-mismatch links,
  cancelled/draft source rejection, non-admin payment record/reverse,
  missing-document safe errors, terminal-state transitions, over-return,
  over-allocation, partial-allocation mismatch, duplicate idempotency
  handling. No DB internals leak (P2002 mapped in repositories).

## 11. Shared UI and native-control audit

- Reused: Input, Select, DatePicker, Textarea, Label, Checkbox, Button,
  Table family, Pagination, ConfirmDialog, Tabs-free pages, Lucide icons,
  `cn()`, semantic tokens, shared `formatCurrency`/`roundCurrency`,
  `formatSupplierAddress`, `determineTaxMode`.
- Grep over all three features + routes for `<input|<select|<textarea|`
  `<button|window.confirm|window.alert|window.prompt`: **zero matches**
  (one shared-`Checkbox` replaced a raw checkbox during implementation).
  Print uses `window.print()` only, matching sibling pages.

## 12. Database/migration changes

- `20261015120002_add_purchase_returns_payments_reports`: `PurchaseReturn`,
  `PurchaseReturnItem`, `SupplierPayment`, `SupplierPaymentAllocation`,
  `PurchaseReturnStatus` enum, 7 `purchase_settings` columns, 8 reverse
  relations, indexes incl. `@@unique([organizationId, returnNumber])`.
- `20261015120003_add_purchase_return_terms`: `purchase_return.terms`
  (keeps the new terms default wired instead of dead).
- Partial-index-free design: return over-quantity is enforced
  transactionally (uniqueness constraints cannot express it).
- Migration validation: `validate`/`generate` PASS; fresh `migrate deploy`
  replay of all 18 migrations on a scratch database PASS. History repair
  (same playbook as the bills task): the first stamp sorted before a prior
  hand-stamped migration, so empty objects were reverted on local dev,
  history row removed, directory renamed past it, re-applied, replay
  re-proven. Local-dev only, documented, zero data loss (objects were
  empty/unreleased).

## 13. Tests and verification results

| Check | Command | Result |
|---|---|---|
| Focused (returns, payments, reports, settings, dashboard, bills, orders) | `vitest run …` | PASS — 31 files, 251 tests |
| Full suite + isolated scratch test DB | `vitest run` with `AVENTRA_TEST_DATABASE_URL` | PASS — **182 files, 1166 tests, 0 failures** (incl. new DB suites: 5 returns, 5 payments, 4 reports tests covering totals, remaining enforcement, dedup-by-aggregation, idempotency, reversal, isolation, atomicity, reconciliation) |
| Full suite, standard state (no test DB) | `npm test` | PASS — 167 files, 1062 tests, 15 DB suites skipped |
| Typecheck | `npx tsc --noEmit` | PASS, exit 0 |
| ESLint (all touched scopes) | `npx eslint …` | PASS (3 unused-import warnings found and fixed during implementation) |
| Prisma | `validate` / `generate` / `migrate dev` + scratch `migrate deploy` | PASS |
| Production build | `npm run build` | PASS — all 8 new routes emitted |
| Sweeps | native-control / `any` / color / domain-import / presentation-prisma greps | PASS |

One full-run showed a single flaky failure in unrelated
`recurring-database.test.ts`; it passes in isolation and on re-run
(182/182, 1166/1166 both runs). Scratch test DB and helper scripts were
removed afterwards; no environment side effects remain.

## 14. Remaining exceptions, limitations, deferred decisions

- No live-browser walkthrough (authenticated routes, no session available);
  UI parity evidenced by shared class-level patterns plus static-render
  assertions (headers, filters, pagination, exact `₹` figures, badges,
  empty states).
- Draft returns/bills cannot be edited after creation beyond status/delete
  semantics (mirrors sales-returns; returns have no draft-edit by design).
- Returns do not reduce bill outstanding (no supplier credit-note model);
  stated in reports UI, reconciliation copy, domain comments, and this
  report.
- No inventory postings, no ledger/journal, no bank accounts, no CSV
  export, no charts — none exist in the app to integrate with; each is
  recorded as a documented boundary, not a silent omission.
- `getPayableBills` caps at 100 rows (form use-case, supplier-scoped);
  report outstanding uses its own bounded aggregate path.

## 15. Status per feature

- **Purchase Returns: PASS** — end-to-end (list/create/detail/approve/
  complete/cancel/delete), settings-driven PR- numbering, remaining-qty
  enforcement, bill/order linkage, verified finances, green checks.
- **Supplier Payments: PASS** — end-to-end (list/create/detail/reverse),
  full-allocation + outstanding enforcement, idempotency, bill integration,
  green checks.
- **Purchase Reports: PASS** — seven real-data sections with documented
  reconciling definitions, server-side org-scoped aggregation and
  filters, green checks.
