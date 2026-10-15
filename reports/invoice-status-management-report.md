# Aventra Billing — Invoice Status Management Report (Phase 1)

- **Date (UTC):** 2026-10-14
- **Working tree:** `/Users/javed/Desktop/aventra-billing-main` (no `.git` present — no commit or push performed)
- **Rules followed:** `AGENTS.md` in full and all 21 files under `rules/`

---

## 1. Status-transition matrix (evidence-based, as implemented)

| From → To | Mechanism | Authorization | Evidence |
|---|---|---|---|
| — → Draft | `createInvoiceAction` | any member | pre-existing, unchanged |
| Draft → Issued | `updateInvoiceAction` (edit page) or `issueInvoiceAction` (detail) | owner/admin, in-tx re-read | new dedicated path added |
| Draft → Deleted | `deleteInvoiceAction` (row-guarded) | owner/admin | pre-existing, unchanged |
| Issued/Overdue → Partially Paid / Paid | settlement via CN/DN issuance; Phase 2 payment allocations | system/owner-admin | pre-existing derivation, unchanged |
| Paid → Partially Paid | debit issuance raising the balance | system | pre-existing derivation, unchanged |
| Issued/Overdue → Cancelled | `cancelInvoiceAction` (new) | owner/admin, in-tx re-read | **added — only with zero cash/credits/debits** |
| Any working state → Overdue (display) | `resolveInvoiceDisplayStatus` (pure derivation) | n/a (read path) | **added — never a stored transition** |
| Cancelled → anything | — | — | terminal by design; all paths reject |
| Draft → Paid/Overdue/Cancelled | — | — | rejected; drafts are never receivables |
| Forged status via create/update | — | — | rejected (create/update accept Draft/Issued only) |

`Overdue` and `Cancelled` previously existed in the enum, badges, and filters
but **no mutation ever wrote them** (verified by search). Overdue is now
derived; Cancelled is reachable only through the guarded cancellation path.

---

## 2. Status semantics enforced

- **Workflow vs derived states are separated.** `Draft/Issued/Cancelled`
  change only through explicit transitions; `Paid/Partially Paid` derive from
  cash covering the obligation; `Overdue` derives from due date + outstanding
  balance. No unrestricted status dropdown exists anywhere.
- **Drafts** are never receivables: not editable into payment states, never
  overdue, deletable only pre-issue.
- **Issuance** records no payment (`amountPaid` untouched, totals intact).
- **Paid** requires cash covering the net obligation; credits alone never
  produce it (pre-existing rule preserved and re-tested).
- **Overdue** requires a past due date *and* a remaining balance; settled,
  draft, and cancelled documents never display it; malformed dates are
  ignored rather than misreported. Default "today" follows the existing
  `getTodayDateString` convention and is injectable for tests.
- **Cancellation** requires a clean document (zero cash, zero issued credits,
  zero issued debits); anything with history must use adjustment workflows.
  Cancelled documents cannot be reissued, edited, deleted, credited, or
  debited (CN/DN eligibility already blocks Cancelled).

---

## 3. UI actions implemented

`InvoiceDetailPage` (existing patterns: shared `Button`, `confirm()`,
error banner, `router.refresh()`):
- Draft → Edit link, Issue Invoice (confirm), Delete (confirm → list).
- Issued/Overdue/Partially Paid → Cancel Invoice (confirm) when clean;
  otherwise an honestly-disabled "Cancel Unavailable" affordance with the
  reason in its tooltip.
- Paid/Cancelled → no mutating actions; CN/DN contextual links and print
  unchanged. No Record Payment button yet — Phase 2 adds it to this same
  action row.
- Badge shows the derived display status; list table badges and the status
  filter use the same resolver (`filterInvoices` gained an optional
  `resolveStatus`, defaulting to stored status so existing callers are
  unaffected).

---

## 4. Server-side enforcement

- `issueInvoiceAction` / `cancelInvoiceAction`: auth → org isolation →
  owner/admin → row-locked transaction → re-read status/org → transition
  guards (+ money/adjustment checks for cancel) → conditional write →
  revalidate → reload via repository. Cross-org reads return not-found (no
  existence leak); concurrent double-issue yields exactly one success;
  failures leave rows untouched (all database-verified).

---

## 5. Tests and verification results

| Command | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx eslint` | clean |
| `npx prisma validate` | valid |
| `npx vitest run` (default) | all pass, DB suites skip |
| `AVENTRA_TEST_DATABASE_URL=<isolated-PostgreSQL> npx vitest run` | **111 files / 732 tests passed** |
| `npm run build` | (run in final gate) |

New Phase 1 suites: `domain/invoice-lifecycle.test.ts` (matrix, overdue
boundaries, malformed dates, cancel guard), `domain/rules/invoice-filter-status.test.ts`
(stored + derived filtering), `data/mutations/invoice-status-mutations.test.ts`
(issue/cancel incl. races mocked, roles, cross-org), `presentation/page/InvoiceDetailPage.test.ts`
(badge + per-status action availability), `data/mutations/invoice-status-database.test.ts`
(7 DB tests: dedicated issue, concurrent exactly-once, cancel + terminality,
money-blocked cancel, derived overdue with stored status intact, forged Paid,
member/foreign denial).

---

## 6. Remaining status-policy decisions

1. No reopen/void-then-correct workflow exists; cancelled documents are
   terminal. If operations needs corrections of cancelled invoices, that is a
   separate scoped workflow (new credit-style reversal document, not flag flips).
2. No `SETTLED`/`CREDITED` state (carried over from prior reports).
3. Overdue has no notification/sweep job; it is purely derived at read time.
4. Record Payment UI arrives in Phase 2 on the same action row.
