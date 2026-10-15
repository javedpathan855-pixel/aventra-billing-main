# Aventra Billing — Implementation Audit, Testing & Bug Report

- **Date (UTC):** 2026-10-14
- **Repository state:** Working tree at `/Users/javed/Downloads/aventra-billing-main` (no `.git` present, so no commit baseline; `git status/diff` inspection was not possible and no commit or push was performed).
- **Rules followed:** `AGENTS.md` in full and all applicable files under `/rules` (architecture, project structure, boundaries, Prisma/Postgres, Better Auth, Vitest, security/accessibility/performance, errors/config/git, definition of done, agent procedure).
- **Deliverable status:** Audit-first. One safe, verified defect was fixed with regression tests (see §10). All other findings are documented with evidence and left unchanged per the fix policy (§11).

---

## 1. Executive Summary

### Overall implementation health

The codebase is a well-structured, early-stage billing application. Feature-first Clean Architecture is genuinely followed (domain/data/presentation/infrastructure per feature), server-side authorization is consistently org-scoped, financial totals are recalculated server-side, and invoice/credit-note numbering is concurrency-safe. Unit-test coverage of domain rules and mocked server mutations is strong (473 tests passing). However, **no live database, browser, or end-to-end verification was possible in this environment** (no PostgreSQL, no `.env`), so persistence, concurrency, and real user workflows are **unverified**, and several financial-integrity and authorization findings require business decisions before production.

### Counts

- **Modules audited:** 9 feature modules (auth, onboarding, organization, dashboard, customers, products/services, billing-settings, invoices, credit-notes) + shared + app routing + Prisma schema/migrations.
- **Workflows traced end-to-end in code:** registration/OTP/login/logout, onboarding, org isolation, customer CRUD, product/service CRUD, billing settings lifecycle, invoice lifecycle, credit-note lifecycle including settlement.
- **Confirmed defects:** 17 (1 × P1 fixed, 1 × P1 unresolved pending business decision, 7 × P2, 8 × P3).
- **Defects fixed:** 1 (DEF-001, P1 — credit-note update-path settlement bypass), with 4 new regression tests.
- **Unresolved defects:** 16 (documented in §8 with rationale for deferral).
- **Blocked / unverified checks:** live-DB integration, concurrency against real Postgres, real E2E browser flows, production build page-data collection (fails without env — expected, not a code defect), Playwright/Cypress (not present in repo).
- **Overall risk assessment:** **MEDIUM-HIGH for financial correctness if shipped as-is.** Org isolation and input validation foundations are solid, but invoice status semantics conflate credit with payment (DEF-002), role authorization is flat (DEF-006), and there is no ledger/payment infrastructure, no rate limiting, and no security headers.

### Readiness verdict

**Not recommended for production release.** Recommended for continued development and staging **only after** the business decisions in §11 (invoice-status semantics, credit-vs-payment distinction, member permissions) are resolved and live-DB verification is performed. The build compiles cleanly and all unit checks pass, but a passing build is explicitly not treated as production readiness.

---

## 2. Scope and Methodology

### Files/modules inspected

- `AGENTS.md`, all 21 files under `rules/`.
- `package.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `next.config.ts`, `.env.example`, `prisma/schema.prisma`, all 8 migration directories.
- `src/app` (all routes, layouts, auth handler), `src/shared` (components, animation, lib, utils, config).
- All 9 features under `src/features/*` across domain/data/presentation/infrastructure, with deep reads of:
  - `invoices/data/mutations/invoice-mutations.ts`, `invoices/domain/invoice.ts`, `invoices/domain/rules/tax-rules.ts`, `invoices/data/validators/invoice-schemas.ts`, `invoices/infrastructure/*`, `invoices/presentation/page/*`.
  - `credit-notes/data/mutations/credit-note-mutations.ts`, `credit-notes/domain/credit-note.ts`, `credit-notes/domain/rules/credit-calculation-rules.ts`, `credit-notes/data/validators/credit-note-schemas.ts`, `credit-notes/data/queries/get-eligible-invoices-for-credit.ts`, `credit-notes/infrastructure/*`, `credit-notes/presentation/page/CreditNoteCreatePage.tsx`.
  - `auth/infrastructure/auth/*`, `auth/data/mutations/*`, `auth/data/queries/*`, `auth/domain/rules/authorization.ts`.
  - `customers`, `products`, `billing-settings`, `onboarding`, `dashboard`, `organization` data contexts, mutations, queries, validators, and presentation shells.
- Existing tests: all 74 Vitest files.

### Rules followed

`AGENTS.md` mandatory workflow (read rules first, inspect layer boundaries, reuse shared code, no duplicate logic, no new dependencies, run typecheck/lint/tests/build, review diff, check boundaries/colors/secrets/mocks/a11y). Repository rules took precedence over prompt instructions throughout; in particular, no financial business rule was changed without verification (§10 documents the single exception-free fix, which enforces an *existing* rule uniformly rather than changing it).

### Tests and commands executed

| Command | Result |
|---|---|
| `npm install` (deps were absent) | installed 562 packages, exit 0 |
| `npx prisma generate` | generated client to `src/generated/prisma`, exit 0 (required before tests) |
| `npx vitest run` | **74 files / 473 tests passed** (469 pre-existing + 4 new), see §9 |
| `npx tsc --noEmit` | clean, exit 0 |
| `npx eslint` | clean, exit 0 |
| `npx prisma validate` | schema valid |
| `npm run build` | compiles; **page-data collection fails** because no `.env`/DB exists in this environment (expected infra block, not a code defect) |
| Temporary domain-arithmetic verification via Vitest (10 accounting scenarios) | passed; scratch file removed afterwards |

### Test environment limitations

- No PostgreSQL server or client tools in this environment; no `.env` (only `.env.example`); `DATABASE_URL`, `BETTER_AUTH_*`, `RESEND_API_KEY`, `AUTH_EMAIL_FROM` unset.
- Therefore: **no live persistence, transaction, concurrency, or real-auth testing.** All mutation-level evidence comes from mocked-repository Vitest tests plus direct code inspection. These are recorded as verification evidence but are explicitly **not** treated as proof of real DB behavior.
- No Playwright/Cypress/browser automation exists in the repo; no visual verification was claimed or performed.
- No real emails/SMS/OTPs were sent; OTP behavior verified by code inspection only.

### Manual vs automated verification

- Automated: full Vitest suite, typecheck, lint, Prisma validate/generate, build compile, scratch domain-arithmetic run.
- Manual (code inspection with file:line evidence): every defect in §8 was traced to exact code paths; subagent-assisted audits covered invoices, credit-notes/accounting, auth/isolation, and UI/boundaries, and the author re-verified each load-bearing claim by reading the cited files before including it.

---

## 3. Feature Inventory

| Feature | Implemented scope | Test coverage | Actual verification | Status | Findings |
|---|---|---|---|---|---|
| Auth: registration + org creation | `register-organization.ts`, `CreateOrganizationForm.tsx`, schemas, mappers | `auth-schemas.test.ts`, `auth-mappers.test.ts` | Code inspection + unit tests pass; no live run | **Partial** | DEF-017 (email-existence oracle on register); no live verification |
| Auth: OTP verify/resend, password reset | `verify-otp.ts`, `password-reset.ts`, emailOTP plugin (6-digit, 5-min, 3 attempts, hashed) | `resend-email.test.ts`, `otp-email-template.test.ts` | Code inspection + unit tests; no OTP actually sent | **Partial** | Resend/reset lack app-level cooldown (DEF-007); enumeration safe on reset, leaks on register |
| Auth: login/logout/session | `session.ts`, `session-state.ts`, `auth.ts`, `access-control.ts` | `authorization.test.ts`, auth-errors tests | Code inspection + unit tests | **Passed (unit)** | Multi-org pinned to first membership; no switcher (limitation, not defect) |
| Onboarding | steps, completion/authorization rules, GSTIN VO, mappers, mutations | 6 test files incl. `onboarding-action.test.ts` | Unit tests pass | **Passed (unit)** | Owner/admin gate correct; future `loadOnboardingViewState(orgId)` export is a latent risk (unguarded param) |
| Organization | Placeholder page only; `Member`/`Invitation` models exist, invitation flow unused | none for invitation accept | Code inspection | **Unfinished (explicit)** | No member/role admin surface; stale invites never expire via app |
| Dashboard | Intentional shell (no KPIs/mocks), header/nav/search/notifications shell, loading/error boundaries | `dashboardNavigation.test.ts`, `appLayout.test.ts`, `header-context.test.ts`, `dashboardHeader.test.ts` | Code inspection + unit tests | **Passed (scope as designed)** | DEF-013 (dead buttons); dashboard is NOT a defect per current scope |
| Customers | CRUD (server actions), validation, queries, mapper, repository; snapshot fields on invoices | `customer-schemas.test.ts`, `customer-mutations.test.ts`, `get-customers.test.ts`, mapper/repo tests, rules tests | Unit tests pass; no live DB | **Partial** | DEF-009 (sample-data provider, P3, not route-wired); DEF-015 (validation gaps); duplicate domain files (DEF-011) |
| Products & Services | CRUD, price/unit/tax/inventory fields, schemas, mapper/repo; shared product model for both types | `product-schemas.test.ts`, `service-schemas.test.ts`, `service.test.ts`, `product.test.ts`, mapper tests, page tests | Unit tests pass; no live DB | **Partial** | Same validation/org notes as customers; snapshot preservation via `SetNull` + copied fields is correct design |
| Billing Settings | Per-org per-document-type settings (prefix/suffix/nextNumber/padding/defaults), atomic allocation (`FOR UPDATE` + conflict loop), preview without consumption | `billing-settings-schemas.test.ts`, `billing-settings-rules.test.ts`, `BillingSettingsPage.test.ts` | Unit tests + code inspection | **Passed (unit)** | DEF-006 (any member can allocate/mutate); DEF-014 (number gaps on crash) |
| Invoices: creation & calc | Server-side recalculation, authoritative tax mode, snapshot line items, org-scoped customer check | `invoice-schemas.test.ts`, `invoice-mutations.test.ts`, `invoice-numbering-regression.test.ts`, `tax-rules.test.ts`, `invoice.test.ts`, page/integration tests | Unit tests pass; domain arithmetic spot-verified | **Partial** | DEF-004/005/008/015 (status/amountPaid/tax/validation); totals never trust client (good) |
| Invoices: lifecycle | Draft-only edit/delete guard; no pay/cancel/overdue transitions exist | mutation tests | Code inspection | **Partial (by design gap)** | No `recordPayment`/cancel workflow; `amountPaid` set only at create/update |
| Credit Notes: lifecycle | Draft → Issued via create/issue (update path fixed by this audit), over-credit + eligibility guards, atomic tx + row lock | `credit-note-mutations.test.ts`, `credit-note-accounting-regression.test.ts` (now 10 tests), schemas/filter/calc/mapper tests, page tests | Unit tests pass incl. 4 new | **Partial** | DEF-001 fixed; DEF-002/003 pending business decision |
| Credit Notes: numbering | Same allocator as invoices, `CREDIT_NOTE` sequence, unique per org, preview-safe | regression tests | Unit tests + inspection | **Passed (unit)** | Separate sequences confirmed (no invoice/CN collision) |
| Payments / refunds | **Not implemented** (no `Payment` model; `amountPaid` scalar only; nav marks `Payments Received` planned) | n/a | Schema + code search | **Missing** | Documented limitation; no double-entry ledger exists |
| Ledger / journal / receivables module | **Not implemented** — outstanding derived by aggregation (`total − amountPaid − issuedCredits`) | n/a | Schema + code search | **Missing** | No double-entry compliance can be claimed |
| GST/tax | CGST/SGST vs IGST via supplier/customer state + GSTIN/treatment; per-line tax snapshot | `tax-rules.test.ts`, `InvoiceTaxIntegration.test.ts` | Unit tests pass | **Partial** | DEF-008 (fixed-discount tax), silent fallback on invalid place-of-supply |
| Discounts/rounding | Line % discounts, fixed/% header discount + charges, half-split CGST/SGST, INR rounding | domain tests | Unit tests + scratch run | **Partial** | DEF-008; three rounding impls (DEF-011) |
| PDF/print | `window.print()` document views (`InvoiceDocument`, `CreditNoteDocument`), doc tokens in CSS | none dedicated | Code inspection only | **Unverified** | No PDF-generation test; print path not executed |
| Reports | None implemented | n/a | Code search | **Missing** | — |
| API endpoints | Only `app/api/auth/[...all]` (Better Auth handler) | none | Code inspection | **Passed (scope)** | Inherits Better Auth origin checks; no explicit `trustedOrigins` |

### Traceability matrix (requirements → implementation → evidence)

| Requirement / workflow | Implementation | Verification evidence |
|---|---|---|
| Register + create org | `auth/data/mutations/register-organization.ts` | `auth-schemas.test.ts` pass; live run blocked |
| OTP verify (valid/invalid/expired/reused) | Better Auth `emailOTP` + `verify-otp.ts` | Code inspection (expiry/attempts plugin-enforced); live run blocked |
| Login valid/invalid, logout | `session.ts`, `auth-errors.ts` mapping | Unit tests pass; live run blocked |
| Protected routes | `(app)/layout.tsx`, `onboarding/page.tsx`, `(auth)/auth/page.tsx` gates | Code inspection (no middleware; RSC gates) |
| Org isolation (customers/products/settings/invoices/CNs) | `resolve*Context()` + org-scoped repos | Unit tests (mocked) + code inspection; live IDOR probe blocked |
| Customer CRUD + snapshots | mutations + `SetNull` + snapshot fields | Unit tests pass; live reload blocked |
| Product/service CRUD + invoice line use | mutations + `productId SetNull` + snapshot | Unit tests pass; live run blocked |
| Settings persist → consume → document | mutations/queries/mappers + allocation | Regression tests pass; live reload blocked |
| Invoice create → number → issue → view | mutations + allocator + pages | Unit + regression tests pass; live run blocked |
| Credit note draft → issue → settlement → views | mutations + mapper aggregation + pages | 10 accounting regression tests pass (incl. 4 new); live run blocked |
| Over-credit prevention | `calculateCreditAvailability` + in-tx recheck | Unit + regression tests pass; scratch arithmetic verified |
| Paid-status semantics | settlement block in 3 paths (post-fix) | Tests assert current rule; **correctness of rule itself is disputed (DEF-002)** |

---

## 4. Architecture and Code Quality

### Architecture compliance — PASS with noted violations

- Four-layer feature shape (`domain/data/presentation/infrastructure`) is consistently used; `src/app` holds routing/composition; `src/shared` is feature-agnostic (no `shared → features` imports found).
- **Domain purity clean:** no `react/next/prisma/better-auth/tailwind/motion` imports in any `domain/` tree (only `vitest` in tests).
- **Presentation purity clean:** no Prisma/DB imports in any `presentation/` tree; mutations go through `data/mutations`.
- **Violations (DEF-010, P3):** cross-feature deep imports bypass public barrels — `invoice-mutations.ts:6-7` imports customer + billing-settings *infrastructure* repositories directly; `credit-note-mutations.ts:8-9,18` imports invoice + billing-settings infrastructure plus `invoices/domain/invoice` internals; `get-eligible-invoices-for-credit.ts:4,8` same; `InvoiceCreatePage.tsx:24-26` imports customer/product `data/dto` and customer domain entities directly; `app/api/auth/[...all]/route.ts:1` and `app/(auth)/auth/page.tsx:4-5` bypass `@/features/auth` barrel. Additionally `billing-settings/index.ts:1-4` uses `export *` (exposes privates) unlike the restricted `auth/index.ts`. These do not break runtime behavior but erode the boundary rules; fixing requires introducing public contracts — deferred as refactoring, not done in this audit.

### Duplicate business logic (DEF-011, P3)

- Money/tax engine cloned: `invoices/domain/invoice.ts:60-65,76-112` vs `credit-notes/domain/credit-note.ts:74-107`; third rounding impl in `products/domain/rules/product-rules.ts:45`; fourth in `prisma-invoice-mapper.ts:87`.
- `getTodayDateString` duplicated (`invoices/domain/invoice.ts:155-161` vs local `CreditNoteCreatePage.tsx:23-29`).
- `formatCurrency`/`formatInvoiceDate` cloned across invoices, credit-notes, and two customer domain files; `customers/domain/customer.ts` + `customerValidation.ts` are legacy duplicates of `domain/entities/customer.ts` + `rules/customer-rules.ts` (`index.ts` only exports the latter).
- 12-line totals-mapping block duplicated in `invoice-mutations.ts:151-163` vs `:315-327`.
- No fix applied (would be broad refactoring; flagged for consolidation).

### Persistence concerns

- Relations/delete behavior sound: org cascade; customer/product `SetNull` with snapshot copies on invoices/CNs (correct historical integrity); `CreditNote.invoice` is `Restrict` (cannot delete invo
...[truncated 20887 chars]