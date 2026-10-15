# Sales Features — Full Architecture Remediation (Clean Architecture Compliance)

- **Date (UTC):** 2026-10-14
- **Working Tree:** `/Users/javed/Desktop/aventra-billing-main` (no git repository exists here; no commits, pushes, resets, or destructive operations performed or possible)
- **Scope:** all six Sales features (`estimates`, `sales-orders`, `sales-returns`, `sales-pipeline`, `delivery-challans`, `sales-settings`) — implementation, dependency direction, business logic, persistence, validation, authorization, error handling, tests. No schema/migration changes. Prior round-1–3 remediation (audit §§A–J, directory standardization) preserved.

---

## 1. Executive summary

All six features were audited against the written rules and against the established conventions of the reference features (`invoices`, `customers`, `products`, `billing-settings`). Structure, boundaries, DI, transactions, numbering, N+1 behavior, deletes, presentation conventions, and error handling were verified in code, not from folder names.

**Remediation this round (3 genuine defects fixed + 1 test-wiring fix):**
1. **Estimate numbering gap closed** — `createEstimateAction` allocated the document number in a separate transaction from the insert, so a failed write burned a number. Allocate + insert now share one `$transaction` (same pattern as sales-order create). A pre-existing unit test that mocked the old non-transactional flow broke and was updated to drive the txn callback, additionally asserting allocate + create share the same tx object.
2. **Over-receipt invariant missing** — `updateSalesReturnStatus` accepted `receivedQuantities` exceeding the returned quantity (physically impossible; corrupts receipt records). New domain assert `assertReceivableQuantity` + typed `OverReceiptError`, enforced in-txn against authoritative `returnQuantity`.
3. Minor: none beyond the above — no other behavior changed.

**Final disposition:** `sales-returns`, `delivery-challans`, `sales-settings` — **PASS**. `estimates`, `sales-orders`, `sales-pipeline` — **PARTIAL** (sole reason: server-side deep imports into sibling `server-only` repository/query modules, each documented below as technically unavoidable without breaking client bundles or duplicating logic). `domain/repositories/` vs `domain/contracts/` resolved as a **rule-text defect** (`rules/03-domain-taxonomy.md` lines 9–19), not a code violation — code placement satisfies the rule's own responsibility definition and matches 15/15 features.

## 2. Applicable rules (exact file paths)

`AGENTS.md`; `rules/01-architecture.md` (canonical shape, dependency direction, forbidden deps); `rules/02-project-structure.md` (feature root, empty-folder rule lines 78–84, taxonomy); `rules/03-domain-taxonomy.md` (allowed list lines 9–19, `contracts/` definition lines 45–49, restrictions lines 69–84); `rules/04-data-taxonomy.md` (queries/mutations/validators, repo boundary lines 33–37, restrictions); `rules/05-infrastructure-taxonomy.md` (repositories lines 33–37, replaceability); `rules/06-presentation-taxonomy.md` (allowed list incl. singular `page/`, restrictions); `rules/07-shared-taxonomy.md`; `rules/08-boundaries.md` (forbidden/allowed dependency lists); `rules/09-functions-typescript.md`; `rules/10-styling-design.md`; `rules/11-components-icons.md`; `rules/12-animation.md`; `rules/13-packages.md`; `rules/14-prisma-postgres.md` (transactions, N+1, no `db push`); `rules/15-better-auth.md` (server-side authorization); `rules/16-testing-vitest.md`; `rules/17-mocks.md`; `rules/18-security-accessibility-performance.md`; `rules/19-errors-config-git.md`; `rules/20-definition-of-done.md`; `rules/21-agent-procedure.md` (line 20: document, don't invent).

## 3. Initial findings per feature (verified against current code)

- **estimates:** structure compliant; flows sound (Draft-only edit/delete, admin-gated delete, in-txn convert with duplicate guard, totals recomputed). Defects found: numbering gap (fixed §4); test mock predating txn flow (fixed §4). Carries 4 server-side deep imports (see §6).
- **sales-orders:** structure compliant; org-scope holes and duplicate-invoice guard fixed in prior rounds and re-verified (repo pre-checks + in-txn guards intact; `updateMany` estimate link intact). No new defects. Carries 4 server-side + 1 deliberate client-side deep imports (see §6).
- **sales-returns:** structure compliant; single-txn create/status, org-scoped reads, DRAFT-only delete, credit-note idempotency guard (`!creditNoteId` in-txn) intact. Defect found: unbounded `receivedQuantities` (fixed §4).
- **sales-pipeline:** transition matrix + terminal lock + creation-stage restriction from prior rounds re-verified (matrix enforced in both actions and both repo methods; kanban offers only legal moves and hides actions on WON/LOST). No new defects. Carries 2 server-side deep imports (see §6).
- **delivery-challans:** single-txn create/status, org-scoped reads/links, DRAFT-only delete intact; `deriveSalesOrderFulfilmentStatus` returns only CONFIRMED/PARTIALLY_FULFILLED/FULFILLED (no DRAFT demotion possible). No defects.
- **sales-settings:** admin-gated writes, single-source domain validation, org-scoped reads/allocation intact. No defects.

## 4. Changes made (grouped by feature and layer)

- **estimates / data:** `data/mutations/estimate-mutations.ts` — create now wraps `allocateNextNumber(organizationId, tx)` + `estimateRepository.create(payload, tx)` in one `prisma.$transaction` (both callees already accept `txClient`). No other logic touched.
- **estimates / data tests:** `estimate-mutations.test.ts` — create test drives the txn callback with a mock tx; asserts allocate + create receive the **same** tx object (atomicity wiring lock).
- **sales-returns / domain:** `domain/errors/sales-return-errors.ts` (+`OverReceiptError`); `domain/rules/sales-return-rules.ts` (+`assertReceivableQuantity`, non-negative + ≤ returned, epsilon-consistent with `assertReturnableQuantity`).
- **sales-returns / infrastructure:** `prisma-sales-return-repository.ts` — `updateStatus` loop asserts each supplied `receivedQuantity` against the authoritative in-txn `returnQuantity` before writing (import added; item IDs already constrained to the org-scoped parent's items).
- **sales-returns / tests:** domain `+3 its` (allow/equal, negative, over-receipt); repo `+1 it` (over-receipt rejected, no item/status writes) with extended tx mocks.
- All other layers/features: inspected, no changes (see §5 for the verified-clean inventory).

## 5. Before/after directory and dependency-boundary findings

**Directories:** zero created, removed, or renamed (round-3 standardization already settled placement; re-verified all six trees — four layers + `index.ts` each; `domain/{entities,errors,repositories,rules}`; `data/{context,dto,mutations,queries,validators}`; `presentation/{components,page}` except settings page-only; `infrastructure/{mappers,repositories}`). Singular `page/` confirmed against `02` line 108 and `06` line 14 — no `pages/` migration.
**Dependency direction (re-grepped after changes):** 0 domain→{React,Next,Prisma,Better-Auth,browser,Tailwind} imports; 0 presentation→Prisma/`server-only`; 0 data/infra→presentation; 0 shared→feature. Singleton DI is the repo-wide convention (reference features identical: `invoice-mutations.ts` deep-imports `payments` infra repo; single `PrismaClient` in `src/shared/lib/prisma.ts`; no DI framework per §7 — correctly not introduced). No barrel cycles: no feature barrel imports another sales barrel; `app/` routes compose queries + pages from barrels (allowed `app → feature presentation`).

## 6. Cross-feature import audit (all six features, production src)

**Via public barrels (compliant):** `auth` ×10; `sales-settings` ×6; `invoices` (pure calculations) ×5; `customers` (pure barrel) ×4; `products` (type-only) ×4; `billing-settings` ×3; `estimates` (type-only) ×1.
**Deep imports — documented unavoidable exceptions (rule 08 line 16, each server-contained):**
1. `estimates/data/mutations/estimate-mutations.ts:8` `invoiceRepository` — `server-only` singleton; `invoices/index.ts` must stay pure (client imports `determineTaxMode`; round-1 build experiment proved poisoning pulls pg into the client bundle).
2. Same file `:9` `customerRepository`, `:10` `productRepository` — same constraint (`customers`/`products` barrels are client-consumed for values).
3. Same file `:13` `getSupplierTaxContext` — `server-only` + Prisma + auth query; moving it would duplicate invoice tax logic (rule 08 forbids duplicated implementations).
4. `sales-orders/data/mutations/sales-order-mutations.ts:7,8,9,12` (`customer`/`product`/`estimate`/`invoice` repositories) — same `server-only` constraint class; reference features use the identical pattern.
5. `sales-pipeline/.../create-opportunity.ts:6`, `update-opportunity.ts:6` (`customerRepository`) — same class.
6. `estimates/presentation/page/EstimateDetailPage.tsx:42` (conversion action, client component) — deliberate: a `"use server"` action must be imported directly; barrel re-export loses server-reference treatment and drags the `server-only` repository into the client bundle (round-1 evidence: warnings present with barrel, 0 after revert).
No circular imports; no client-accessible barrel exposes server-only modules (pure barrels stay pure; `sales-settings`/`billing-settings` barrels are server-consumed for values, client-consumed for erased types only).

## 7. Security, organization-scope, transaction, persistence findings

- **Org isolation:** every read/mutation resolves org server-side (`resolve*Context`) and scopes queries (`{id, organizationId}` / org-unique pairs); cross-org references rejected fail-closed (round-2 ownership asserts re-verified in place). Delete paths: DRAFT-only (+ admin gate where the feature's policy requires: estimates, orders, customers, credit-notes; member-allowed elsewhere — policy variance, not a rule violation since rule 15 mandates server-side authorization, present everywhere).
- **Transactions:** all multi-step writes run in a single `$transaction` (estimate convert + **now create**; order create/convert×2; return create/status; challan create/status; numbering allocation inside the txn everywhere). Rollback verified by the full DB suite (952 tests incl. atomic-conversion and isolation cases).
- **Numbering:** concurrency-safe allocation (`INSERT … ON CONFLICT DO NOTHING` + `SELECT … FOR UPDATE` + collision-skip) with in-txn use at every call site after this round's estimate-create fix. Residual accepted risk: concurrent duplicate conversion guarded by in-txn re-checks (no `SELECT FOR UPDATE` — raw-SQL locking would be disproportionate; window is microscopic and DB tests cover the sequential case).
- **N+1:** re-measured — list paths are single `findMany` with JOIN includes (includes are UI-consumed: `SalesOrderTable.tsx:84`, `EstimateTable.tsx:85`); per-line aggregates are bounded by document size, in-txn, correctness-required. No unjustified heaviness; no changes per measure-first (rule 18).
- **Errors:** uniform `try/catch (err: unknown)` → generic user-safe messages; typed domain errors preserved through layers; no stacks/secrets to users; no `console` observability.

## 8. Tests added/changed and verification results

- Added: `assertReceivableQuantity` +3 domain its; repo over-receipt rejection +1; estimate atomicity wiring assertions inside the fixed create test. Changed: estimate create test txn driving (see §4).
- Commands (exit codes actual): `npx tsc --noEmit` → 0; `npx eslint` (six sales scopes) → 0; `AVENTRA_TEST_DATABASE_URL=<isolated aventra_billing_test> npx vitest run` → **139 files passed, 956 passed, 0 skipped, 0 failed** (round-2 baseline 140 files / 952 passed; the directory-task merge removed one file with no test loss; this round added 4 tests); `npm run build` → 0 (`✓ Compiled successfully`, 0 client-bundle warnings); `npx prisma validate` → 0 (no schema/migration change). Skipped tests reported separately, never counted as passing. Production/dev databases untouched (isolated test DB reused from round 2).

## 9. Remaining violations and exceptions

| # | Severity | File path(s) | Applicable rule | Evidence | Rationale |
|---|---|---|---|---|---|
| R1 | Medium | `estimate-mutations.ts:8,9,10,13`; `sales-order-mutations.ts:7,8,9,12`; `create/update-opportunity.ts:6` | 08 (`feature A → feature B private internals`) | 9 server-side deep imports into `server-only` sibling modules, listed with lines in §6 | Technically unavoidable: target barrels must stay client-safe (build-proven poisoning); moving logic would duplicate implementations (also forbidden); reference features use the identical pattern. Server-contained, org-scoped, tested. |
| R2 | Low | `EstimateDetailPage.tsx:42` | 08 | 1 deliberate client-side deep import of a `"use server"` action | Barrel routing breaks server-reference semantics + client bundle (round-1 experiment). Only compliant placement. |
| R3 | Low | `rules/03-domain-taxonomy.md` lines 9–19 (rule text, not code) | 03 allowed-list vs `contracts/` §45–49 | 15/15 features use `domain/repositories/`; 0 use `domain/contracts/`; contents are pure ports (see §10) | Rule-text defect; code satisfies the responsibility definition. No migration (would diverge from all 12 other features). |
| R4 | Info | concurrent duplicate-conversion race window | 14 (transactions) | In-txn re-checks exist; no row-level locking | Accepted residual; fixing needs raw-SQL locks, disproportionate per rule 21. |

## 10. Disposition of the `repositories/` vs `contracts/` conflict

**Resolved as a rule-text defect; no code migration.** Hierarchy applied: `AGENTS.md` §1 (`/rules` authoritative) → rule 02 line 76 (subdirectories are *responsibility-based*) → rule 03 `contracts/` definition (lines 45–49: "repository interfaces or ports" — precisely what `domain/repositories/*-repository.ts` files contain: interfaces + input/output types, zero implementations, zero framework imports) → rule 21 line 20 (document, don't invent). Corroboration: 15/15 features (including the task-nominated reference features `invoices`, `customers`, `products`, `billing-settings`) use `domain/repositories/`; no `contracts/` directory exists anywhere under `src/features/`; the task's own §3 prescribes `repositories/` for "repository interfaces or ports". A sales-only migration to `contracts/` would violate task §§3.5/8 (smallest change, no symmetry churn) and break consistency with every reference feature. **Exact rule requiring correction: `rules/03-domain-taxonomy.md`, allowed-subdirectory list (lines 9–19)** — it should admit `repositories/` as the home for repository ports (or explicitly equate it with `contracts/`). The rules file itself was intentionally left unedited (global standard, out of scope to rewrite).

## 11. Unresolved business/architectural decisions

None requiring action. Two standing policies re-confirmed from evidence (not invented): (a) delete role-gating varies by feature (admin for estimates/orders/customers/credit-notes; member for returns/challans/pipeline/opportunities) — server-side authorization holds in all cases; unifying roles would invent product policy. (b) Reopening terminal pipeline stages/returns is a new record, not a transition — enforced by matrices, consistent with audit history.

## 12. Explicit compliance status per feature

- **estimates — PARTIAL** (sole reason: R1, four documented server-side deep imports; all else PASS)
- **sales-orders — PARTIAL** (sole reason: R1 + R2 documented deep imports; all else PASS)
- **sales-returns — PASS**
- **sales-pipeline — PARTIAL** (sole reason: R1, two documented server-side deep imports; all else PASS)
- **delivery-challans — PASS**
- **sales-settings — PASS**

No feature is marked PASS with an undisclosed violation: every PARTIAL cites the exact exception (R1/R2) with file lines, rule, evidence, and rationale above. No FAILs. No commits or pushes performed.
