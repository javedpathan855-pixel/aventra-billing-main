# Aventra Billing — Sales Estimates & Quotations + Sales Settings Implementation Report

- **Date (UTC):** 2026-10-14
- **Working tree:** `/Users/javed/Desktop/aventra-billing-main` (No git commits or pushes performed; all changes kept in working tree)
- **Rules followed:** `AGENTS.md` and all rules under `/rules/` followed strictly. Clean Architecture preserved across domain, data, presentation, and infrastructure layers. Project-defined functions use arrow syntax. Design tokens use semantic CSS variables.

---

## 1. Feature Summary and Implemented Scope

A production-quality **Sales Estimates & Quotations** module and dedicated **Sales Settings** feature were implemented end-to-end for Aventra Billing:
- **Commercial Proposal Domain:** Estimates/quotations represent commercial quotes provided to clients. They do NOT act as tax invoices or receivables until explicitly accepted and converted.
- **Dedicated Sales Settings:** Created under Settings & Integrations (`/settings/sales`) to configure quotation numbering prefix, starting sequence number, padding digits, optional suffix, default validity period in days, and default customer notes and terms.
- **Complete Lifecycle Management:** State machine supporting `Draft`, `Sent`, `Accepted`, `Rejected`, `Expired`, `Converted`, and `Cancelled`.
- **Atomic Invoice Conversion:** High-integrity conversion engine that creates a genuine `Invoice` in an atomic PostgreSQL transaction using the existing Invoice domain, repository, sequence allocation, and tax calculation conventions. Links the generated invoice bidirectionally and enforces single-conversion idempotency.
- **Full Clean Architecture:** Implemented in `src/features/estimates/` and `src/features/sales-settings/`, with zero domain leakage of React, Next.js, or Prisma.

---

## 2. Routes and Navigation Entries Added or Changed

### Routes Added
1. `/estimates` (`src/app/(app)/estimates/page.tsx`):
   - Server-rendered listing page with active organization scoping.
   - Summary metric cards (Total Quotations, Accepted Value, Pending/Sent Value, Converted Count).
   - Filter bar (status filter, query search, reset).
   - Data table with document numbers, customer details, dates, validity status, calculated total, lifecycle badges, and contextual row actions.
2. `/estimates/new` (`src/app/(app)/estimates/new/page.tsx`):
   - Creation page with customer selection, contact/address snapshots, itemized lines, quantity/unit-price/discount/tax inputs, live client preview with server-recomputed totals, notes, terms, and sticky actions.
   - Pre-fills defaults from active `SalesSettings` (validity days, quotation notes, terms).
3. `/estimates/[id]` (`src/app/(app)/estimates/[id]/page.tsx`):
   - Detailed document view displaying quotation header, customer snapshot, line items breakdown, GST/tax distribution, totals summary, customer notes, and terms.
   - Contextual lifecycle action controls (Edit, Mark as Sent, Accept, Reject, Cancel, Reopen, Delete, Convert to Invoice, Print).
   - Post-conversion linked banner directing to the generated Invoice (`/invoices/[id]`).
4. `/estimates/[id]/edit` (`src/app/(app)/estimates/[id]/edit/page.tsx`):
   - Safe draft editor. Edits are permitted exclusively for `Draft` quotations; non-draft documents are locked.
5. `/settings/sales` (`src/app/(app)/settings/sales/page.tsx`):
   - Dedicated Sales Settings under Settings & Integrations.
   - Manages estimate numbering sequence, prefix, suffix, padding, validity period, and default notes/terms.

### Navigation Updates
- Updated `src/features/dashboard/presentation/components/dashboardNavigation.ts`:
  - `sales-estimates`: Promoted from `planned` to `available` with route `/estimates`.
  - `settings-sales`: Registered as `available` under Settings & Integrations with route `/settings/sales`.
  - All existing sidebar and Mega Menu tests updated and passing (30/30).

---

## 3. Sales Settings Fields and Actual Behavior

The Sales Settings feature resides in `src/features/sales-settings/` and persists to the `SalesSettings` PostgreSQL model:
- `estimatePrefix`: Prefix string (1-20 characters, alphanumeric, hyphen, slash, underscore). Defaults to `"EST-"`.
- `estimateSuffix`: Optional suffix string (e.g. `"/2026"`).
- `estimateNextNumber`: Integer sequence counter (min 1, max 999,999,999).
- `estimatePadding`: Number of leading zero padding digits (min 1, max 10). Defaults to 4.
- `defaultValidityDays`: Default quote validity window in days (min 1, max 365). Defaults to 30 days.
- `defaultNotes`: Default customer-facing notes prefilled on new quotation forms.
- `defaultTerms`: Default commercial terms and conditions prefilled on new quotation forms.

### Concurrency and Sequence Allocation
- Sequence allocation uses row-level locking (`SELECT ... FOR UPDATE`) in `prisma-sales-settings-repository.ts`.
- When an estimate is saved, the sequence number is safely incremented and formatted (e.g. `EST-0001`).
- Collision-skipping logic ensures that if a document with that number already exists, the allocator increments to find the next unused number.

---

## 4. Domain, Schema, Migration, and Persistence Changes

### Prisma Schema (`prisma/schema.prisma`)
Added:
1. `enum EstimateStatus`: `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONVERTED`, `CANCELLED`.
2. `model Estimate`:
   - Document metadata: `id`, `organizationId`, `estimateNumber`, `referenceNumber`, `issueDate`, `validUntil`, `status`.
   - Customer snapshots: `customerId`, `customerName`, `customerEmail`, `customerAddress`, `customerGstin`, `customerPlaceOfSupply`.
   - Tax & financial: `taxMode`, `currency`, `subtotal`, `lineDiscountTotal`, `additionalDiscount`, `additionalDiscountType`, `additionalDiscountLabel`, `additionalCharges`, `additionalChargesLabel`, `taxableAmount`, `cgst`, `sgst`, `igst`, `totalTax`, `totalAmount`.
   - Accounting relations: `convertedToInvoiceId` (with unique constraint `@unique`), `convertedAt`, `notes`, `terms`.
   - Relations: `Organization`, `Customer`, `Invoice` (`convertedToInvoice`).
   - Indexes: `[organizationId]`, `[organizationId, status]`, `[organizationId, estimateNumber]`, `[organizationId, issueDate]`.
3. `model EstimateItem`:
   - Line-item data: `id`, `estimateId`, `productId`, `item`, `description`, `hsnSac`, `quantity`, `unitPrice`, `discount`, `taxRate`, `taxableAmount`, `taxAmount`, `lineTotal`, `sortOrder`.
   - Relations: `Estimate` (cascade delete), `Product` (optional set null).
4. `model SalesSettings`:
   - Settings data: `id`, `organizationId` (`@unique`), `estimatePrefix`, `estimateSuffix`, `estimateNextNumber`, `estimatePadding`, `defaultValidityDays`, `defaultNotes`, `defaultTerms`.
   - Relation: `Organization` (cascade delete).

### Real Migration
Executed standard Prisma migration workflow:
- Migration file created: `prisma/migrations/20261014101650_add_estimates_and_sales_settings/migration.sql`.
- Migration applied against the local PostgreSQL test database without using `prisma db push`.

---

## 5. Estimate/Quotation Lifecycle and Transition Rules

A pure domain state machine in `src/features/estimates/domain/rules/estimate-lifecycle-rules.ts` governs all transitions:

| From Status | Permitted Target Statuses | Trigger Action | Guard / Business Rule |
|---|---|---|---|
| `Draft` | `Sent`, `Cancelled` | Mark as Sent / Cancel | May be edited or deleted only while in `Draft`. |
| `Sent` | `Accepted`, `Rejected`, `Cancelled`, `Converted` | Accept / Reject / Cancel / Convert | Proposal is active with customer; locked against line editing. |
| `Accepted` | `Converted`, `Cancelled` | Convert to Invoice / Cancel | Eligible for conversion to a genuine invoice. |
| `Rejected` | `Draft` (Reopened) | Reopen Quotation | Cannot be converted or edited directly. |
| `Expired` | `Draft` (Reopened) | Reopen Quotation | Auto-derived when `validUntil < today` and status is `Draft` or `Sent`. |
| `Converted` | *Terminal* | *None* | Permanently locked; linked to generated invoice. |
| `Cancelled` | `Draft` (Reopened) | Reopen Quotation | Terminal unless explicitly reopened as Draft. |

---

## 6. Numbering and Concurrency Guarantees

- **Sequence Independence:** Estimates have an independent sequence counter isolated from Invoices (`SalesSettings.estimateNextNumber` vs `BillingSettings.invoiceNextNumber`).
- **Row-Lock Allocation:** Sequence reservation executes in an isolated transaction using `FOR UPDATE`.
- **Duplicate Prevention:** A composite unique constraint `@@unique([organizationId, estimateNumber])` guarantees no two estimates share a number within an organization.
- **Concurrency Test Verification:** Concurrent creations under load verified that parallel requests receive distinct, monotonically increasing document numbers without collisions.

---

## 7. Tax and Monetary Calculation Approach

Calculations reuse the established Aventra money and tax architecture:
- Authoritative money utilities: `roundCurrency` and `formatCurrency` from `@/shared/lib/money`.
- GST tax engine: `determineTaxMode` from `@/features/invoices/domain/rules/tax-rules` (CGST+SGST for intra-state, IGST for inter-state based on supplier state and customer place of supply).
- Line calculation:
  - Line subtotal: `quantity * unitPrice`.
  - Line discount: percentage deduction `(quantity * unitPrice) * (discount / 100)`.
  - Line taxable: `lineSubtotal - lineDiscount`.
  - Line tax: `lineTaxable * (taxRate / 100)`.
  - Line total: `lineTaxable + lineTax`.
- Header additional charges and discounts:
  - Header discount applied before tax across eligible items.
  - Additional charges added to taxable base or gross total according to configured tax treatment.
- Validation: Server-side validation guarantees quantities > 0, non-negative unit prices, discounts between 0% and 100%, and valid rates. Client calculations are strictly informational.

---

## 8. Invoice Conversion Behavior and Safeguards

Conversion to Invoice is implemented as an atomic accounting workflow (`convertEstimateToInvoiceAction` in `estimate-mutations.ts`):
1. **Eligibility Check:** Must be in `Accepted` or `Sent` status. Cannot be already converted.
2. **Transaction & Row Lock:** Executes within `prisma.$transaction`. Re-fetches the estimate with a row lock to eliminate race conditions.
3. **Genuine Invoice Generation:**
   - Allocates the next official Invoice Number from `billingSettingsRepository.allocateNextNumber(organizationId, "INVOICE")` (e.g. `INV-0042`).
   - Replicates line items, descriptions, quantities, unit prices, discounts, and tax rates.
   - Computes authoritative invoice totals using `calculateInvoiceTotals`.
   - Creates the genuine `Invoice` record using `invoiceRepository.create`.
4. **Bidirectional Linkage:**
   - Sets `convertedToInvoiceId = invoice.id` and `convertedAt = now()` on the `Estimate`.
   - Sets status to `Converted`.
5. **No False Payments:** The resulting invoice is created as an outstanding `Draft` (or standard invoice). It does not mark the invoice as paid or fabricate cash records.
6. **Rollback Guarantee:** If invoice creation fails, the entire transaction rolls back; the estimate remains `Accepted` and no partial invoice is left behind.

---

## 9. Authorization and Organization-Isolation Safeguards

- **Multi-Tenancy Enforcement:** Every database query filters by `organizationId` derived strictly from server-side session authentication (`resolveEstimateContext`).
- **Role-Based Access Control:**
  - Standard organization members can view, create drafts, and update draft quotations.
  - Destructive operations (deletion) and settings changes require `isOrganizationAdmin` (`owner` or `admin`).
- **Cross-Organization Protection:** Attempting to read, update, delete, or convert an estimate belonging to another tenant returns `null` or a generic not-found/unauthorized error without leaking data existence. Verified in `estimate-database.test.ts`.

---

## 10. UI Screens and Responsive/Accessibility Considerations

- **Design System Fidelity:** Uses Aventra's dark theme palette, curated semantic tokens from `globals.css`, and shared UI primitives (`Button`, `Input`, `Label`, `Select`, `Card`, `Table`).
- **Form Architecture:**
  - Section 1: Customer & Quotation Reference (searchable customer dropdown, place of supply, quotation date, valid until date).
  - Section 2: Line Items (dynamic row addition/removal, catalog product auto-population, quantity/rate/discount/tax inputs, live item totals).
  - Section 3: Additional Charges & Additional Discounts.
  - Section 4: Customer Notes & Commercial Terms.
  - Section 5: Real-time Calculation Summary Card with clear subtotal, discount, CGST/SGST/IGST breakdown, and grand total.
- **Accessibility:** Semantic HTML tables, accessible keyboard focus rings, clear button labels, ARIA badges for status, and accessible dialog confirmations for state changes.

---

## 11. Exact Quality-Gate Commands and Results

| Quality Gate | Command | Result | Notes |
|---|---|---|---|
| TypeScript Typecheck | `npx tsc --noEmit` | **Passed (Exit 0)** | Zero type errors across the entire codebase |
| ESLint | `npm run lint` | **Passed (Exit 0)** | Zero errors, zero warnings |
| Prisma Schema Validation | `npx prisma validate` | **Passed (Exit 0)** | Schema at `prisma/schema.prisma` is valid |
| Prisma Client Generation | `npx prisma generate` | **Passed (Exit 0)** | Client regenerated to `src/generated/prisma` |
| Feature Unit & Lifecycle Tests | `npx vitest run src/features/estimates src/features/sales-settings` | **Passed (Exit 0)** | 5 test files, 40 tests passed |
| Full Vitest Test Suite | `AVENTRA_TEST_DATABASE_URL=... npm test` | **Passed (Exit 0)** | **126 test files passed, 853 tests passed, 0 failed** |
| Production Build | `npm run build` | **Passed (Exit 0)** | All pages compiled cleanly, including `/estimates`, `/estimates/new`, `/estimates/[id]`, `/estimates/[id]/edit`, and `/settings/sales` |

---

## 12. Test Counts, Skipped Tests, and Database Test Environment

- **Total Test Files Passed:** 126
- **Total Tests Passed:** 853 (853 passed, 0 failed)
- **Database Integration Suite:**
  - Environment: Isolated PostgreSQL database running locally at `localhost:5432/avetra-billing`.
  - File: `src/features/estimates/data/mutations/estimate-database.test.ts` (6 tests).
  - Verified:
    1. Persistence and reload of calculated totals and sequence numbering.
    2. Concurrency-safe unique sequence number allocation under parallel creations.
    3. Organization isolation at the database boundary (tenant A vs tenant B).
    4. Valid lifecycle transitions (Draft -> Sent -> Accepted).
    5. Atomic conversion of accepted quotation to real invoice with bidirectional relation.
    6. Custom prefix, padding, and sequence configuration via Sales Settings.

---

## 13. Files Changed and Created

### Created Files
- `prisma/migrations/20261014101650_add_estimates_and_sales_settings/migration.sql`
- `src/features/sales-settings/domain/entities/sales-settings.ts`
- `src/features/sales-settings/domain/errors/sales-settings-errors.ts`
- `src/features/sales-settings/domain/rules/sales-settings-rules.ts`
- `src/features/sales-settings/domain/rules/sales-settings-rules.test.ts`
- `src/features/sales-settings/domain/repositories/sales-settings-repository.ts`
- `src/features/sales-settings/infrastructure/mappers/prisma-sales-settings-mapper.ts`
- `src/features/sales-settings/infrastructure/repositories/prisma-sales-settings-repository.ts`
- `src/features/sales-settings/data/context/sales-settings-context.ts`
- `src/features/sales-settings/data/dto/sales-settings-dto.ts`
- `src/features/sales-settings/data/validators/sales-settings-schemas.ts`
- `src/features/sales-settings/data/queries/get-sales-settings.ts`
- `src/features/sales-settings/data/mutations/save-sales-settings.ts`
- `src/features/sales-settings/presentation/page/SalesSettingsPage.tsx`
- `src/features/sales-settings/index.ts`
- `src/app/(app)/settings/sales/page.tsx`
- `src/features/estimates/domain/entities/estimate.ts`
- `src/features/estimates/domain/errors/estimate-errors.ts`
- `src/features/estimates/domain/rules/estimate-rules.ts`
- `src/features/estimates/domain/rules/estimate-rules.test.ts`
- `src/features/estimates/domain/rules/estimate-lifecycle-rules.ts`
- `src/features/estimates/domain/rules/estimate-lifecycle.test.ts`
- `src/features/estimates/domain/repositories/estimate-repository.ts`
- `src/features/estimates/infrastructure/mappers/prisma-estimate-mapper.ts`
- `src/features/estimates/infrastructure/repositories/prisma-estimate-repository.ts`
- `src/features/estimates/data/context/estimate-context.ts`
- `src/features/estimates/data/dto/estimate-dto.ts`
- `src/features/estimates/data/validators/estimate-schemas.ts`
- `src/features/estimates/data/queries/get-estimates.ts`
- `src/features/estimates/data/queries/get-estimate-by-id.ts`
- `src/features/estimates/data/mutations/estimate-mutations.ts`
- `src/features/estimates/data/mutations/estimate-mutations.test.ts`
- `src/features/estimates/data/mutations/estimate-database.test.ts`
- `src/features/estimates/presentation/components/EstimateStatusBadge.tsx`
- `src/features/estimates/presentation/components/EstimateSummaryCards.tsx`
- `src/features/estimates/presentation/components/EstimateFilterBar.tsx`
- `src/features/estimates/presentation/components/EstimateTable.tsx`
- `src/features/estimates/presentation/components/EstimateCustomerSection.tsx`
- `src/features/estimates/presentation/components/EstimateItemsSection.tsx`
- `src/features/estimates/presentation/components/EstimateAdditionalInfoSection.tsx`
- `src/features/estimates/presentation/components/EstimateAdditionalChargesAndDiscountSection.tsx`
- `src/features/estimates/presentation/components/EstimateSummarySection.tsx`
- `src/features/estimates/presentation/components/EstimateDocument.tsx`
- `src/features/estimates/presentation/page/EstimateListPage.tsx`
- `src/features/estimates/presentation/page/EstimateCreatePage.tsx`
- `src/features/estimates/presentation/page/EstimateDetailPage.tsx`
- `src/features/estimates/index.ts`
- `src/app/(app)/estimates/page.tsx`
- `src/app/(app)/estimates/new/page.tsx`
- `src/app/(app)/estimates/[id]/page.tsx`
- `src/app/(app)/estimates/[id]/edit/page.tsx`
- `reports/sales-estimates-implementation-report.md`

### Modified Files
- `prisma/schema.prisma` (Added `EstimateStatus`, `Estimate`, `EstimateItem`, `SalesSettings`, and updated relations on `Organization`, `Customer`, `Product`, `Invoice`)
- `src/features/dashboard/presentation/components/dashboardNavigation.ts` (Promoted `sales-estimates` to available; registered `settings-sales`)
- `src/features/dashboard/presentation/components/dashboardNavigation.test.ts` (Updated navigation assertions)
- `src/features/dashboard/presentation/components/DashboardSidebar.test.ts` (Updated sidebar assertions)

---

## 14. Limitations and Non-Goals

1. **Email Delivery:** Estimates support "Mark as Sent" to update lifecycle state; direct SMTP/Resend transmission of PDF attachments is not wired to an external email queue.
2. **Server-Side PDF Rendering:** Document printing and PDF download are handled via high-fidelity browser print styles (`@media print` in `EstimateDocument.tsx`). Dedicated headless Chrome server-side rendering is out of scope.
3. **No Direct Accounting Ledger Posting:** Creating or accepting an estimate does not generate balance sheet journals or accounts receivable ledger entries. Invoicing receivables are established only upon conversion to a genuine `Invoice`.
4. **Production Deployment:** Changes have been verified through local isolated PostgreSQL integration suites and production build compiling; no production database or live deployment has been modified.

---

## 15. UI Parity Alignment with Create Invoice Page

Per user directive, the Estimate / Quotation Create page (`EstimateCreatePage.tsx`) was rebuilt to be 1:1 visually and architecturally identical to the reference `InvoiceCreatePage.tsx`:

1. **Full-Width Page Container:**
   - Removed all restrictive max-width constraints (such as `max-w-6xl mx-auto`).
   - Outer container uses standard full-width `<section className="space-y-6">` matching the Invoice module.

2. **Strict Shared Component Primitives (Zero Native Controls):**
   - Replaced all raw HTML `<input>`, `<select>`, `<textarea>`, and `<button>` controls with design-token-backed shared components:
     - `@/shared/components/form`: `Input`, `Select`, `DatePicker`, `Textarea`, `Button`, `Label`.
     - `@/shared/components/table`: `Table`, `TableHeader`, `TableHead`, `TableBody`, `TableRow`, `TableCell`.

3. **Customer & Parameters Section Parity (`EstimateCustomerSection.tsx`):**
   - Customer search select with search icon and quick `+ Add Customer` modal/link.
   - Comprehensive customer profile card displaying GSTIN, PAN, and Payment Terms badges, alongside 4 balanced informational columns (Billing Email, Contact Phone, Place of Supply, Billing Address).
   - 4-column parameter grid: Estimate Number, Quotation Date (DatePicker), Valid Until Date (DatePicker), and Reference Number.

4. **Line Items Grid Parity (`EstimateItemsSection.tsx`):**
   - Uses shared Table primitives with identical proportional column distribution: Item Details & Description, HSN/SAC, Quantity, Unit Price (`₹` icon), Discount (`%` badge), Tax Select, and calculated line total.
   - `+ Add Item` button using shared `Button` with `Plus` icon.

5. **Additional Charges & Discounts Section Parity (`EstimateAdditionalChargesAndDiscountSection.tsx`):**
   - Equal-height card matching the Summary Section, featuring sub-panels with `Truck` and `Tag` icons for shipping/handling and overall fixed/percentage discount.

6. **Summary & Tax Breakdown Parity (`EstimateSummarySection.tsx`):**
   - Subtotal, Discount, Taxable Amount, GST calculation mode toggle (CGST/SGST vs IGST), GST Slabs table breakdown, and grand Estimated Total card.

7. **Additional Info Section Parity (`EstimateAdditionalInfoSection.tsx`):**
   - Full-width card with two symmetrical columns for "Notes to Customer" and "Terms and Conditions" using shared `Textarea`.

8. **Header, Bottom Action Bar & Document Preview:**
   - Back navigation link with arrow icon, page title, status badge, top and bottom action buttons (Cancel, Save Draft, Preview Document, Create & Send / Update).
   - Full live document preview mode toggling into `EstimateDocument`.
