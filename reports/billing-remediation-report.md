# Aventra Billing — Remediation Report

- **Date (UTC):** 2026-10-14
- **Final verification (UTC):** 2026-10-14 — isolated PostgreSQL database tests executed (see §8, §9)
- **Source audit:** `reports/billing-implementation-audit.md`
- **Working tree:** `/Users/javed/Desktop/aventra-billing-main` (no `.git` present — no commit baseline, no commit or push performed)
- **Rules followed:** `AGENTS.md` in full and all applicable files under `rules/` (repository rules took precedence over prompt instructions throughout)

> **Audit-file integrity note:** the audit report on disk is **truncated** — it ends
> mid-sentence in §4 ("cannot delete invo") followed by a literal
> `...[truncated 20887 chars]` marker. The defect register (§8+), evidence
> appendices, and business-decision records (§11) are therefore **not readable**
> from the file. All defect scopes below were reconstructed from the readable
> audit sections (§1–§4), the remediation task statement, and direct
> re-verification of the current code. DEF-012 and DEF-016 (IDs only, no
> readable finding text) are recorded as **unverifiable/blocked** for this reason.
> The audit file was left untouched to preserve user-authored evidence.

---

## 1. Defect summary

| ID | Audit severity | Re-verified | Disposition |
|---|---|---|---|
| DEF-001 | P1 (fixed by audit) | Fix present in create/issue paths; **missing in update-to-issued path** | **Fixed** — settlement added to `updateCreditNoteAction`; all 3 issuance paths now identical. **Final verification:** in-transaction draft re-read added to update + issue paths (a live concurrent-retry test proved both callers could otherwise succeed); row-level Draft-conditioned deletes close the delete-vs-issue race (+2 regression tests, 13 DB tests) |
| DEF-002 | P1 (open, business decision) | Confirmed: full credit with ₹0 cash marked `PAID`; partial credit marked `PARTIALLY_PAID` | **Fixed (safe interim)** — `PAID` now requires cash covering the total; credit-only settlements keep working status; fully-credited invoices never misreported as cash-paid. Dedicated `SETTLED/CREDITED` state left as an explicit business decision |
| DEF-003 | P2 | Confirmed: eligibility = gross total − prior credits, ignoring `amountPaid` | **Kept + documented + tested** — gross cap is correct (supports refunds on paid invoices); in-transaction recheck under row lock retained; server-only; display helper clarified |
| DEF-004/005 | P2 | Confirmed: client-trusted `status` (all 6 values) and `amountPaid` (no cap) | **Fixed** — create/update accept only Draft/Issued; `amountPaid` capped at server-computed total; payment statuses server-derived only |
| DEF-006 | P2 | Confirmed: zero role checks in any business mutation | **Fixed** — owner/admin enforced server-side for issuance, deletion, billing settings; drafts/reads remain member-accessible (+7 permission tests) |
| DEF-007 | P2 | Confirmed: no app-level resend/reset throttle | **Fixed** — DB-backed 60s cooldown on OTP resend + password-reset request (multi-instance safe) (+4 tests) |
| DEF-008 | P2 | Confirmed: header discount reduced taxable but not tax (over-taxation) | **Fixed** — proportional GST reduction for fixed + percentage discounts; fixed discount capped at base (+6 tests; 1 old test corrected) |
| DEF-009 | P3 | Partially confirmed: samples exist but production routes already pass real data; two fallback seeds remained | **Fixed** — provider no longer seeds samples; omitted-catalogue shows loading state, never fixtures (+1 updated test) |
| DEF-010 | P3 | Confirmed | **Partially fixed** — billing-settings `export *` replaced with curated API; new `invoices/` public barrel; credit-note money imports migrated. Customer/product repository deep imports remain (documented debt) |
| DEF-011 | P3 | Confirmed | **Partially fixed** — single `shared/lib/money.ts`; invoice + credit-note domains delegate to it with names preserved. Product-rules/mapper rounding copies remain (documented debt) |
| DEF-012 | unknown | **Unverifiable** — finding text lost to audit truncation | **Blocked** — documented, no invented fix |
| DEF-013 | P3 | Confirmed: `NotificationButton`, `DashboardSearch` dead | **Fixed** — honest disabled/planned states |
| DEF-014 | P3 | Confirmed mechanism; gaps only on crash-between-alloc-and-persist | **Documented** — gaps-permitted policy recorded at allocator; atomicity + uniqueness retained, no sequence resets |
| DEF-015 | P2/P3 | Confirmed: update-schema refine loss, no finite/date guards, credit-note `z.number`, GSTIN casing | **Fixed** — merged-record tax checks on customer update, uppercase normalization, finite guards, real calendar dates, credit-note coercion + reason cap (+9 tests) |
| DEF-016 | unknown | **Unverifiable** — finding text lost to audit truncation | **Blocked** — documented, no invented fix |
| DEF-017 | P2 | Confirmed: `EmailAlreadyInUseError` oracle on register | **Fixed** — enumeration-safe success-shaped response, no duplicates, no mail (+2 tests) |

**No schema changes were required** (no new statuses, no Payment/ledger models added —
see §7). No migrations created. No dependencies added.

---

## 2. Critical accounting fixes

- **Status derivation** (`src/features/invoices/domain/invoice.ts`):
  `calculateRemainingReceivable({total, amountPaid, creditedAmount})` keeps cash
  vs credit distinct; `deriveInvoicePaymentStatus()` returns `Paid` **only** when
  `amountPaid >= total`. Credit-only partial settlements preserve `Issued/Overdue`;
  fully-credited-without-cash preserves working status (never `Paid`) pending a
  `SETTLED/CREDITED` business decision. `Draft/Cancelled` are terminal.
- **Settlement paths** (`credit-note-mutations.ts`): create-as-Issued and
  `issueCreditNoteAction` rewritten onto the derivation; `updateCreditNoteAction`
  Draft→Issued gained the missing settlement block (DEF-001) with identical
  eligibility + transaction boundaries. All paths row-lock the invoice and
  recheck `calculateCreditAvailability` in-transaction.
- **Eligibility** (`credit-calculation-rules.ts` + `InvoiceDetailPage.tsx`):
  maximum credit = gross invoice total − prior **issued** credits, independent of
  cash (refund support). Documented; never client-trusted.
- **amountPaid** (`invoice-mutations.ts` create + update): capped at the
  server-computed total; creation/edition accept only `Draft/Issued` — payment
  statuses cannot be forged and are never silently reset (draft guard retained).
- **Matrix verified** (`invoice-status.test.ts`, 8 tests): 10k/0/0, 10k/0/2k→8k
  remaining + stays Issued, 10k/4k/2k→4k + Partially Paid, 10k/10k/0→Paid,
  10k/0/10k→settled-but-NOT-Paid, terminal states, clamping, mixed partials.
- **Idempotency hardening (final verification):** `issueCreditNoteAction` and
  `updateCreditNoteAction` re-read the note's Draft status **inside** the
  transaction (after the invoice row lock), so concurrent/retried issuance of
  the same draft fails instead of succeeding twice — proven by a live
  double-issuance test that failed before the fix (2 successes) and passes
  after (exactly 1). Invoice and credit-note deletes are Draft-conditioned
  `deleteMany` returning the affected count (`IInvoiceRepository` /
  `ICreditNoteRepository` `delete` now `Promise<number>`); mutations reject
  when the count is 0, closing the delete-vs-issue race.

---

## 3. Permissions / security fixes

- `src/features/auth/index.ts` now publicly exports `isOrganizationAdmin`,
  `isOrganizationOwner`, `canAdministerOrganization`, `isPlatformSuperadmin`
  (pure domain helpers — the cross-feature authorization contract).
- All five feature contexts (`invoice`, `credit-note`, `billing-settings`,
  `customer`, `product`) expose `memberRole` from the verified session.
- Enforced server-side (`isOrganizationAdmin` = owner or admin):
  - invoice issue (create/update with `Issued`), invoice delete;
  - credit-note issue on **all three** issuance paths, credit-note delete;
  - billing-settings update + sequence allocation;
  - customer delete, product/catalogue delete.
  - Draft creation/edition and all reads remain member-accessible (workflows preserved).
- Existing mutation-test mocks updated with `memberRole: "owner"` +
  `@/features/auth` mock; **7 new permission tests** deny members and allow
  owners/admins.
- **DEF-007:** `auth/data/mutations/otp-cooldown.ts` — 60s DB-backed cooldown
  (Verification table, Better Auth `emailOTP` identifier format verified against
  the installed plugin) on resend + password-reset request. Multi-instance safe
  by construction (shared DB, not process memory).
- **DEF-017:** duplicate-email registration returns the identical success shape
  with zero side effects (no user/org/OTP), so the endpoint is not an oracle.
  Password reset was already enumeration-safe and now also throttled.

---

## 4. Tax and calculation fixes

- `calculateInvoiceTotals` (DEF-008): header discounts scale each line's taxable
  value by `extraDiscount / baseTaxable` and recompute GST per line —
  percentage and fixed discounts both reduce CGST/SGST/IGST proportionally;
  fixed discounts are capped at the taxable base (never negative); charges stay
  post-tax; CGST/SGST halves still sum exactly to tax. Line snapshots in
  mutations intentionally persist pre-header line amounts (documented
  Σ(lineTotal) ≠ total behavior when extras present — unchanged).
- 6 new `invoice-tax-discount.test.ts` tests (percentage, fixed, cap, mixed
  rates, post-tax charges, half-split rounding); 1 pre-existing test asserting
  the over-taxed value (34,200) corrected to 30,780 with rationale.
- No GST statutory-compliance claim is made.

---

## 5. Other billing fixes

- **DEF-009:** `CustomerWorkspaceProvider` seeds `[]` (accepts
  `initialCustomers`); `InvoiceItemsSection` shows "Loading catalogue…" when the
  prop is omitted and never renders `sampleProducts` (kept as a documented
  dev/test fixture). Verified production routes always pass real arrays.
- **DEF-010:** curated `billing-settings/index.ts`; new `invoices/index.ts`
  calculation contract; migrated importers + test mocks. Remaining debt:
  customer/product/invoice Prisma-repository deep imports (need DI/composition
  work beyond safe remediation scope).
- **DEF-011:** `src/shared/lib/money.ts` (`roundCurrency`, `formatCurrency`);
  invoice/credit-note domains delegate with export names preserved. Remaining
  debt: `product-rules` + `prisma-invoice-mapper` rounding copies.
- **DEF-013:** notification control + dashboard search are honestly disabled
  with planned-state labels (no fake functionality, no redesign).
- **DEF-014:** numbering policy documented at the allocator — uniqueness +
  `FOR UPDATE` safety kept; gaps permitted; no resets; previews never consume.
- **DEF-015:** customer update merged-record GSTIN/PAN required/format/match
  checks + uppercase normalization; `.finite()` on product/invoice/credit-note
  numerics; real calendar-date validation; credit-note `z.coerce` parity +
  500-char reason cap. (Update schema stays a plain partial because Zod
  defaults would reject sparse patches — enforced in the mutation instead.)
- **DEF-012/DEF-016:** blocked — finding text lost to audit-file truncation;
  no defect invented.

---

## 6. Files changed

**Domain (pure, no new deps):**
- `src/features/invoices/domain/invoice.ts` — prorated GST, receivable/status derivation, shared-money delegation
- `src/features/credit-notes/domain/credit-note.ts` — shared-money delegation
- `src/features/credit-notes/domain/rules/credit-calculation-rules.ts` — eligibility documentation
- `src/features/auth/domain/rules/authorization.ts` — unchanged (exported via barrel)

**Data (server actions, validation, contexts):**
- `src/features/invoices/data/mutations/invoice-mutations.ts` — status restriction, amountPaid cap, issuance/delete guards, row-level delete count check
- `src/features/credit-notes/data/mutations/credit-note-mutations.ts` — triple-path settlement, in-transaction draft re-reads, issuance/delete guards, row-level delete count check, barrel imports
- `src/features/credit-notes/data/queries/get-eligible-invoices-for-credit.ts` — barrel import
- `src/features/billing-settings/data/mutations/billing-settings-mutations.ts` — admin guards
- `src/features/customers/data/mutations/{create,update,delete}-customer.ts` — normalization, merged tax checks, delete guard
- `src/features/products/data/mutations/product-mutations.ts` — delete guard
- 5 `*/data/context/*-context.ts` — `memberRole` exposure
- `src/features/{invoices/.../invoice-schemas,credit-notes/.../credit-note-schemas,products/.../product-schemas,customers/.../customer-schemas}.ts` — validation hardening
- `src/features/auth/data/mutations/{otp-cooldown.ts (new),verify-otp.ts,password-reset.ts,register-organization.ts}` — cooldown + enumeration safety
- `src/features/auth/index.ts`, `src/features/invoices/index.ts` (new), `src/features/billing-settings/index.ts` — public contracts
- `src/shared/lib/money.ts` (new) — single money implementation

**Presentation:** `InvoiceDetailPage.tsx` (eligibility comment), `InvoiceItemsSection.tsx` (fixture fallback removal), `CustomerWorkspaceProvider.tsx` (empty seed), `NotificationButton.tsx` + `DashboardSearch.tsx` (honest disabled states).

**Infrastructure:** numbering-policy comment in `prisma-billing-settings-repository.ts`; Draft-conditioned deletes in both Prisma repositories (`delete` now returns the affected count). No schema/migration changes.

**Tests (new):** `invoice-status.test.ts`, `invoice-tax-discount.test.ts`,
`invoice-permissions.test.ts`, `billing-settings-permissions.test.ts`,
`otp-cooldown.test.ts`, `register-organization.test.ts`,
`invoice-database.test.ts` (8 DB tests), `credit-note-database.test.ts` (5 DB tests).
**Tests (updated):** accounting-regression (corrected semantics + 2 update-path
tests + 1 cash+credit test), `invoice-mutations.test.ts` (forgery tests),
`credit-note-mutations.test.ts` (member-denial tests), `customer-mutations.test.ts`
(merged-validation tests), `invoice-schemas.test.ts`, `credit-note-schemas.test.ts`,
`InvoiceItemsSection.test.ts`, `InvoiceCreatePage.test.ts` (bug-encoding correction),
context mocks (`memberRole: "owner"`, `@/features/auth` mock, billing barrel mock path).

---

## 7. Database changes

**None to the project.** No `prisma/schema.prisma` change, no migration created, no data
modified. `npx prisma validate` passes. For final verification only, the 8
existing project migrations were applied with `prisma migrate deploy` to an
isolated throwaway PostgreSQL 16 container (`aventra_test` database on
localhost:5433, test-only credentials, never production). No Payment/ledger models were added:
the product has no payment-recording workflow, so `amountPaid` remains a
server-capped manual tender at invoice creation, and outstanding stays derived
(`total − amountPaid − issuedCredits`). A real Payment feature and/or
double-entry ledger remain separately-scoped requirements (the task explicitly
forbids inventing them as a side effect).

---

## 8. Tests — exact commands and results

### Unit / mocked suite (no external services)

| Command | Result |
|---|---|
| `npx tsc --noEmit` | clean, exit 0 |
| `npx eslint` | clean, exit 0 |
| `npx prisma validate` | valid |
| `npx prisma generate` | generated client 7.10.0, exit 0 |
| `npx vitest run` (default, no DB) | **80 files passed, 2 skipped (DB-gated); 510 passed, 13 skipped** |
| `npm run build` | **succeeds** — all routes compiled |

### Isolated database verification (PostgreSQL 16 container, `aventra_test`)

Setup (test-only, never production):
`docker run -d --name aventra-billing-test-db -p 5433:5432 postgres:16-alpine`
then `DATABASE_URL="postgresql://postgres:<test-pw>@localhost:5433/aventra_test" npx prisma migrate deploy` — all 8 migrations applied successfully.

| Command | Result |
|---|---|
| `AVENTRA_TEST_DATABASE_URL="postgresql://postgres:<test-pw>@localhost:5433/aventra_test" npx vitest run` (full) | **82 files / 523 tests passed** (510 unit + 13 DB-backed) |

Database evidence (13 tests, real mutations + repositories against PostgreSQL):
- Invoice persists and reloads with identical totals/numbering (`INV-0001`, total 11,800 for 2×5,000 @18%).
- **₹10,000 / ₹0 cash / ₹2,000 issued credit → ₹8,000 balance, status stays `ISSUED`, never `PAID`** (raw row asserted).
- Draft credit notes produce zero receivable effect and no status change.
- Failed over-credit issuance leaves zero credit rows, unchanged invoice status, and unchanged billing sequence (full rollback).
- 5 concurrent over-credits (₹5,900 each vs ₹11,800): exactly 2 succeed, issued sum exactly ₹11,800.
- 10 concurrent invoice creations: 10 unique numbers.
- Concurrent double issuance of one draft: exactly 1 success (in-tx recheck; failed pre-fix with 2 successes).
- Update-path Draft→Issued settles identically to dedicated issuance.
- Cash-paid invoice issues credit, stays `PAID`; issued total counted once.
- Fixed-discount (₹2,000 off ₹10,000 @18%) persists taxable 8,000 / tax 1,440 / CGST=SGST 720 / total 9,440 — identical to domain preview; rendered `InvoiceDocument` contains the same formatted total; credit-note totals match domain calc.
- 8 concurrent credit-note allocations unique; settings reads never consume numbers.
- Cross-org reads/credit-creation denied with zero side effects.
- Member issuance/deletion/settings-allocation/customer-delete/product-delete denied against real rows (rows intact); owner paths succeed.
- Forged `Paid` status and overpayment rejected with nothing persisted.

---

## 9. Verification status

**Database-verified (isolated PostgreSQL 16, §8):** invoice/credit-note
persistence + reload, transaction rollback (no partial writes, sequence
untouched), row-locked concurrent credit eligibility (exact over-credit cap),
concurrent unique number allocation for invoices and credit notes, retry
idempotency (exactly-once issuance, update-path parity), ₹10k/₹0/₹2k → ₹8k
outstanding and not `PAID`, organization isolation, server-side owner/admin
checks for invoice issuance/deletion, credit-note issuance/deletion,
billing-settings mutation/allocation, and customer/product deletion, and
fixed-discount GST agreement across domain preview, persisted snapshot, and
rendered document.

**Unit-tested (mocked):** status-semantics matrix, prorated GST variants,
OTP cooldown windows, registration enumeration parity, customer merged-record
tax rules, calendar-date/finite/coercion validation, fixture-free rendering,
permission denials per role.

**Blocked:** DEF-012 / DEF-016 — final-verification investigation searched the
readable audit text (which references only DEF-001, 002, 004, 006–011,
013–015, 017), `reports/`, agent config dirs (`.agents/`, `.claude/`,
`.windsurf/` — skills only), and the repo for backups; no descriptions exist
anywhere. Retained as unresolved audit gaps; nothing invented.

**Unresolved / not end-to-end verified:** browser/E2E workflows (no
Playwright/Cypress in repo; none added per scope rules — print/PDF paths,
reload persistence, and document rendering beyond the static-markup agreement
test are inspection-only); real emails/OTPs (never sent); multi-instance
cooldown under load (DB-backed by design, not load-tested).

---

## 10. Business decisions required (unchanged / newly explicit)

1. **Dedicated `SETTLED`/`CREDITED` invoice state** (DEF-002 follow-up): the
   interim keeps fully-credited-without-cash invoices at their working status
   with ₹0 balance. Adopting a real state requires a Prisma enum migration plus
   query/badge/filter/transition updates.
2. **Payment recording** (audit limitation, re-confirmed): `amountPaid` is a
   capped manual tender, not a ledger. Real payment/refund/cancellation
   workflows need a scoped Payment feature with clear accounting rules.
3. **Credit-on-paid-invoice policy**: currently allowed up to the gross cap
   (refund interpretation). Confirm refund-vs-adjustment handling, including
   negative-net presentation.
4. **Member capabilities**: members may create/edit drafts and view everything;
   issuance/deletion/settings are owner/admin. Confirm this matches operations
   (especially whether admins — not just owners — should change numbering).
5. **DEF-012 / DEF-016**: finding texts unrecoverable (investigation in §9);
   re-issue required before these IDs can be closed.

---

## 11. Production readiness

**Not recommended for production release yet.** All reported financial and
authorization fixes are now covered by unit tests **and** isolated-database
evidence (§8–§9), and the full quality gate (types, lint, 523 tests, Prisma
validate/generate, build) is green. However: E2E browser verification is
absent, real email/OTP delivery is untested, multi-instance load is untested,
two defect IDs (DEF-012/DEF-016) are unrecoverable from the truncated audit,
and the `SETTLED` + Payment-model business decisions in §10 remain open.
Recommended: business sign-off on §10, E2E coverage of the money workflows,
then staging.

---

## 12. Git status

- `git status`: **not a git repository** (`.git` absent — same as the audit's
  baseline). **No repository was initialized, and no commit or push was
  performed** (including during final verification). A throwaway PostgreSQL
  Docker container was started for isolated testing only; it holds no
  production data and touches nothing in the repo. All changes are uncommitted
  working-tree edits; existing user changes, fixes, data, and architecture were preserved.
