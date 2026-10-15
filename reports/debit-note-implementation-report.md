# Aventra Billing — Debit Note Implementation Report

- **Date (UTC):** 2026-10-14
- **Working tree:** `/Users/javed/Desktop/aventra-billing-main` (no `.git` present — no commit baseline, no commit or push performed)
- **Rules followed:** `AGENTS.md` in full and all 21 files under `rules/` (repository rules took precedence over task instructions throughout; no conflicts required documentation)

---

## 1. Business meaning and why it matches the existing domain

A **Debit Note is a sales-side document recording an additional amount
receivable from a customer against an original sales invoice**
(under-billing correction, post-issue additional charges, price revision).
An issued Debit Note **increases** the invoice's remaining receivable; a
Draft has no financial effect.

Why this interpretation:
- The repository defines it: `DEFAULT_DOCUMENT_CONFIGS.DEBIT_NOTE` describes
  *"Issued for additional charges or value increments on issued invoices"*
  (`billing-settings/domain/rules/billing-settings-rules.ts:41`), with a `DN-`
  sequence, defaults, settings form, and route plumbing already reserved.
- The alternative (supplier/vendor debit note) is **unsupportable**: no
  supplier, purchase, payable, ledger, or payment model or feature exists
  anywhere in `src/` or `prisma/schema.prisma` (verified by search), and the
  task forbids fabricating suppliers, purchase invoices, or ledger balances.
- No clarification question was needed: the supplier reading would require
  inventing an entire purchase domain, while the customer reading is
  explicitly defined by the existing configuration. The supplier scope is
  recorded below as an explicit non-goal.

---

## 2. Reused modules and architecture

- **Template:** the `credit-notes` feature (domain/data/presentation/
  infrastructure split, server actions, `DN-`/`CN-` allocator, row-locked
  issuance transactions, in-transaction rechecks, status-conditioned deletes).
- **Money:** `src/shared/lib/money.ts` (`roundCurrency`, `formatCurrency`) —
  no new money/tax implementation; debit totals use the same line-math shape
  as credit notes.
- **Numbering:** the existing `billingSettingsRepository` allocator
  (`FOR UPDATE` + collision-skip + gaps-permitted policy), extended with
  `DEBIT_NOTE` branches.
- **Auth:** `isOrganizationAdmin` + `resolve*Context` conventions with
  `memberRole` exposure; issuance/deletion owner/admin-only, drafts member-accessible.
- **UI:** shared `form`/`table` components, `cn()`, semantic tokens, document/
  print pattern, route composition (`force-dynamic` server pages → `initial*`
  props), navigation `available`/`planned` convention.
- **Tests:** `*-database.test.ts` conventions (env-gated, unique orgs, no
  truncation, real mutations).

---

## 3. Implemented functionality, routes, and workflows

Feature: `src/features/debit-notes/` (domain / data / presentation /
infrastructure + curated `index.ts` barrel).

- **List:** `/debit-notes` — summary cards, search/filter/sort/pagination,
  selection, empty states, `?saved=1` banner.
- **Create + edit draft:** `/debit-notes/new` (`?invoiceId=` contextual
  preselection server-validated against the eligible list, `?edit=` draft
  editing) — invoice picker with customer/total/debited/limit tiles, reason
  select + custom reason, line items seeded from the invoice with restore,
  notes/terms, live totals + over-debit gate, preview mode, Save-as-Draft /
  Issue actions.
- **Detail:** `/debit-notes/[id]` — status badge, stat tiles, Draft actions
  (Delete/Edit/Issue with confirms) vs Issued actions (View Invoice/Print),
  error states, not-found state, printable `DebitNoteDocument`.
- **Lifecycle:** Draft → Issued (via create-as-Issued, update-to-Issued, or
  dedicated issue action) → immutable; Draft-only edit/delete; Cancelled
  terminal. All three issuance paths enforce identical eligibility,
  availability, numbering, transaction, and idempotency rules.
- **Invoice integration:** invoice detail page gains a contextual
  "Create Debit Note" link (eligibility-gated), a "Debited" stat tile, and a
  Related Debit Notes section; dashboard Billing nav promotes Debit Notes
  from planned to available (`/debit-notes`).

---

## 4. Database models and migrations

- `prisma/schema.prisma`: new `DebitNoteStatus` enum
  (`DRAFT/ISSUED/CANCELLED`), `DebitNote` + `DebitNoteItem` models mirroring
  `CreditNote`/`CreditNoteItem` (org cascade, invoice `Restrict`,
  customer/product `SetNull` with snapshots, per-org unique number, same
  indexes), plus `debitNotes`/`debitNoteItems` relations on
  Organization/Invoice/Customer/Product.
- Migration `prisma/migrations/20261014053103_add_debit_note_models/`
  created via the established workflow (`prisma migrate dev`) **against the
  isolated test database only** — additive tables + enum, no historical data
  touched, no sequence resets. `prisma validate` + `prisma generate` clean.
- Repository contract `IDebitNoteRepository` in
  `domain/repositories/` with Prisma implementation in
  `infrastructure/repositories/` (org-scoped queries, issued-total
  aggregation, tx-aware create/update, Draft-conditioned delete returning the
  affected count).

---

## 5. Numbering and Billing Settings integration

- No second numbering system: `DN-` allocation reuses the existing allocator,
  now with `DEBIT_NOTE` collision-skip branches in `getSettings`,
  `saveSettings` (sequence-reset guard), and `allocateNextNumber`
  (in-transaction). Previews (`previewNumber`) never consume a number.
- Verified: 8 concurrent `DEBIT_NOTE` allocations → 8 unique numbers;
  failed issuance rolls back the sequence bump (row asserted).

---

## 6. Tax and calculation behavior

- `calculateDebitNoteTotals`: per-line subtotal → % discount → taxable →
  rate-applied tax, CGST/SGST half-split or IGST, decimal-safe rounding —
  identical shape to credit notes, computed from the **original invoice's
  taxMode** (place-of-supply preserved). Server recomputes on every mutation;
  client previews use the same function but are informational only.
- No GST statutory-compliance claim is made.

---

## 7. Financial impact on source documents (and explicit limits)

- Issued debit `D` on invoice (`total T`, cash `P`, issued credits `C`,
  prior debits `D₀`): **remaining receivable `= T − P − C + D₀ + D`**.
  `amountPaid` is never modified; no payment records, journals, or ledger
  entries are created (none exist in the product).
- **Status derivation** (`deriveInvoicePaymentStatus`, extended with
  `debitedAmount`): `Paid` requires cash covering the net obligation — a
  debit can **never** mark an invoice `PAID`. A previously `Paid` invoice
  with a new outstanding debit honestly derives `Partially Paid`; credit-only
  settlements keep prior semantics (fully-credited-without-cash never `Paid`).
- **Debit cap:** cumulative issued debits may not exceed the invoice's gross
  total (`calculateDebitAvailability`, rechecked in-transaction under the
  invoice row lock) — symmetric with the credit cap, prevents unbounded
  receivable inflation. Deliberately **independent of cash** and deliberately
  **not expanding credit limits**: debits do not change
  `calculateCreditAvailability`, and credit-note settlement now includes
  `debitedAmount` so mixed credit/debit invoices settle correctly.
- **Posting limits (explicit):** there is no payables ledger, no supplier
  accounting, no inventory movement, and no general ledger to post to. The
  supported scope is the persisted document workflow plus the receivable
  arithmetic above; true accounting posting is out of scope until a ledger
  exists.

---

## 8. Authorization and organization isolation

- Server-side everywhere: `resolveDebitNoteContext` (auth + org + role);
  issuance on all three paths and deletion require owner/admin
  (`isOrganizationAdmin`); draft create/edit member-accessible; reads
  org-scoped; invoice/customer references verified against the active org;
  totals/taxes/status/numbers recomputed or allocated server-side; manual
  numbers conflict-checked per org.
- Concurrency: invoice `FOR UPDATE` row lock + in-transaction eligibility and
  Draft-status re-reads on update/issue paths; Draft-conditioned deletes;
  duplicate numbers rejected; failed operations return safe errors without
  leaking cross-org existence (verified: cross-org reference attempts fail
  with zero side effects).

---

## 9. Tests added and exact commands executed

New suites (10 files): `domain/debit-note.test.ts`,
`domain/rules/debit-calculation-rules.test.ts`,
`domain/rules/debit-note-filter.test.ts`,
`domain/debit-receivable.test.ts` (invoice-derivation regression),
`data/validators/debit-note-schemas.test.ts`,
`infrastructure/mappers/prisma-debit-note-mapper.test.ts`,
`data/mutations/debit-note-mutations.test.ts` (incl. member-denial),
`data/mutations/debit-note-database.test.ts` (10 DB tests),
`presentation/DebitNoteUI.test.ts`,
`presentation/page/DebitNoteCreatePage.test.ts` (shared-control render).
Extended: invoice mapper aggregation test, dashboard nav route test.

| Command | Result |
|---|---|
| `npx tsc --noEmit` | clean, exit 0 |
| `npx eslint` | clean, exit 0 |
| `npx prisma validate` | valid |
| `npx prisma generate` | client 7.10.0, exit 0 |
| `DATABASE_URL=<test-db> npx prisma migrate dev --name add_debit_note_models` | migration created + applied to isolated DB only |
| `npx vitest run` (default) | 88 passed, 3 skipped (DB-gated); 567 passed, 23 skipped |
| `AVENTRA_TEST_DATABASE_URL=<test-db> npx vitest run` (full) | **92 files / 594 tests passed** (567 unit + 27 DB-backed, incl. `DebitNoteCreatePage` shared-control render tests) |
| `npm run build` | succeeds, incl. `/debit-notes`, `/debit-notes/new`, `/debit-notes/[id]` |

---

## 10. Exact results detail

- Domain/validation/mapper/filter suites: all pass (incl. cap boundaries,
  mixed-rate proration is N/A by design — debit notes carry no header
  discount — half-split rounding, lifecycle guards, coercion/finite/reason-cap).
- Mocked mutations: validation/eligibility/over-debit/draft-neutrality/
  Paid→Partially-Paid derivation/no-PAID-from-debit/update/issue/retry-
  rejection/delete/member-denial — all pass.
- Database (isolated PostgreSQL 16, real mutations): persistence + `DN-`
  numbering + reload equality; +₹1,180 debit on ₹11,800 → ₹12,980 balance,
  status `ISSUED`, `amountPaid` untouched; paid invoice + debit →
  `PARTIALLY_PAID`; credit (₹1,180) + debit (₹2,360) → ₹12,980, stays
  `ISSUED`; draft neutrality; over-debit rollback (1 draft row survives,
  sequence untouched); 4×₹5,900 race → exactly 2 succeed, sum ₹11,800;
  double-issuance retry → exactly 1 success; update-path settlement;
  cross-org denial with zero rows; member denials with rows intact.
- Pre-existing suites: all pass unmodified except two evidence-backed
  updates — dashboard nav route list (+`/debit-notes`) and the
  over-taxation test corrected during remediation (unchanged by this task).

---

## 11. Unresolved business decisions and limitations

1. **Debit cap policy:** gross-total cap is a product safeguard, not statute.
   Confirm whether large corrections (debit > invoice total) should be
   possible, e.g. via line-level linkage to invoice items.
2. **No `SETTLED` state** (carried over): fully-credited-without-cash
   invoices keep working status; debits don't change that model.
3. **No ledger/supplier scope:** supplier-side debit notes, payables, and
   inventory effects are not implemented and must not be presented as such.
4. **Credit cap unchanged by debits:** confirm debited value should not
   expand credit eligibility.
5. Member issuance/deletion gating mirrors credit notes; confirm numbers
   settings remain admin-only (unchanged behavior).

---

## 12. Pre-existing failures

None encountered. The full suite was green before this task (82 files /
523 tests with DB) and is green after (91 / 590). Two existing test files
were updated for intended behavior changes only (nav route list; invoice
mapper aggregation addition). No unrelated failures, no weakened tests.

---

## 13. Files/modules changed

- **New feature `src/features/debit-notes/`:** `domain/debit-note.ts`,
  `domain/errors/`, `domain/repositories/`, `domain/rules/` (calculation +
  filter), `data/dto/`, `data/validators/`, `data/context/`,
  `data/queries/` (list/by-id/eligible), `data/mutations/`,
  `infrastructure/mappers/`, `infrastructure/repositories/`,
`presentation/components/` (Table/FilterBar/SummaryCards/Pagination/
StatusBadge/Document/ItemsSection — shared `Button`/`Input`/`FormError`
primitives; native elements only for the icon remove button and restore
chips, which have no shared equivalent), `presentation/page/` (List/Create/
Detail — shared `Button`/`DatePicker`/`FieldError`/`FormError`/`Input`/
`Label`/`Select`/`Textarea`), `index.ts` barrel; 10 test files.
- **Prisma:** `schema.prisma` (+80 lines), migration
  `20261014053103_add_debit_note_models/`.
- **Modified:** `invoices/domain/invoice.ts` (`debitedAmount` in type,
  totals, receivable, derivation), invoice mapper + repository (issued-debit
  aggregation), `credit-note-mutations.ts` (3 settlement blocks include
  debited amounts), billing-settings repository (`DEBIT_NOTE` branches ×3),
  dashboard navigation (+`/debit-notes`), `invoices/[id]/page.tsx` +
  `InvoiceDetailPage.tsx` (link, Debited tile, related section, grid),
  `app/(app)/debit-notes/` routes (3).

---

## 14. Verification matrix

- **Unit-tested:** totals/tax/rounding/validation/lifecycle/eligibility/cap/
  filter/summarize/mapper mapping/status derivation incl. debit mixes.
- **Mocked mutation-tested:** create/update/issue/delete, server
  recalculation, forged-input rejection, member vs owner/admin, cross-org
  denial shape, duplicate/retry rejection, validation with no side effects.
- **Database-verified:** §10 list — persistence, rollback, concurrency caps,
  retry exactly-once, update-path parity, isolation, permissions, balance
  arithmetic, numbering uniqueness, document/preview/persist agreement
  (document totals asserted against persisted rows).
- **Browser/E2E-verified:** none — no E2E framework exists in the repo and
  none was added per scope rules.
- **Not verified:** real email delivery (no emails sent by this feature);
  multi-instance load (single-container DB); supplier-side semantics
  (explicitly out of scope).

---

## 15. Completeness for the supported scope

The sales-side Debit Note workflow is **genuinely complete for the supported
scope**: model, migration, validation, authorized mutations, numbering,
listing/creation/detail/issue/delete UI, navigation, document rendering, and
receivable integration are implemented, tested (unit + mocked + database),
and quality-gated. Remaining before production release: business sign-off on
§11, E2E browser coverage of the money workflows, and the standing
program-level items (ledger scope, `SETTLED` state) from the remediation
report — none introduced by this feature.
