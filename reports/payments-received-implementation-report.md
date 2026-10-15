# Aventra Billing — Payments Received Implementation Report (Phase 2)

- **Date (UTC):** 2026-10-14
- **Working tree:** `/Users/javed/Desktop/aventra-billing-main` (no `.git` present — no commit or push performed)
- **Rules followed:** `AGENTS.md` in full and all 21 files under `rules/`
- **Companion:** `reports/invoice-status-management-report.md` (Phase 1 foundation)

---

## 1. Payment data model

`prisma/migrations/20261014085558_add_payment_models/` (isolated test DB only):

- `Payment`: org (cascade), customer ref + `SetNull` + name snapshot, `amount`
  (must equal allocations sum), currency, `paymentDate`, `method`
  (`CASH/BANK_TRANSFER/UPI/CHEQUE/CARD/OTHER`), optional reference/notes,
  `status` (`ACTIVE/REVERSED`), `reversedAt/reversalReason/reversedBy`,
  nullable `idempotencyKey` (`@@unique([organizationId, idempotencyKey])`,
  NULLs distinct), `createdBy`, timestamps. No auto-number exists (no payment
  sequence in Billing Settings by design); records are identified by id and
  displayed by date/customer/amount/method.
- `PaymentAllocation`: org-scoped, payment (cascade), invoice (`Restrict`),
  immutable `amount`; `@@unique([paymentId, invoiceId])` so one payment can
  never double-apply to an invoice.
- Relations added to Organization/Customer/Invoice; composite index
  `(recurringScheduleId, recurringPeriod)`-style lookup is
  `(schedule-equivalent)` n/a — recovery uses
  `@@index([recurringScheduleId...])`-style dedicated index on allocations
  plus `findInvoiceForPeriod`-style direct queries (see §5).

---

## 2. `amountPaid` migration/reconciliation strategy

Audit result: `amountPaid` is written **only** by invoice create/update from
client input (capped at the total; UI forms always send 0), and **no payment,
allocation, refund, or ledger records exist anywhere**.

Policy (no backfill, no data rewrite, nothing fabricated):
- Legacy `amountPaid` keeps counting **exactly as before** (frozen manual
  tender at document creation).
- All new cash flows **exclusively** through Payment allocations.
- Effective cash = `amountPaid` + active allocations; allocation guards cap
  the combined cash at the net obligation, so double-counting is impossible
  by construction (a euro of cash is either tender or allocation, never both).
- Invoice update additionally caps `amountPaid + existing allocations` at the
  total (defensive; drafts cannot carry allocations today).

---

## 3. Allocation model and overpayment policy

- One payment → many invoices, each invoice once per payment; full-allocation
  policy: `sum(allocations) == amount` enforced server-side
  (`PaymentTotalMismatchError`); **excess cash is rejected**, never parked as
  unallocated credit and never silently over-applied
  (`ExceededInvoiceBalanceError` per invoice, computed in-transaction).
- Customer consistency: every allocated invoice's `customerId` must equal the
  payment's (invoices without a linked customer cannot receive allocations).
- Eligible invoice statuses: Issued/Partially Paid/Paid/Overdue (Paid has
  zero remaining, so the cap rejects naturally); Draft/Cancelled rejected.

---

## 4. Invoice balance/status integration

- `calculateRemainingReceivable`, `deriveInvoicePaymentStatus`,
  `calculateInvoiceTotals`, `resolveInvoiceDisplayStatus`, `canCancelInvoice`,
  and `summarizeInvoices` all accept `allocatedCash` (default 0 — every
  pre-existing caller behaves identically).
- Invoice mapper aggregates **active** allocations only; CN/DN settlement
  blocks and the cancel guard consume the new sums; the detail Paid tile
  shows effective cash with a Related Payments section; list badges/filters
  follow automatically through the display resolver.
- Required examples verified live (Cases A–F): partial → 6,000/Partially
  Paid; full → 0/Paid; credit-only → 8,000/never-Paid; credit + cash → 0/Paid;
  reversal → balance/status restored with history intact; overpayment →
  rejected with zero rows.

---

## 5. Authorization and organization isolation

- Record/reverse/trigger-style operations: owner/admin server-side; reads are
  member-accessible but strictly org-scoped. Customer/invoice references
  verified per org; forged amounts/statuses/org IDs rejected; failures write
  nothing (row counts asserted). Cross-org access returns not-found without
  leaking existence.

---

## 6. Transaction, idempotency, and concurrency guarantees

- Record: invoice rows locked `FOR UPDATE` in id order → in-tx eligibility +
  cap rechecks → atomic payment+allocations create → per-invoice status
  derivation. `P2002` on the idempotency key returns the winner (duplicate
  submissions, concurrent same-key races).
- Reverse: conditional `ACTIVE→REVERSED` transition (double reversal
  impossible) + locked, recomputed per-invoice statuses with explicit
  stale-`Paid` correction (cashless balance returns to `Issued`; overdue
  derives at read time).
- Cancel path additionally refuses invoices with active allocations.
- Verified live: concurrent allocators → exactly one wins; mid-payment
  failure rolls back all rows; retry of one draft issuance → one success.

---

## 7. Refund/reversal scope

- Reversal = audited state transition (reason/by/at preserved, allocations
  intact, record never deleted). No bank/gateway integration exists or is
  claimed. No partial-reversal or refund-to-credit workflow — reversing the
  payment and issuing a Credit Note covers the supported cases; anything
  beyond is documented here as out of scope.

---

## 8. Database integration evidence

16 DB tests in `payments/.../payment-database.test.ts` plus allocation-guard
coverage in `invoice-status-mutations.test.ts`, all against isolated
PostgreSQL 16 (migrations deployed, per-org namespaced data, no truncation
races): create/reload, multi-invoice allocation, Cases A–F outcomes incl.
stored statuses, overpayment zero-write, duplicate-key single row, concurrent
exactly-once with capped sums, mid-payment rollback, cross-org/member denial
with zero rows, legacy-tender coexistence + combined cap, cancel-blocked with
status intact.

---

## 9. Exact tests and commands executed

| Command | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx eslint` | clean (0 warnings) |
| `npx prisma validate` | valid |
| `npx prisma generate` | client 7.10.0 |
| `DATABASE_URL=<isolated-test-DB> npx prisma migrate dev --name add_payment_models` | applied to test DB only |
| `npx vitest run` (default) | all pass, DB suites skip |
| `AVENTRA_TEST_DATABASE_URL=<isolated-test-DB> npx vitest run` | **120 files / 789 tests passed** |
| `npm run build` | succeeds, incl. `/payments*` |

New suites: `payments/domain/{payment,payment-rules,payment-filter}.test`,
`data/validators/payment-schemas.test`, `mappers/prisma-payment-mapper.test`,
`data/mutations/payment-mutations.test` (record + reverse branches),
`data/mutations/payment-database.test.ts` (16 DB tests),
`presentation/{PaymentUI,PaymentCreatePage}.test`. During this work the mocked
suite caught and fixed one genuine domain bug (Partially-Paid branch ignored
allocated cash) before any database run.

---

## 10. Verification split

- **Unit-tested:** payment math, allocation rules, schemas, mappers, filters,
  status matrix incl. allocation-aware derivation.
- **Mocked mutation-tested:** record/reverse validation, roles, cross-org,
  caps, idempotency return, double-reversal refusal.
- **Database-verified:** §8 list — persistence, allocation, balances,
  statuses, credits interplay, overpayment, duplicates, concurrency,
  rollback, isolation, reversals, legacy coexistence, cancellation guards.
- **E2E-verified:** none — no browser framework exists in the repo and none
  was added per scope rules (UI verified via render tests).
- **Not verified:** real bank settlement (no integration exists or is
  claimed); multi-instance load beyond 2-way races; production data (never
  touched).

---

## 11. Remaining business and operational limitations

1. No payment auto-numbering (by design — no sequence exists); no partial
   reversals or refund-to-credit workflow.
2. Invoices without a linked customer cannot receive allocations (strict
   customer-match rule); relaxing it needs a business decision.
3. Future-dated payments are rejected; backdated recording is allowed.
4. No `SETTLED` state (carried over); no payment email notifications (no
   product email infra for invoices); no E2E coverage.
5. Standing program items (scheduler deployment) per the recurring report.
