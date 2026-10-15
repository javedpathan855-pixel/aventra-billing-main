# Aventra Billing — Recurring Invoice Implementation Report

- **Date (UTC):** 2026-10-14
- **Working tree:** `/Users/javed/Desktop/aventra-billing-main` (no `.git` present — no commit baseline, no commit or push performed)
- **Rules followed:** `AGENTS.md` in full and all 21 files under `rules/` (repository rules took precedence throughout; one boundary correction made during work is recorded in §1)

---

## 1. Architecture and business-model decisions

- **Schedule ≠ invoice.** A `RecurringSchedule` is a billing template (customer
  snapshot, frozen line-item snapshots, recurrence policy, invoice extras);
  each billing period produces an **ordinary invoice** through the existing
  invoice system. Templates are never issued, never numbered as invoices.
- **Sales-side only.** Schedules bill customers against the existing
  receivable model. No supplier/purchase/ledger scope was invented (none
  exists in the product).
- **Reuse over duplication:** generation calls a newly extracted shared core,
  `createInvoiceWithContext` (`invoices/data/mutations/invoice-mutations.ts`),
  so validation, tax, numbering, snapshots, amountPaid caps, and status rules
  are the existing invoice implementation — not a copy. The interactive
  `createInvoiceAction` now delegates to the same core (all existing tests
  pass unchanged).
- **Boundary correction:** an early draft exported the server core through
  the (client-safe) `invoices/` barrel, which would have dragged server
  modules into client components. Reverted: the barrel stays domain-pure;
  server consumers import the deep data paths, matching existing precedent
  (routes import deep queries, mutations import deep repositories).
- **Processor placement:** the scheduler (`run-recurring-scheduler.ts`) lives
  in `data/mutations/` — write-oriented server orchestration, the closest
  taxonomy fit (documented here per rule 21 rather than inventing a folder).
- **No new dependencies, no queue system.** Durability comes from PostgreSQL
  (unique constraints, row locks, conditional updates), which the product
  already operates.

---

## 2. Routes and user workflows implemented

- `/recurring-invoices` — list with summary cards, search/status/frequency/
  customer filters, sorting, pagination, empty states, `?saved=1` banner.
- `/recurring-invoices/new` — **Create Recurring Invoice form composed like
  Create Invoice**: back nav → header + primary action → `FormError` →
  Invoice Details card (customer `Select` with search affordance and
  + Add Customer link, empty-catalogue state, read-only customer profile card
  with GSTIN/PAN/terms badges and email/phone/place-of-supply/address blocks,
  parameters row with read-only first-invoice-number preview, payment-terms
  preset `Select`, and tax-treatment note) → Recurrence Settings card →
  line-item table (catalogue picker, HSN, qty, price, discount, GST slab
  `Select`, amount, add/remove) → Charges & Discount + Invoice Summary grid
  (`lg:grid-cols-[1.35fr_1fr]` identical to Create Invoice) → Additional
  Information card → bottom error + action bar.
  Shared `Button/DatePicker/FieldError/FormError/Input/Label/Select/
  Textarea/Table/Checkbox/Pagination` throughout; no native form controls
  remain except the icon remove button and restore chips, which have no
  shared equivalent (same as the invoice line editor).
- `/recurring-invoices/[id]` — detail: status/rules/next-run tiles, last
  result, generated invoices with links to ordinary invoice pages, full
  generation history with failure messages, pause/resume/complete/cancel/
  delete (history-guarded)/Run-Now/retry-failed actions, all working or
  conditionally rendered (no dead controls).
- Navigation: Billing → Recurring Invoices promoted from planned to
  available (`/recurring-invoices`).
- Preview summary mirrors Create Invoice's `InvoiceSummarySection`
  structure: Subtotal / Discount (always shown) / Additional Charges
  (conditional) / Taxable Amount / Tax Amount rows, GST sub-card with
  CGST/SGST-or-IGST rows plus per-rate slab breakdown, and pinned
  "Total Amount" band. Title/subtitle mark it estimated; no interactive
  tax-mode toggle (the server recomputes the mode per generation, so a toggle
  would mislead); schedule context (first billing/due dates, number preview)
  lives in a caption line, and previewing never persists or numbers anything.

---

## 3. Database models and migrations

- `RecurringSchedule` (org cascade; customer/product `SetNull` + snapshots;
  frequency/start/end/nextRun/timezone/status; frozen extras/notes/terms;
  success/failure counters; `createdBy`; indexes incl.
  `(organizationId, status, nextRunDate)`), `RecurringScheduleItem`
  (snapshot lines), `RecurringOccurrence` (`@@unique([scheduleId, periodKey])`,
  PENDING/PROCESSING/SUCCEEDED/FAILED, attempts, claim, invoice link with
  number, sliced error).
- `Invoice` gains nullable `recurringScheduleId`/`recurringPeriod` + composite
  index (generation linkage for idempotent recovery; ordinary invoices leave
  them null; draft edits never touch them — update mapping unchanged).
- Migration `prisma/migrations/20261014060424_add_recurring_schedule_models/`
  via `prisma migrate dev` **against the isolated test database only**;
  additive, no data rewritten. `prisma validate` + `generate` clean.

---

## 4. Recurrence semantics and timezone policy

- Weekly +7d; Monthly/Quarterly/Yearly add calendar months (never 30/365-day
  arithmetic). Day-of-month anchor from startDate is preserved; short months
  clamp without moving the anchor (Jan 31 → Feb 28 → Mar 31); Feb 29 →
  Feb 28 non-leap / Feb 29 leap.
- Timezone (default `Asia/Kolkata`, validated IANA) decides only which
  calendar day "today" is; all math is date-only so DST cannot shift a period.
- Missed-run policy (documented in code): **catch up every missed period as
  separate invoices**, max 10/schedule/run (remainder next run).
- Periods past `endDate` never generate; schedule COMPLETES when nextRun
  passes endDate. Pause skips; resume keeps nextRunDate (catch-up applies).
  Failures never advance; 5 attempts → FAILED + auto-pause (no infinite retry).
- Stale PROCESSING claims (>15 min) recover via the invoice linkage
  (adopt-if-present, else release-and-reclaim).

---

## 5. Scheduler mechanism and deployment configuration

- Authenticated route `POST /api/cron/recurring-invoices` (GET → 405):
  Bearer `CRON_SECRET` with timing-safe comparison, fail-closed without a
  secret, generic 401 (no oracle), counts-only JSON response.
- **No in-app scheduler exists and none was faked.** Deployment requires an
  external cron hitting the route; recommended every 15 minutes:
  `curl -X POST https://<app>/api/cron/recurring-invoices -H "Authorization: Bearer $CRON_SECRET"`.
  Vercel Cron equivalent: a `crons` entry with `path:
  "/api/cron/recurring-invoices"` (not added — no Vercel project detected in
  repo; see §15). `CRON_SECRET` (≥32 chars) documented in `.env.example`
  (placeholder only); unit tests cover auth accept/reject/misconfiguration.
- Manual Run Now (owner/admin) runs the same idempotent processor.

---

## 6. Billing Settings and invoice numbering integration

- Generated invoices use the ordinary `INVOICE` sequence via the existing
  allocator (prefixes, collision-skip, gaps policy untouched). No separate
  recurring numbering for invoices; schedule identity is its `id`.
- Allocation failures abort generation before any persistence; retries reuse
  the allocator idempotently. Verified: unique numbers across concurrent
  schedules; failed runs consume nothing observable.

---

## 7. Tax/calculation reuse and invoice lifecycle integration

- Generation builds a `CreateInvoiceInputDto` and runs it through the shared
  core: schema validation, supplier-context tax-mode determination,
  `calculateInvoiceTotals` (incl. header extras), `calculateDueDate` from
  payment terms, customer snapshots, `INV-` numbering.
- Generated invoices are `Issued` with `amountPaid: 0` — never `PAID`, no
  payment records. Standing issuance authorization derives from
  owner/admin-only schedule activation, recorded per run (`allowIssued`).
- Delete rule: schedules with any succeeded generation cannot be deleted
  (repository-enforced); complete/cancel instead. Edits never rewrite
  generated invoices (separate rows; verified).

---

## 8. Idempotency, transaction, concurrency, and recovery strategy

- Identity: `(scheduleId, periodKey)` unique constraint; atomic
  `INSERT ... ON CONFLICT DO NOTHING` claims (exactly one worker wins);
  conditional PENDING→PROCESSING transitions; in-transaction Draft re-read
  pattern reused from debit/credit issuance.
- Success and schedule advance commit atomically (`markSucceeded` +
  `updateProgress` in one transaction). Invoice creation uses the core's own
  transactions; cross-step crashes recover via the invoice linkage
  (adopt-or-retry), proven by test.
- Concurrency verified live: dual workers → 1 invoice; manual + scheduled
  race → 1 invoice; 5-way over-debit-style races N/A — instead 4 parallel
  periods on 2 schedules → unique numbers, correct linkage.
- Stale claims (>15 min) adopt linked invoices or release for retry.

---

## 9. Authorization and organization isolation protections

- Schedule create/update/pause/resume/complete/cancel/delete/trigger/retry:
  owner/admin server-side; reads member-accessible. Processor operates per
  schedule strictly inside its own `organizationId`; every read/write is
  org-scoped; customer/product references verified at schedule write time;
  totals/status/numbers server-computed; cron route secret-gated; manual
  trigger cannot cross orgs (verified: empty summary, zero rows).
- DB-verified denials leave zero side effects (row counts asserted).

---

## 10. Missed-run and retry policy

- Catch up all missed periods (bounded 10/run), each idempotent; retries keep
  the original period identity; transient vs invalid distinguished by attempt
  budget (5) with auto-pause + visible diagnostics; stale claims recovered;
  email never retried (no email step exists — see §11).

---

## 11. Email/notification integration status

- **Not implemented — honestly absent.** Invoice email delivery does not exist
  in this product (Resend serves auth OTP only), so generation creates the
  invoice and stops. No fake mailer, no "sent" claims, no invoice payloads in
  logs. Future integration point: post-persistence notify step keyed off
  occurrence SUCCEEDED + invoiceId.

---

## 12. Tests added and exact commands executed

New suites (12 files): `recurrence-rules.test.ts` (calendar/leap/clamp/
catch-up/timezone), `recurring-schedule.test.ts` (guards/validation),
`recurring-filter.test.ts`, `recurring-schedule-schemas.test.ts`,
`prisma-recurring-mapper.test.ts`, `recurring-schedule-mutations.test.ts`
(CRUD/transitions/permissions), `recurring-scheduler.test.ts` (processor
branches, mocked), `recurring-database.test.ts` (16 DB tests),
`RecurringScheduleUI.test.ts`, `RecurringScheduleCreatePage.test.ts`,
`infrastructure/config/cron-auth.test.ts`, `app/api/cron/.../route.test.ts`
(401/405/misconfig + DB success shape).

| Command | Result |
|---|---|
| `npx tsc --noEmit` | clean, exit 0 |
| `npx eslint` | clean (0 errors, 0 warnings) |
| `npx prisma validate` | valid |
| `npx prisma generate` | client 7.10.0, exit 0 |
| `DATABASE_URL=<isolated-test-db> npx prisma migrate dev --name add_recurring_schedule_models` | migration created + applied to test DB only |
| `npx vitest run` (default) | 100 passed, 4 skipped (DB-gated); 634 passed, 40 skipped |
| `AVENTRA_TEST_DATABASE_URL=<isolated-test-db> npx vitest run` (full) | **104 files / 674 tests passed** (634 unit + 40 DB-backed) |
| `npm run build` | succeeds, incl. `/recurring-invoices*` and `/api/cron/recurring-invoices` |

---

## 13. Exact test counts and quality-gate results

- Baseline before task: 92 files / 594 tests (with DB). After: **104 / 674**,
  all passing; default (no-DB) run greens with DB suites skipping.
- 12 new test files (+1 extended: dashboard nav routes 9→10). Zero weakened
  assertions; two pre-existing expectations updated only for intended behavior
  (nav route list; none for billing logic).

---

## 14. Verification matrix

- **Unit-tested:** recurrence math (weekly/monthly/quarterly/yearly,
  month-end clamp, leap years, invalid dates, catch-up bounds, end-date
  exclusion, timezone today/validation), lifecycle guards, schemas, mapper,
  filter/summary, cron auth, processor branches (claim conflict, stale
  recovery ×2, failure/no-advance, retry budget auto-pause, completion).
- **Mocked mutation-tested:** schedule CRUD, pause/resume/complete/cancel,
  delete guard, member-vs-owner/admin, cross-shape validation failures.
- **Database-verified:** persistence/reload, end-to-end generation (ordinary
  `Issued` invoice, `INV-` number, ₹11,800 totals, snapshots, linkage),
  catch-up chains, concurrent-worker and manual-vs-scheduled exactly-once,
  failure-no-advance with visible error, stale-claim adoption, snapshot
  billing after customer deletion, pause/resume, end-date completion,
  edit-vs-history immutability, isolation, permissions, delete guard, unique
  numbering, repository reload, cron success shape.
- **Browser/E2E-verified:** none — no E2E framework exists in the repo and
  none was added per scope rules (UI verified via render tests).
- **Not verified:** real scheduler firing on a timer (route + processor live,
  timer deployment is operational); multi-instance load beyond 2-way races;
  real email delivery (no such step).

---

## 15. What remains unverified or requires deployment/business sign-off

1. **Scheduler deployment:** configure the external cron + `CRON_SECRET` in
   the hosting platform (recommended */15 min); until then, only manual Run
   Now executes generation.
2. **Missed-run bound (10/run) and retry budget (5) / stale window (15 min):**
   operational constants — confirm against expected volume.
3. **Debit-style cap question does not apply** (invoices generate at template
   value by design); confirm large-value schedules need no extra approval.
4. **Email notifications** on generation (no product email infra for invoices).
5. Standing program items (ledger scope, `SETTLED` state) are untouched by
   this feature.

---

## 16. Production-readiness assessment based on evidence

The feature is **functionally complete and database-verified for its
supported scope**, with all quality gates green and no regressions. It is
**not yet production-operable** until the external scheduler + secret are
deployed (§15.1) and the business confirms the operational constants (§15.2).
Recommended path: deploy scheduler to staging, observe catch-up/retry
behavior on real periods, confirm §15 items, then release.
