# Aventra Billing — Billing Settings Integration Report

- **Date (UTC):** 2026-10-14
- **Working tree:** `/Users/javed/Desktop/aventra-billing-main` (no `.git` present — no commit baseline, no commit or push performed)
- **Rules followed:** `AGENTS.md` in full and all 21 files under `rules/`
- **Scope:** every persisted Billing Setting × Invoice, Credit Notes, Debit Notes, Recurring Invoices

---

## 1. Complete inventory of existing Billing Settings

Source of truth: one `billing_settings` row per `(organizationId, documentType)`,
validated by `billing-settings-schemas.ts` + `billing-settings-rules.ts`,
written by `updateBillingSettingsAction` (owner/admin only), read by
`getSettings`/`getAllSettings`/`allocateNextNumber`. Unconfigured types fall
back to synthesized `DEFAULT_DOCUMENT_CONFIGS` values **without writing
phantom rows** (database-verified: row count stays 0 after a pure read).

| # | Setting | Meaning | Default |
|---|---|---|---|
| 1 | `prefix` (1–20 chars, `[A-Za-z0-9\-_/]`) | Number prefix per document type | `INV-` / `DN-` / `CN-` / `REC-` |
| 2 | `suffix` (nullable, same charset) | Number suffix per document type | `null` |
| 3 | `nextNumber` (1–999,999,999) | Next sequence value | `1` |
| 4 | `padding` (1–10) | Zero-padding width | `4` |
| 5 | `defaultNotes` (≤2000 chars) | Form prefill + server fallback notes | Per-type strings |
| 6 | `defaultTerms` (≤2000 chars) | Form prefill + server fallback terms | Per-type strings |

There are **no other persisted settings**. In particular the repository has
no currency setting (hardcoded `INR (₹)` everywhere), no payment-terms
default (customer master or `"Net 15 days"`), no tax-rate default (product
catalogue + place-of-supply derivation), and no email/delivery settings for
invoices (Resend serves auth OTP only). These are marked N/A below with
reasons — not gaps.

---

## 2. Settings-to-features integration matrix

Legend: ✅ Verified end-to-end · ➖ N/A with reason · (Findings fixed during
this task are noted; evidence = code path + test.)

| Setting | Invoice | Credit Note | Debit Note | Recurring Invoice | Evidence / Gap |
|---|---|---|---|---|---|
| Number prefix/suffix/padding/sequence | ✅ | ✅ | ✅ | ✅ (generated) | `allocateNextNumber` (`FOR UPDATE` + collision-skip) called in-transaction by invoice/CN/DN creation; recurring generation flows through the invoice core. DB tests assert custom prefixes end-to-end (`ACME-`, `CR-`, `DNB-`, mid-schedule `SUB-` switch). |
| Preview number display | ✅ | ✅ | ✅ | ✅ | `previewNumber` DTO (pure `formatDocumentNumber`, never consumes); routes pass it to forms; recurring tile labeled preview-only. |
| Save sequence guard | ✅ | ✅ | ✅ | N/A (no schedule sequence; ids) | `saveSettings` refuses `nextNumber` colliding with existing docs (all three branches, incl. the `DEBIT_NOTE` branch). DB-verified for INVOICE; DN collision-skip verified on read. |
| `defaultNotes`/`defaultTerms` | ✅ (form prefill) | ✅ (form prefill + server fallback) | ✅ (form prefill + server fallback) | ✅ **FIXED** (see §4) | Invoice mutation trusts client notes (prefilled from INVOICE settings — UI suggestion, not a server rule); CN/DN mutations fall back to settings server-side when blank. |
| `RECURRING_INVOICE` numbering fields | N/A | N/A | N/A | N/A — reserved, unconsumed | Schedules use id identity; generated invoices use the INVOICE sequence. Fields persist + reload correctly (verified) but drive no behavior. The settings form now states this explicitly in the numbering section (verified by render test), so the UI cannot be read as promising sequence behavior. Documented, not removed. |
| Payment terms default | ➖ N/A — no such setting exists | ➖ | ➖ | ➖ | Terms come from the customer master, else `"Net 15 days"`; schedules freeze the value at creation. Consistent everywhere, verified in generation tests. |
| Due-date calculation | ✅ | N/A (no due dates on CN) | N/A | ✅ | Shared `calculateDueDate(issueDate, paymentTerms)` in invoice creation and generation; preview uses the same function. |
| Tax mode/rates | ✅ | ✅ | ✅ | ✅ | `determineTaxMode` (place of supply) + catalogue rates via the shared engine; recurring recomputes per generation from live supplier context. No setting overrides. |
| Currency/formatting | ✅ | ✅ | ✅ | ✅ | Shared `roundCurrency`/`formatCurrency`; 2-decimal snapshots; documents render persisted values. |
| Customer/supplier tax context | ✅ | ✅ (inherits invoice) | ✅ (inherits invoice) | ✅ | `getSupplierTaxContext` (org address/profile; documented `"27-Maharashtra"` fallback when unconfigured). |
| Allocation authorization | ✅ | ✅ | ✅ | ✅ | Mutations allocate inside owner/admin-gated flows; standalone `allocateDocumentNumberAction` is admin-only (tested). |

---

## 3. Code paths: UI → persistence → behavior

- **Save:** `BillingSettingsPage` (4 tabs) → per-type `*SettingsForm` →
  shared `DocumentSettingsForm.handleSubmit` → `updateBillingSettingsAction`
  (schema-validated, admin-only) → `saveSettings` upsert with collision guard
  → `revalidatePath` settings/invoices/new → success banner; failures show
  field errors with no write (tested).
- **Reload:** settings route → `getAllBillingSettings` → page props; forms
  initialize from props (no duplicate state).
- **Consume (numbering):** invoice/CN/DN `create*Action` →
  `allocateNextNumber(org, TYPE[, tx])` → `INV-/CN-/DN-` rows; recurring
  generation reaches the same call through `createInvoiceWithContext`.
- **Consume (defaults):** invoice/CN/DN `new` routes →
  `getBillingSettings(TYPE)` → form initial values; CN/DN mutations additionally
  fall back server-side in-transaction; recurring `new` route →
  `getBillingSettings("RECURRING_INVOICE")` for notes/terms (fixed §4) and
  `getBillingSettings("INVOICE")` for the number preview.

---

## 4. Invoice findings and fixes

- Verified: prefix/suffix/padding/sequence end-to-end (custom `ACME-0001`
  test); preview display without consumption (existing regression suite);
  defaults prefill; org isolation; admin-only writes.
- Clarified (not a defect): `defaultNotes`/`defaultTerms` are UI suggestions
  for invoices — the mutation persists client-sent notes verbatim. Left
  unchanged deliberately: notes are free text with no financial effect, and
  converting the default into a server rule would override explicit user input.
- No changes required; one regression test added (custom prefix).

---

## 5. Credit Note findings and fixes

- Verified: `CR-` custom prefix end-to-end; preview + defaults in form;
  server-side notes/terms fallback in-transaction; settlement/over-credit/
  idempotency paths untouched (full CN suites green).
- No changes required; one regression test added (custom prefix).

---

## 6. Debit Note findings and fixes

- Verified: `DNB-` custom prefix end-to-end; `DN-` collision-skip on settings
  read (seeded `DN-0001` → `nextNumber 2`, `DN-0002`); INVOICE/CN/DN sequences
  independent per org; debit semantics (receivable increase, never `PAID`)
  unchanged — full DN suites green.
- No changes required; two regression tests added (custom prefix, DN
  collision-skip).

---

## 7. Recurring Invoice findings and fixes

- **Fixed — `RECURRING_INVOICE` defaults were saved but never consumed.**
  The schedule form prefilled notes/terms from `INVOICE` settings, leaving the
  dedicated Recurring Invoice tab's `defaultNotes`/`defaultTerms` with zero
  effect anywhere. `src/app/(app)/recurring-invoices/new/page.tsx` now loads
  `getBillingSettings("RECURRING_INVOICE")` for the form defaults while
  keeping the number preview on the `INVOICE` sequence (generated invoices
  are ordinary invoices). Round-trip of the REC defaults is database-tested.
- Verified live-vs-frozen policy with tests: `INVOICE` prefix changed
  mid-schedule → next generated invoice uses the new prefix while history
  keeps the old one; customer address changed mid-schedule → next generation
  uses refreshed data; schedule items/terms frozen (existing edit test).
- Verified: schedule save persists zero invoices and advances no sequence;
  preview consumes nothing; generation honors payment terms, due dates,
  snapshots, and the allocator under concurrency.
- `RECURRING_INVOICE` numbering fields (prefix/padding/nextNumber) remain
  intentionally unconsumed (§2 table) — schedules are id-identified and
  generated invoices use the INVOICE sequence by product design.

---

## 8. Numbering and concurrency evidence

- 15-requirement mocked numbering suite still green (unaltered).
- Database-verified: custom prefix/suffix/padding allocation (`ACME-005/26`,
  `TST-001→002`), per-org independence (`ORGA-` vs `INV-0001`), DN
  collision-skip, sequence-reset refusal on collision, rollback leaves
  sequences untouched (existing CN/DN tests), concurrent unique allocation
  (existing invoice/CN/DN/recurring tests), retry exactly-once (existing
  issuance tests + recurring retry test).

---

## 9. Tax/defaults/document evidence

- Totals/taxes recomputed server-side on every mutation; documents render
  persisted snapshots (existing fixed-discount GST test + recurring
  totals test).
- Schedule-form preview uses `calculateInvoiceTotals` + `calculateDueDate`
  directly (parity-tested); generation recomputes through the same core.
- `defaultNotes`/`defaultTerms` now flow: settings → schedule form (REC) →
  schedule snapshot → generated invoice → rendered document (each hop tested
  except route prop-passing, verified by inspection + render tests).

---

## 10. Authorization and organization-isolation evidence

- Writes + standalone allocation: owner/admin only (existing permission
  tests + new member-denied DB test asserting zero rows).
- Reads: authenticated org members; every query repository org-scoped.
- New DB tests: cross-org settings independence (orgB sees defaults,
  allocates `INV-0001`); cross-org schedule trigger yields empty summary
  with zero invoices (existing); forged customer/product references rejected
  (existing).
- Validation failures write nothing (member-denied, bad-prefix, and
  collision-refused cases all assert zero rows).

---

## 11. Database migrations

None. No schema change was needed: all fixes used existing tables/columns
(`billing_settings` rows per type, schedule snapshot columns). Test database
already carries all 10 project migrations (verified in
`_prisma_migrations`).

---

## 12. Commands executed and test results

| Command | Result |
|---|---|
| `npx tsc --noEmit` | clean, exit 0 |
| `npx eslint` | clean, exit 0 |
| `npx prisma validate` | valid |
| `npx prisma generate` | client 7.10.0, exit 0 |
| `npx vitest run` (default, no DB) | 101 passed, 5 skipped (DB-gated); 643 passed, 54 skipped |
| `AVENTRA_TEST_DATABASE_URL=<isolated-test-PostgreSQL> npx vitest run` | **106 files / 697 tests passed** (baseline 105/682 → +2 tests, 0 failures) |
| `npm run build` | succeeds, 0 errors |

New tests (16): `billing-settings-database.test.ts` (9: round-trip, member
denial, prefix validation, REC defaults, custom allocation, DN collision-skip,
sequence-guard refusal, isolation, phantom-row check) + custom-prefix tests in
invoice/CN/DN suites + recurring live-policy test (prefix + customer refresh)
+ `DocumentSettingsForm` render tests (field initialization from persisted
props, REC numbering note present/absent per tab).
All other suites pass unmodified — no weakened assertions.

---

## 13. Settings marked not applicable, with reasons

- `RECURRING_INVOICE` prefix/padding/nextNumber: schedules need no sequence
  (id identity); generated invoices intentionally use `INVOICE`.
- Payment-terms default, currency setting, tax-rate setting, invoice email
  settings: do not exist in the repository; behavior comes from customer
  master/defaults, hardcoded INR formatting, catalogue rates, and (absent)
  delivery infra respectively.
- Due dates on credit/debit notes: those documents carry no due dates by
  domain design.
- Allocation at issuance: numbering happens once at creation for all types;
  no issue-time allocation exists to verify.

---

## 14. Remaining business decisions and infrastructure limitations

1. Whether `RECURRING_INVOICE` numbering fields should be hidden in the UI
   or repurposed — **resolved during final verification**: the numbering
   section now carries an explicit in-UI note that sequences are intentionally
   not consumed for recurring schedules (render-tested for presence on the
   REC tab and absence on INVOICE). Values still persist; behavior unchanged.
2. Whether invoice `defaultNotes`/`defaultTerms` should also apply
   server-side like CN/DN — **decision: remain form-only suggestions.**
   Re-verified in `invoice-mutations.ts` (client notes persisted verbatim);
   a server fallback would silently overwrite explicit user input, so no
   change was made.
3. Manual `invoiceNumber` override on draft-invoice edit bypasses prefix
   convention — **verified and preserved**: the override path retains the
   allocated number by default and accepts a manual value only when no other
   invoice in the organization holds it (`DuplicateInvoiceNumberError`
   otherwise). No format/prefix enforcement exists; no confirmed defect was
   established, so historical behavior stands.
4. Standing program items (scheduler deployment, ledger scope) per the
   recurring report; E2E browser coverage absent (no framework in repo).
   Scheduler instructions re-verified: `POST /api/cron/recurring-invoices`
   exists with `CRON_SECRET` gating (placeholder in `.env.example`, never a
   real value), processor logic is database-tested, but no live timer firing
   has been observed — code-tested vs operationally-configured remains an
   explicit distinction.

---

## 15. Verification split

- **Unit-tested:** settings schemas/rules, DTO preview formatting, permission
  denials (mocked), recurrence math (existing).
- **Mocked mutation-tested:** save/update validation + permissions (existing).
- **Database-verified:** everything in §12's new tests plus all pre-existing
  DB suites (numbering, settlement, issuance, generation, rollback,
  concurrency, isolation).
- **Unverified:** browser interaction with the settings forms (no E2E
  framework; strongest supported coverage is render tests proving fields
  initialize from persisted props, success/error banners exist, and the REC
  numbering note renders per tab); real scheduler-timer firing (route +
  processor live, timer is operational); production data (never touched —
  isolated container only).
