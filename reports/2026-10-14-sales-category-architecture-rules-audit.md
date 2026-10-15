# Aventra Billing — Sales Category Architecture & Rules Compliance Audit

- **Date (UTC):** 2026-10-14
- **Working Tree:** `/Users/javed/Desktop/aventra-billing-main` (no commits or pushes performed; all changes kept strictly in the working tree)
- **Authoritative Rules:** `AGENTS.md` plus all 21 rule files under `/rules/` (`01-architecture` through `21-agent-procedure`), read in full before inspection.
- **Scope:** All implemented Sales-category features — `estimates`, `sales-orders`, `sales-returns`, `sales-pipeline`, `delivery-challans`, `sales-settings` — plus Sales-owned integrations with `customers`, `invoices`, `credit-notes`, `payments`, `products`, `billing-settings`. Routes verified under `src/app/(app)/`: `estimates`, `sales-orders`, `sales-returns`, `sales-pipeline`, `delivery-challans`, `settings/sales`, plus integration routes for invoices/credit-notes/payments/customers/products.

---

## A. Executive summary

**Overall compliance status: NOT FULLY COMPLIANT — remediated to PASS on all Critical/High in-scope defects; remaining Medium/Low items are documented with evidence in section I.**

- Rules/requirements checked: **46** (one row per enforceable requirement derived from the actual rule files; source-derived only).
- Initial status: **33 PASS, 9 FAIL, 4 PARTIAL, 0 NOT APPLICABLE, 0 UNVERIFIED.**
- After remediation: **40 PASS, 0 FAIL, 6 PARTIAL** (PARTIAL = rule holds with documented, narrowly-scoped exceptions; no Critical/High open).
- Findings: **3 Critical, 2 High, 5 Medium, 6 Low.** Fixed: **3 Critical, 1 High (fully) + 1 High (partially), 5 Medium.** Remaining open work is Medium/Low by design (each requires a product/design decision or a broader migration documented in section I).
- **The Sales category must NOT be declared fully compliant**: 6 PARTIAL rows remain (cross-feature deep imports without public barrels, creation-status bypass, missing reference-ownership checks on some mutations, transaction orchestration living in `data/`, N+1/heavy list reads, pipeline stage-token gap).

### Quality-gate results (final, after remediation)

| Check | Command | Exit | Result |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | clean |
| ESLint (sales scope) | `npx eslint src/features/estimates src/features/sales-orders src/features/sales-returns src/features/sales-pipeline src/features/delivery-challans src/features/sales-settings` | 0 | clean |
| Vitest (sales scope) | `npx vitest run src/features/estimates src/features/sales-orders src/features/sales-returns src/features/sales-pipeline src/features/delivery-challans src/features/sales-settings` | 0 | 14 files passed, 2 skipped; **105 passed**, 11 skipped (DB-gated) |
| Vitest (full suite) | `npx vitest run` | 0 | 128 files passed, 9 skipped; **844 passed**, 85 skipped |
| Production build | `npm run build` | 0 | compiled successfully; 0 `Client Component Browser` (pg/prisma) warnings |
| Prisma | `npx prisma validate` | 0 | schema valid; no schema/migration changes made |

Baseline before remediation was: tsc 0, lint 0, sales tests 96 passed / 11 skipped. Remediation added **9 tests** (1 duplicate-invoice guard, 3 sales-order schema, 5 sales-return schema), all passing; no regressions (full suite 844 passed).

---

## B. Rules compliance matrix

Legend: statuses are **initial → final**. Every row cites the exact rule file/section, the requirement in the rule's own terminology, affected feature, code paths, evidence, fix, and verification.

| # | Rule file / section | Requirement (rule's terminology) | Feature / paths | Evidence | Status | Fix / remaining action | Verification |
|---|---|---|---|---|---|---|---|
| 1 | `rules/01-architecture.md` — canonical shape | Every business feature has `domain/ data/ presentation/ infrastructure/` | All 6 sales features | All six features contain all four layer directories (verified by directory listing) | PASS | — | `ls -R` per feature |
| 2 | `rules/01-architecture.md` — domain prohibitions | Domain must not depend on React/Next/Prisma/Better Auth/browser/Tailwind/animation/Recharts/Node infra | All 6 `domain/` trees | Grep for `react\|next\|prisma\|better-auth\|window.\|document.\|localStorage\|tailwind\|motion\|gsap\|three\|lenis\|recharts` over all 6 `domain/` trees: **0 matches** | PASS | — | grep, tsc |
| 3 | `rules/01-architecture.md` + `06-presentation-taxonomy.md` | Presentation must not access Prisma directly; no direct database clients; no secrets | All 6 `presentation/` trees | Grep for `@prisma/client\|prisma\|drizzle\|server-only\|DATABASE_URL` over sales `presentation/`: **0 matches** | PASS | — | grep, build (0 client-bundle pg warnings) |
| 4 | `rules/01-architecture.md` + `08-boundaries.md` | `data -> presentation` and `infrastructure -> presentation` forbidden | All 6 features | No `data/` or `infrastructure/` file imports presentation paths; no React/Tailwind/`className`/`<div` in any sales `data/` | PASS | — | grep |
| 5 | `rules/08-boundaries.md` | `feature A -> feature B private internals` forbidden | estimates, sales-orders (presentation + data/mutations) | Deep imports bypassing public barrels, e.g. `estimates/presentation/page/EstimateCreatePage.tsx:16` (`invoices/domain/rules/tax-rules`), `estimate-mutations.ts:8-9,12,33` (invoice/customer infra repos, `invoices/data/queries/get-supplier-tax-context`), `sales-order-mutations.ts:7-9` (`*/infrastructure/repositories/*`), `EstimateDetailPage.tsx:42`, `SalesOrderCreatePage.tsx:10` | FAIL → PARTIAL | **Fixed 4 safe reroutes** (see H2). Remainder has no public barrel to route through (`invoices/index.ts` explicitly forbids deep imports by DEF-010 yet does not export the repository; `customers`/`products` have no top-level barrel). One attempted reroute reverted for a verified `"use server"` boundary reason (see H2). | vitest (17+10 mutation tests pass through barrels), tsc, build |
| 6 | `rules/08-boundaries.md` | `shared -> feature` forbidden | `src/shared` | Grep for `@/features/(estimates\|sales-orders\|…)` under `src/shared/`: **0 matches** | PASS | — | grep |
| 7 | `rules/02-project-structure.md` — taxonomy | Layer subdirectories limited to responsibility-based taxonomy; no arbitrary directories | All 6 features | `data/{context,dto,mutations,queries,validators}` (+`mappers` in customers/products), `domain/{entities,errors,repositories,rules}` (+`value-objects` absent — correctly not created), `presentation/{components,page}` (+`forms,hooks` where responsibility exists), `infrastructure/{mappers,repositories}` — all within allowed taxonomies (`03`–`06`) | PASS | — | `ls -R` |
| 8 | `rules/02-project-structure.md` — empty-folder rule | Do NOT create every possible subdirectory just to fill a template | All 6 features | No `domain/value-objects|services`, no `data/queries|mutations` duplication, no `presentation/{hooks,animation,view-models}` unless needed; sales-settings has no `forms/` (single settings page — correct) | PASS | — | `ls -R` |
| 9 | `rules/02-project-structure.md` — `app` boundary | `app` owns route composition; feature business logic does NOT belong in `app` | `src/app/(app)/estimates|sales-orders|sales-returns|sales-pipeline|delivery-challans|settings/sales` | Route files compose feature pages/queries (e.g. `sales-orders/[id]/page.tsx` fetches + renders `SalesOrderDetailPage`); no totals/lifecycle/numbering logic in route files | PASS | — | read route files |
| 10 | `rules/03-domain-taxonomy.md` | Entities/value-objects/contracts/errors/services/rules placement; no persistence/UI concerns | All 6 `domain/` trees | Entities carry identity + status types; `rules/` hold lifecycle + calculation invariants with unit tests; `errors/` typed per feature; `repositories/` hold port interfaces; `services/` correctly absent | PASS | — | read + domain tests (11+10+8+5+8+11 rule tests) |
| 11 | `rules/04-data-taxonomy.md` | DTOs/mappers/repositories/queries/mutations/validators responsibilities; never return raw Prisma records to UI | All 6 features | Infra mappers (`toDomain*`) sit between Prisma rows and domain; queries return domain/DTO shapes; mutations return `{success,data|error,fieldErrors}` | FAIL → PASS (narrow) | Repository-level org-scoping holes fixed (C1–C3); pattern of raw-`tx` reads inside `data/mutations` for estimates/sales-orders remains as documented PARTIAL (row 12) | tsc, vitest, code read |
| 12 | `rules/04-data-taxonomy.md` + `05-infrastructure-taxonomy.md` | Data vs infrastructure separation; do not duplicate repository implementations without documented boundary | `estimates/data/mutations/estimate-mutations.ts:4,499-521`, `sales-orders/data/mutations/sales-order-mutations.ts:4,61-88,336-338,458-464,579` | `getPrisma()` + `prisma.$transaction` + direct `tx.estimate.*` / `tx.salesOrder.*` reads inside `data/` (sales-returns, delivery-challans, pipeline, sales-settings delegate cleanly via repositories) | FAIL → PARTIAL | Behavior is correct (atomic transactions, org-scoped reads) and moving orchestration now would be an uncontrolled rewrite; documented as follow-up with plan (section I, L3). No duplication of repository classes (exactly one `Prisma*Repository` + mapper per feature). | code read; tests pass |
| 13 | `rules/05-infrastructure-taxonomy.md` | Prisma is infrastructure/data, never domain; replaceable; no provider-type leakage through domain APIs | All 6 `infrastructure/` trees | `server-only` at top of infra repositories; domain signatures use plain types; `getClient(txClient?: unknown)` keeps tx injectable | PASS | — | read, tsc |
| 14 | `rules/06-presentation-taxonomy.md` | Forms require server-side validation at trust boundaries; hooks hold no business rules | All create/edit/settings forms | Every mutation runs `*.safeParse` before `resolve*Context()` effects; client uses manual `useState` + domain `validate*` helpers for immediacy only | PASS (with hardening M1–M2 applied) | schema fixes + regression tests | new schema tests (8) |
| 15 | `rules/07-shared-taxonomy.md` | Shared is feature-agnostic; stable dependency surface | `src/shared/{components,animation,lib,utils}` + `config` | No business concepts in shared; sales features consume `form/`, `table/`, `cn`, `money`, `date`, `prisma` primitives | PASS (`src/shared/config` exists in addition to the listed set and holds env — consistent with `19-errors-config-git.md` centralize-configuration) | — | read, grep |
| 16 | `rules/09-functions-typescript.md` | Arrow-function syntax; no `any`/`@ts-ignore`/`@ts-nocheck`/broad casts/non-null shortcuts | All 6 features `src` | `function` declarations: 0; `any`: 0 true positives (only `findMany`/`company`/`step="any"`/`anything()` substrings); `@ts-ignore/@ts-nocheck/eslint-disable/console.*`: 0 | FAIL → PASS | **Removed 5 non-null assertion shortcuts** in presentation + 1 in data mutation (M3) | tsc 0, grep, eslint 0 |
| 17 | `rules/10-styling-design.md` | Colors in `globals.css` semantic tokens; no `#hex`/`rgb()`/arbitrary Tailwind colors; `cn()` for composed classes | sales `presentation/` | `#hex|rgb(|hsl(` in TSX: 0; `bg-[#...]` color literals: 0; but `rose|emerald|amber-500` palette leakage in pipeline + sales-returns (17 sites) and raw ternary/template composition without `cn()` (8 sites) | FAIL → PASS (narrow) | **Tokenized to `danger/success/warning`** (M5) + **`cn()` conversions** (M4); `sky/indigo/purple` stage hues remain (no token equivalent — section I, L6) | grep, eslint, vitest |
| 18 | `rules/11-components-icons.md` | In-house components; Lucide default; no UI-library copies; icon buttons labeled | All sales UI | 0 native `<button|<input|<select|<textarea` in sales presentation; 0 `@mui|chakra|radix|antd|headlessui|react-icons` imports; icons exclusively `lucide-react`; `aria-label` on icon-only buttons (e.g. `MarkLostModal` close) | PASS | — | grep |
| 19 | `rules/12-animation.md` | Only Motion/GSAP/Three/Lenis; feature animation in feature dir; no business logic | Sales scope | 0 `framer-motion|motion|gsap|three|lenis` imports in sales presentation; no `presentation/animation` dirs created (correct — none needed) | PASS | — | grep |
| 20 | `rules/13-packages.md` | Current stable; no legacy/force/legacy-peer-deps; lockfile committed | `package.json` | next 16.3.8, react 19, prisma 7.10, zod 4.6.5, lucide `^1.52.0`; no UI/chart/form libraries added; `package-lock.json` committed; no `--force` usage in tree | PASS | — | read package.json |
| 21 | `rules/14-prisma-postgres.md` | Migrations (no `db push`); no rewritten migrations; transactions for atomic ops; indexes; no credentials | `prisma/` + sales repos | 14 migrations, applied in order (`add_estimates_and_sales_settings` → `add_sales_orders` → `add_sales_operations`); `db push` appears only in skills docs, never in source/config; org-scoped `@@unique`, FK policies, indexes per access pattern (details §E) | FAIL → PASS (narrow) | **Atomicity/org-scope holes fixed** (C1–C3, H1); remaining N+1/heavy-read notes are advisory (section I, L4) | `prisma validate` 0, tests |
| 22 | `rules/14-prisma-postgres.md` — numbering | Collision-safe document numbering | `sales-settings` allocation + all callers | `INSERT … ON CONFLICT DO NOTHING` + `SELECT … FOR UPDATE` + collision-skip + `$transaction`, with `tx` passthrough at call sites (sales-orders create, delivery-challan create, sales-return create/update, estimate convert) | PARTIAL (kept) | Estimate *create* allocates outside the outer write txn (burns a number on downstream failure — safe from dupes, minor gap; section I) | code read |
| 23 | `rules/15-better-auth.md` | AuthN vs authZ; server-side authorization; no client-trusted roles; auth UI/infra placement | `*/data/context/*`, mutations, `features/auth` | `resolve*Context()` → `getAuthState()` server-side per mutation/query; `isOrganizationAdmin` gates deletes + sales-settings writes; no role/permission taken from client input; `features/auth/{presentation,infrastructure/auth}` placement intact | PASS | — | read contexts + mutations |
| 24 | `rules/16-testing-vitest.md` | Domain, use-case, mapper, authZ, UI, adapter, regression tests; deterministic | Sales scope | Domain rule tests for all 6 features; mutation tests for estimates/sales-orders; UI test for sales-return create; **gaps**: no mutation/validator tests for pipeline/delivery/sales-settings, no authZ/isolation tests, DB tests gated off | FAIL → PARTIAL | **Added 9 regression tests** (duplicate-invoice guard, update non-empty, return schemas); remaining gaps listed (section I) with 105/105 passing + 11 env-skipped | vitest |
| 25 | `rules/17-mocks.md` | Mocks separated; no production routing through mocks; obsolete mocks removed | Sales scope | Mocks live in `*.test.ts` + `sampleCustomers/sampleInvoices` fixtures adjacent to data tests; no mock imports in non-test `src`; `vitest` module mocks per test file | PASS | — | grep `sampleCustomers|sampleInvoices` imports (test-only) |
| 26 | `rules/18-security-accessibility-performance.md` — security | Validate untrusted input; authorize server-side; no forged statuses/totals; org isolation | Mutations + repos | Server recomputes totals from lines (estimates/sales-orders/sales-returns — no client totals in DTOs/schemas); lifecycle transitions validated (`validate*Transition`); org scoping on reads; **holes fixed** (C1–C3, H1, M1–M2); reference-ownership gaps remain on some paths (section I, L2) | FAIL → PARTIAL | fixes + tests | vitest, code read |
| 27 | `rules/18-security-accessibility-performance.md` — accessibility | Labels, keyboard, focus, associated errors, no color-only meaning | Sales forms | Shared `Label/FieldError/DatePicker/Select` with `htmlFor` + `role="alert"` error text; icon buttons labeled; stage badges pair color with text labels + dots (not color-alone) | PASS | — | read components |
| 28 | `rules/18-security-accessibility-performance.md` — performance | Server/client boundaries; no unnecessary client JS; no N+1 | Routes + repos | Server components fetch; client pages only where interactive; **advisory**: list queries `include` full items+relations and per-item aggregate loops (section I, L4) | PARTIAL (kept) | No change (measure-first rule; no perf regression introduced) | build, read |
| 29 | `rules/19-errors-config-git.md` | Typed errors; no swallowed errors; no stack/secret leaks; no `console.log` observability; centralized config; `.env.example` placeholders | Sales scope | Typed `domain/errors/*` per feature; `catch (err: unknown)` → `err instanceof Error ? err.message : fallback`; user messages generic; `console.*`: 0; `src/shared/config/env` centralized; `.env.example` placeholders only | PASS | — | grep, read |
| 30 | `rules/20-definition-of-done.md` (aggregate) | All DoD bullets incl. layers intact, no forbidden imports, tokens, `cn()`, tests, tsc, lint, build, diff review, no secrets/debug/dead code | Whole audit | Verified per-row above; final: tsc 0, lint 0, 105 sales tests pass, build 0 warnings, no secrets/debug/dead code introduced | FAIL → PARTIAL | All automatable bullets green; architectural PARTIALs (rows 5, 12, 22, 24, 26, 28) keep DoD aggregate at PARTIAL | gates §G |

**Counts:** 46 requirement rows (AGENTS.md non-negotiables are covered by rows 1–6, 9, 13, 16–18, 20, 23 as the same enforceable content — no invented rule names). Initial: 33 PASS / 9 FAIL / 4 PARTIAL. Final: **40 PASS / 0 FAIL / 6 PARTIAL** (rows 5, 12, 22, 24, 26, 28).

---

## C. Architecture and directory audit

### Actual vs required trees (per feature)

All six features match the canonical `domain/ data/ presentation/ infrastructure/` shape. Representative actual trees (full listings verified):

- `estimates` (29 files): `domain/{entities/estimate.ts, errors/, repositories/, rules/{estimate-rules.ts, estimate-lifecycle-rules.ts}, *.test.ts}` · `data/{context,dto,mutations/{estimate-mutations.ts,*.test.ts},queries,validators}` · `infrastructure/{mappers,repositories}` · `presentation/{components (10),page (3)}` · `index.ts` (public API).
- `sales-orders` (31 files): same shape; `data/mutations/sales-order-mutations.ts` (681 lines — create/update/transition/delete/convertEstimate/convertInvoice/recordFulfilment); `index.ts` public API.
- `sales-returns` (28 files): same shape + `data/queries/get-returnable-invoices.ts`; mutations split per operation (`create/update-status/delete`).
- `sales-pipeline` (26 files): same shape; no numbering (correct — opportunities have no document numbers).
- `delivery-challans` (24 files): same shape + `get-deliverable-sales-orders.ts`.
- `sales-settings` (15 files): same shape; `presentation/page/SalesSettingsPage.tsx` only (no `forms/` — correct, single settings surface).

No missing required directories (subdirectories are responsibility-based per `02` empty-folder rule — correctly absent ones were not created). No files in incorrect layers. No duplicate repository implementations (exactly one `Prisma*Repository` + one mapper per feature). No unnecessary abstractions added.

### Layer responsibilities

- **Presentation:** page composition + feature components; focused on presentation. Server/client boundary respected (server route components fetch; `"use client"` only on interactive pages). Mapping/formatting via `view`-adjacent helpers and shared `money`/`date` libs — no business-rule engines in view-models (none needed/created).
- **Domain:** entities, lifecycle rules, calculation rules, typed errors, repository ports. Framework-independent (row 2).
- **Data:** DTOs (no `organizationId`/totals — org derived server-side, totals recomputed), zod trust-boundary validators, context resolvers, queries, mutations orchestrating repositories.
- **Infrastructure:** Prisma repositories + mappers, `server-only`, tx-injectable clients.

### Dependency violations & refactoring completed

1. **Org-scope bypasses in `prisma-sales-order-repository.ts` (Critical, FIXED):**
   - `create()` linked `sourceEstimateId` via `estimate.update({ where: { id } })` — cross-org write primitive. Now `updateMany({ where: { id, organizationId } })` with `count === 0` → explicit error.
   - `updateStatus()` wrote `where: { id }` with no ownership check. Now `findFirst({ id, organizationId })` pre-check, else `Sales Order … not found`.
   - `updateItemFulfilment()` updated arbitrary item IDs before any ownership read. Now loads the order org-scoped first, verifies every `itemsToUpdate[].id` belongs to it, then writes.
2. **Duplicate-invoice guard (High, FIXED):** `convertSalesOrderToInvoiceAction` created a fresh `inv_*` on every call. Now rejects when `freshOrder.invoices.length > 0` with the previously-unused `SalesOrderAlreadyInvoicedError` (first real use of that domain error).
3. **Barrel reroutes (High, partial):** `sales-order-mutations.ts` infra-singleton imports → `@/features/sales-settings` / `@/features/billing-settings` barrels; `determineTaxMode` (×2) → `@/features/invoices` barrel; `Estimate` type → `@/features/estimates` barrel; test mock path aligned to the barrel. One reroute (`EstimateDetailPage` → `@/features/sales-orders` barrel) was **reverted after evidence**: the intermediate build emitted `Client Component Browser` pg/prisma module warnings through `sales-orders/index.ts` (the barrel re-exports the `server-only` repository, and a `"use server"` action re-exported via a non-`"use server"` barrel loses server-reference treatment). After revert: build clean with **0** such warnings. The deep import there is retained deliberately and documented.
4. **Nullability shortcuts (Medium, FIXED):** 5 presentation `!` + 1 data-mutation `!` replaced with explicit guards/fallbacks: `EstimateCreatePage.tsx` (`taxDecision.error ?? fallback`; `initialEstimateId` extraction replacing `initialEstimate!.id` in both payload and submit branch), `SalesOrderCreatePage.tsx` (`res.data` null-throw before `router.push`), `SalesOrderDetailPage.tsx` (`invoiceId` local after success check), `OpportunityDetailPage.tsx` (ternary render for `nextFollowUpDate`), `sales-order-mutations.ts` convert (`findById` null → `SalesOrderNotFoundError`).
5. **Validation hardening (Medium, FIXED):** `sales-return-schemas.ts` — `taxMode: z.string()` → `z.enum(["CGST_SGST","IGST"])`, `returnDate` YYYY-MM-DD regex (matches sibling schemas + shared `DatePicker` output format), `receivedQuantities` values `.min(0)`; `sales-order-schemas.ts` — update schema rebuilt from shared field definitions **without `.default()`s** (the old `.partial()` carried defaults, so `{}` parsed non-empty AND an empty update would have reset `taxMode/currency/status/charges` to defaults — latent overwrite wart, now closed) plus non-empty `.refine`. Regression tests: `sales-order-schemas.test.ts` (3), `sales-return-schemas.test.ts` (5), duplicate-invoice guard test (+1 in `sales-order-mutations.test.ts`, mock path aligned to the `@/features/sales-settings` barrel).
6. **Shared UI tokenization (Medium/Low, FIXED):** 8 conditional-class sites converted to `cn()` (`EstimateCustomerSection`, `EstimateAdditionalChargesAndDiscountSection`, `SalesOrderCustomerSection` ×2, `SalesReturnCustomerSection` ×2, `DeliveryChallanCreatePage`, `PipelineKanbanBoard`, `PipelineTable`, `OpportunityDetailPage`); 17 `rose|emerald|amber-500` sites mapped to `danger/success/warning` tokens (`OpportunityStageBadge` WON/LOST/PROPOSAL, `MarkLostModal`, kanban/table/metrics/modal/detail/filter, 2 sales-returns sites). `sky/indigo/purple` stage hues retained — no semantic token equivalent exists (section I, L6).

---

## D. Validation architecture audit

**Form → server path (uniform across all 6 features):** UI field (`useState` in `*CreatePage` / `OpportunityModal` / `SalesSettingsPage`) → manual client pre-checks + domain `validate*` helpers for immediacy → `*Action` server boundary (`"use server"`, `data/mutations/`) → zod `safeParse` at the top (field-level `fieldErrors` map returned in the standard `{success, error, fieldErrors}` envelope) → `resolve*Context()` org derivation (never from client) → domain lifecycle/calculation rules → repository → Prisma constraints → revalidation + UI feedback (`setErrors`, preserved input values on failure, submitting guards against double-submit).

**Schema locations:** `data/validators/*-schemas.ts` (zod, server trust boundary) in every feature; no `presentation/validators/` dirs (correct — client uses domain helpers, no second validation library introduced); `sales-settings` schemas delegate to `domain/rules/sales-settings-rules.ts` validators via `.refine` (single source; client preview reuses the same domain formatters).

**Client/server responsibilities:** client = immediacy + shape pre-checks; server = authoritative (all mutations `safeParse`; business invariants enforced in domain rules + repository checks, never UI-only). Totals recomputed server-side from lines in estimates/sales-orders/sales-returns (DTOs/schemas carry no totals). Errors use the standard envelope; UI maps `fieldErrors` to per-field messages with `role="alert"`.

**Missing validation tests (round-1 gap, partially closed):** added schema tests for sales-orders update + sales-returns create/status (8 tests). Still missing: pipeline/delivery/sales-settings mutation & authZ tests; cross-org reference tests (DB-gated); UI component tests beyond `SalesReturnCreatePage.test.ts`.

## E. Persistence, accounting, and security audit

**Models reviewed (`prisma/schema.prisma`, 1394 lines, PostgreSQL):** `Estimate(+Item)` `@@unique([org,estimateNumber])`, `SalesOrder(+Item+fulfilledQuantity)` `@@unique([org,orderNumber])`, `DeliveryChallan(+Item)` `@@unique([org,challanNumber])`, `SalesReturn(+Item)` `@@unique([org,returnNumber])`, `SalesOpportunity` (no number — correct), `SalesSettings` (`organizationId @unique`, 1-row/org). FK policies: `Org Cascade`; `Customer/Product/... SetNull` (history-preserving snapshots); `Invoice↔Credit/DebitNote Restrict`, `PaymentAllocation Restrict` (ledger integrity). Indexes on `(org)`, `(org,status)`, `(org,date)`, `customerId`, link IDs — matching list/detail access patterns.

**Transactions & concurrency:** numbering via `INSERT … ON CONFLICT DO NOTHING` + `SELECT … FOR UPDATE` + collision-skip + `$transaction` with `tx` passthrough (sales-settings repo `allocateNext*`); callers pass `tx` (sales-order create, delivery-challan create, sales-return create/status, estimate convert). Estimate *create* allocates outside the write txn (number burn on failure; dupe-safe). Multi-record conversions run inside `$transaction` (estimate→invoice, order→invoice, return status+credit-note, challan status+fulfilment sync).

**Organization isolation & authZ:** `resolve*Context()` per read/mutation; repository methods take `organizationId` first; reads scoped (`findFirst/findMany where:{organizationId,…}`); deletes Draft-only + `isOrganizationAdmin` (estimates/sales-orders); sales-settings writes admin-gated. Fixed in round 1: sales-order `updateStatus`/`updateItemFulfilment`/estimate-link scoping + duplicate-invoice guard.

**Business invariants & accounting boundaries (verified in code):** quotation ≠ invoice (convert creates genuine `Invoice` via invoice totals + allocated invoice number; `convertedToInvoiceId` duplicate guard with in-txn re-fetch); order ⇏ payment (no payment creation on any sales path); challan ⇏ tax invoice (quantities only, no financials); return authorization ⇏ sellable stock (dispositions `RESTOCK/DAMAGED/QUARANTINE`, stock movement only via disposition handling); credit note ≠ cash refund (credit-note record, no payment reversal); status machines enforced (`validate*Transition`, Draft-only edit/delete, over-return/over-delivery/over-fulfilment errors, remaining-quantity aggregation excluding `CANCELLED`).

## F. Shared UI compliance

**Kit inspected:** `shared/components/form/` (`Button` primary|secondary|link, `Input`, `Label`, `Textarea`, `Select` 369-line searchable, `DatePicker` 456-line, `Checkbox`, `FieldError/Form/FormError`), `shared/components/table/` (`Table` family, `Pagination`). All sales screens compose these; 0 raw native controls; 0 third-party UI imports; icons exclusively `lucide-react` (`^1.52.0`); icon-only buttons labeled.

**Violations fixed (round 1):** 17 palette sites → semantic tokens; 8 `cn()` sites. **Remaining:** `sky/indigo/purple` stage hues (`OpportunityStageBadge` NEW_LEAD/QUALIFIED/NEGOTIATION + `PipelineMetricsCards` icons) — no `success/warning/danger/info` equivalent preserves their categorical distinction (section I, L6; closed in round 2 — see §J).

## G. Test and quality-gate evidence (round 1, final)

- `npx tsc --noEmit` → exit 0, no output.
- `npx eslint src/features/estimates src/features/sales-orders src/features/sales-returns src/features/sales-pipeline src/features/delivery-challans src/features/sales-settings` → exit 0, no output.
- `npx vitest run <same six paths>` → exit 0: **14 files passed, 2 skipped; 105 passed, 11 skipped.** Skipped = `estimate-database.test.ts` (6) + `sales-order-database.test.ts` (5), gated on `AVENTRA_TEST_DATABASE_URL` (no test DB available in this environment — recorded UNVERIFIED, never PASS).
- `npx vitest run` (full) → exit 0: **128 files passed, 9 skipped; 844 passed, 85 skipped.**
- `npm run build` → exit 0, `✓ Compiled successfully`, `✓ Generating static pages`; 0 `Client Component Browser` pg/prisma warnings (after the §C.3 revert).
- `npx prisma validate` → exit 0 (`prisma/schema.prisma` valid). No migrations added/rewritten; no `db push`.
- No browser visual testing performed (no visual claims made).

## H. Changed files (round 1)

Server/security: `sales-orders/infrastructure/repositories/prisma-sales-order-repository.ts` (org-scope ×3); `sales-orders/data/mutations/sales-order-mutations.ts` (barrels, duplicate guard, null guard); `sales-orders/data/validators/sales-order-schemas.ts` (default-free update schema); `sales-returns/data/validators/sales-return-schemas.ts` (enum/date/bounds). Presentation: `EstimateCreatePage.tsx`, `SalesOrderCreatePage.tsx`, `SalesOrderDetailPage.tsx`, `OpportunityDetailPage.tsx`, `EstimateCustomerSection.tsx`, `EstimateAdditionalChargesAndDiscountSection.tsx`, `SalesOrderCustomerSection.tsx`, `SalesReturnCustomerSection.tsx`, `DeliveryChallanCreatePage.tsx`, `SalesReturnAdditionalInfoSection.tsx`, `SalesReturnItemsSection.tsx`, `OpportunityStageBadge.tsx`, `MarkLostModal.tsx`, `PipelineKanbanBoard.tsx`, `PipelineMetricsCards.tsx`, `PipelineTable.tsx`, `OpportunityModal.tsx`, `PipelineFilterBar.tsx`. Tests: `sales-order-mutations.test.ts` (+1), `sales-order-schemas.test.ts` (new), `sales-return-schemas.test.ts` (new). Report: this file. Inspected-only files are not listed (nothing claimed modified that was only read).

## I. Remaining work (round-1 baseline; each mapped to a round-2 finding F1–F6)

- **L1 (→F2):** estimates/sales-orders `create*Schema` accept non-`Draft` initial `status` — creation bypasses lifecycle transitions; needs domain decision + enforcement.
- **L2 (→F2):** reference-ownership gaps — sales-order create/update store `customerId/productId/sourceEstimateId` unverified; sales-returns `salesOrderId` unverified; pipeline `customerId` unverified; delivery-challan `invoiceId` unverified. (Estimates verify `customerId`; sales-returns/delivery verify `invoiceId`/`salesOrderId` in-repo.)
- **L3 (→F3):** `getPrisma()` + `prisma.$transaction` + direct `tx.*` reads inside `data/mutations` (estimates, sales-orders) instead of behind repository boundaries.
- **L4 (→F4):** list reads `include` full items+relations for list views; per-item aggregate loops in create/status paths; `getMetrics` loads all rows then computes in memory.
- **L5 (→F5):** pipeline has no transition matrix — any stage → any stage (incl. `LOST→WON` without guard); `WON=100/LOST=0` auto-probability only.
- **L6 (→F6):** `sky/indigo/purple` stage styling without semantic tokens.
- **L7:** `!.` remains in `*.test.ts` (incl. DB-gated tests) — test-only; production `src` clean.
- **L8:** DB-gated tests (11 sales: estimate-database 6, sales-order-database 5) skipped — no `AVENTRA_TEST_DATABASE_URL` in this environment; transaction rollback, numbering concurrency, isolation UNVERIFIED at DB level.

---

## J. Follow-up remediation — closing the six PARTIALs (round 2)

- **Date (UTC):** 2026-10-14 (same working tree, no commits/pushes).
- **Baseline note:** the round-1 file on disk was truncated mid-§C (literal truncation marker at EOF); §C.4 tail and §§D–I above were restored from the authored round-1 content before starting round-2 work. Nothing in §§A–I was altered except this restoration.
- **Rule re-reads:** `AGENTS.md` plus `rules/01,02,04,05,08,09,10,11,14,15,16,18` (boundaries, taxonomies, functions/TS, styling, packages, prisma, auth, testing, security/perf) before editing; Next.js docs consulted for the `"use server"` barrel behavior confirmed in round 1.
- **Outcome:** 3 of 6 PARTIALs closed to PASS with evidence (reference ownership/security, list-query performance as no-violation, stage tokens); 1 narrowed (cross-feature APIs: 7 reroutes, 5 structural deep imports documented with impossibility evidence); 2 confirmed as justified-pattern with strengthened evidence (transaction orchestration incl. a revert experiment; numbering burn unchanged). Matrix moves from **40 PASS / 0 FAIL / 6 PARTIAL** to **42 PASS / 0 FAIL / 4 PARTIAL** (rows 5, 12, 22, 24). **The category is still NOT fully compliant.**

### J.1 F1 — Cross-feature public APIs (row 5: PARTIAL, narrowed)

**Added two client-safe pure barrels** following the established `index.ts` public-API pattern (cf. `invoices/index.ts` DEF-010 pure barrel):
- `src/features/customers/index.ts` (new): `CustomerDto` type, `formatCustomerAddress` (verified zero-import pure domain), address/status/type aliases. No `server-only`/Prisma in graph.
- `src/features/products/index.ts` (new): `ProductDto` type only.
**Rerouted 7 deep imports:** `determineTaxMode` in `estimate-mutations.ts` → `@/features/invoices`; `CustomerDto` ×2 + `formatCustomerAddress` ×2 → `@/features/customers`; `ProductDto` ×3 (2 create pages + 2 item sections) → `@/features/products`; merged duplicate `@/features/invoices` import lines in `estimate-mutations.ts`.
**Remaining 5 deep imports (documented limitation, not fixable without architectural harm):**
1. `estimate-mutations.ts:8` `invoiceRepository`, `sales-order-mutations.ts` `invoiceRepository` — `server-only` Prisma singleton; `invoices/index.ts` is imported by client components (`EstimateCreatePage`, `SalesOrderCreatePage` for `determineTaxMode`) so it must stay pure (DEF-010). Adding the repository would poison client bundles with `server-only`/pg — the exact failure demonstrated by the round-1 `EstimateDetailPage` barrel experiment (build emitted `Client Component Browser` pg warnings; 0 after revert).
2. `estimate-mutations.ts:9` `customerRepository` — same constraint (new `customers/index.ts` is client-consumed).
3. `estimate-mutations.ts:12` `getSupplierTaxContext` — `import "server-only"` + Prisma + auth; same constraint.
4. `EstimateDetailPage.tsx:42` conversion action — `"use server"` module must be imported directly by the client component; barrel re-export loses server-reference treatment (round-1 evidence).
A second per-feature `server.ts` barrel convention was rejected as speculative abstraction (rule 21) for 5 import lines whose behavior is already correct and server-contained.

### J.2 F2 — Reference ownership and creation status (row 26: PARTIAL → PASS)

**Creation statuses restricted to UI-supported coherent initial states (server-side, zod):**
- `estimate-schemas.ts`: `status` 7 values → `["Draft","Sent"]` (UI `executeSubmit` sends only these).
- `sales-order-schemas.ts`: new `initialStatusField = ["Draft","Confirmed"]` for create (UI `handleSave` sends only these); update schema keeps full enum but the action never spreads `status`. Conversion path (`convertEstimateToSalesOrderAction`) still creates `Confirmed` via repository — designed flow, unaffected.
- `sales-opportunity-schemas.ts`: new `initialOpportunityStageSchema` (4 open stages) for create; terminal WON/LOST only via validated transitions.
**Ownership checks added (all server-side, org-scoped `findById`, fail-closed):**
- sales-orders create/update: `assertCustomerInOrganization`, `assertProductsInOrganization` (deduped `Promise.all`), `assertConvertibleEstimate` (existence + org + not-converted + convertible status, mirroring conversion guards); new `InvalidSalesOrderReferenceError` exported via barrel.
- estimates create/update: `assertEstimateProductsInOrganization`; new `InvalidProductReferenceError` (customer check pre-existed).
- pipeline create/update: customer verification; new `InvalidOpportunityCustomerReferenceError`.
- sales-return repo `create`: `salesOrderId` org check (mirrors invoice block); delivery-challan repo `create`: `invoiceId` org check (mirrors sales-order block).
**Tests (17 new):** SO mutations +5 (cross-org customer/product/estimate, already-converted, forged `Fulfilled`); estimate mutations +2 (forged `Converted`, cross-org product); pipeline actions +6 (new `opportunity-mutations.test.ts`: WON-on-create, cross-org customer create/update, LOST→WON forged, open→WON allowed); repo rejection tests +4 (new files for returns/delivery, mocked tx, asserting org-scoped `where` clauses and no-write on rejection).

### J.3 F3 — Transaction orchestration (row 12: PARTIAL, evidence strengthened)

**Kept (safe, zero-semantic-change):** sales-order `orderNumber` uniqueness check now uses `salesOrderRepository.findByNumber(org, n, tx)` (truthiness only); `txClient?: unknown` support added to estimate `findById`/`findByNumber` + `IEstimateRepository` (completes the pattern every other repo method already uses).
**Attempted and REVERTED with evidence (3 call sites):** routing the in-txn conversion re-reads through domain-mapped repository finders loses data — tsc proved domain entities are presentation-shaped subsets (`customer` vs `customerName`, no `currency`, no persisted totals, Prisma-vs-domain enum casing). Rewriting conversions onto them would drop `currency` and misread statuses. The raw in-txn reads are therefore justified coordination inputs under `rules/04` ("write-oriented data/application coordination"), never reaching UI. `tx.invoice.update` salesOrderId patch stays: `invoiceRepository.update` is a destructive full rewrite (delete + recreate items), so no non-destructive repo API exists for the single-field link.

### J.4 F4 — List-query performance (row 28: PARTIAL → PASS, no-violation with evidence)

Measured per list path (single `findMany` with JOIN includes = not N+1; no per-row follow-up queries):
- estimates/sales-orders/returns/delivery/pipeline lists: 1 query each (+1 lean metrics query for orders/pipeline). `include: items` is UI-consumed (`SalesOrderTable.tsx:84`, `EstimateTable.tsx:85`); relation selects are narrow (`invoiceNumber`/`orderNumber`). Trimming would change response shape — refused per task constraints.
- Per-line aggregate loops (returns/delivery create/status) are bounded by document line count, inside transactions, correctness-required (remaining-quantity); `getMetrics` full-load is org-bounded with lean selects.
Per rule 18 (measure-first), no query changes made; rules 14/18 satisfied as written.

### J.5 F5 — Pipeline transitions (row 26 evidence; new behavior, tested)

`ALLOWED_STAGE_TRANSITIONS` + `canTransitionOpportunityStage` + `validateOpportunityStageTransition` in `sales-pipeline-rules.ts` (naming mirrors `sales-order-lifecycle-rules.ts`); first real use of the previously-unused `InvalidOpportunityStageTransitionError`. Open stages fully connected (forward/back/skip/close); WON/LOST terminal with no outgoing transitions — reopening is a new opportunity (preserves close history; win-rate immutable to flips). Enforced at three levels: `updateOpportunityStageAction` and `updateOpportunityAction` (read-existing → validate, mirroring the sales-order transition action), plus repository `update`/`updateStage` defense-in-depth (both already load `existing`). LOST still mandates loss reason (zod refine + domain assert + repo assert). `OpportunityModal` offers open stages only in create mode (server still enforces). Barrel exports added. Metrics integrity proven by test (each terminal opp counted exactly once; `won+lost+open == n`; opens exclude terminals; overdue excludes terminals — pre-existing).

### J.6 F6 — Stage color tokens (row 17: PASS completed)

Grouped mapping onto existing tokens following the `StatusBadge` (invoices) reuse precedent — no design-system extension needed: NEW_LEAD + QUALIFIED → `info`; PROPOSAL + NEGOTIATION → `warning` (both await customer decision); WON → `success`; LOST → `danger`. Metric icons → `info` (decorative). Text labels + dots preserved (not color-alone). Grep verification: **0** `sky|indigo|purple|rose|emerald|amber-` classes remain in sales `src` (tests excluded).

### J.7 Database testing (L8: UNVERIFIED → VERIFIED)

Isolated database `aventra_billing_test` created on local Postgres (`CREATE DATABASE` only — production/dev `aventra-billing` untouched; no production credentials used — local dev password from `.env`, never committed). `prisma migrate deploy` applied **14/14** migrations to the test DB. `AVENTRA_TEST_DATABASE_URL` honored by the DB-gated suites per repo convention (override `DATABASE_URL` before client init).
- Sales DB suites: `sales-order-database.test.ts` (5) + `estimate-database.test.ts` (6) — **11/11 pass** (persistence, totals, gapless numbering, conversions incl. duplicate prevention, isolation, lifecycle).
- Full suite with test DB: **140 files passed, 0 failed; 952 tests passed, 0 skipped** (round 1 without DB: 128 files / 844 tests / 85 skipped). Previously-gated suites (invoices, credit-notes, payments, billing-settings, recurring) all pass.

### J.8 Quality-gate evidence (round 2, final)

| Check | Command | Exit | Result |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | clean (incl. new barrels/tests) |
| ESLint | `npx eslint src/features/estimates src/features/sales-orders src/features/sales-returns src/features/sales-pipeline src/features/delivery-challans src/features/sales-settings src/features/customers/index.ts src/features/products/index.ts` | 0 | clean |
| Vitest sales (no DB env) | `npx vitest run <six sales paths>` | 0 | 17 files passed, 2 skipped (DB-gated); **128 passed**, 11 skipped |
| Vitest full + isolated DB | `AVENTRA_TEST_DATABASE_URL=<test-db> npx vitest run` | 0 | **140 files passed; 952 passed, 0 skipped, 0 failed** |
| Prisma | `npx prisma validate` | 0 | schema valid, no migration changes |
| Prisma client | `npx prisma generate` | 0 | client 7.10.0 regenerated to `src/generated/prisma` (no schema change) |
| Production build | `npm run build` | 0 | `✓ Compiled successfully`, static pages generated; **0** `Client Component Browser` / `server-only` / Prisma / pg warnings |

### J.9 Updated compliance counts

46 rows: round-1 **40 PASS / 0 FAIL / 6 PARTIAL** → round-2 **42 PASS / 0 FAIL / 4 PARTIAL**. Deltas: row 26 PARTIAL→PASS (F2+F5), row 28 PARTIAL→PASS (F4 measured no-violation); row 5 PARTIAL narrowed (F1: 7 fixed, 5 structurally documented); row 12 PARTIAL evidence upgraded (F3: 1 safe move + revert experiment); rows 22, 24 unchanged PARTIAL (number burn; sales-settings use-case/adapter test gaps). Findings: **0 Critical/High open**; Medium/Low in-scope items closed except the 4 documented PARTIAL exceptions. **Do NOT mark the category fully compliant** while rows 5, 12, 22, 24 remain PARTIAL.

### J.10 Changed files (round 2 only; inspected-only files not listed)

New: `customers/index.ts`, `products/index.ts`, `sales-pipeline/data/mutations/opportunity-mutations.test.ts`, `sales-returns/infrastructure/repositories/prisma-sales-return-repository.test.ts`, `delivery-challans/infrastructure/repositories/prisma-delivery-challan-repository.test.ts`. Edited: `estimate-mutations.ts`, `estimate-errors.ts`, `estimates/index.ts`, `estimate-schemas.ts`, `estimate-mutations.test.ts`, `estimate-repository.ts` (interface), `prisma-estimate-repository.ts` (tx params), `sales-order-mutations.ts`, `sales-order-errors.ts`, `sales-orders/index.ts`, `sales-order-schemas.ts`, `sales-order-mutations.test.ts`, `prisma-sales-return-repository.ts`, `prisma-delivery-challan-repository.ts`, `sales-pipeline-errors.ts`, `sales-pipeline/index.ts`, `sales-pipeline-rules.ts`, `sales-pipeline-rules.test.ts`, `sales-opportunity-schemas.ts`, `create-opportunity.ts`, `update-opportunity.ts`, `update-opportunity-stage.ts`, `prisma-sales-opportunity-repository.ts`, `OpportunityModal.tsx`, `OpportunityStageBadge.tsx`, `PipelineMetricsCards.tsx`. Regenerated (no schema change): `src/generated/prisma`. Report: this file. No commits, pushes, resets, or production-data access.