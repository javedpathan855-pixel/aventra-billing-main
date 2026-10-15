# Product & Services Master Features Implementation Report

**Date:** 2026-10-15  
**Features:** Categories, Units of Measurement (UOM), Pricing, HSN/SAC Mapping  
**Repository:** `https://github.com/nextgenservicesnagpur/aventra-billing`  
**Status:** **PASS** (100% complete, fully verified end-to-end)

---

## 1. Executive Summary & Continuation Context

This task resumed and completed the foundational master data and catalogue integration across four critical domains:
1. **Categories:** Organization-scoped hierarchical/master categorization with usage counts, active status, delete safeguards, and product/service assignment.
2. **Units of Measurement (UOM):** Organization-scoped unit master with code, name, precision (0–4 decimal scale), standard unit seeding, delete protection, and downstream transaction line-item persistence.
3. **Pricing:** Centralized sales and purchase price management anchored on `Product.sellingPrice` and `Product.purchasePrice`, with separate selling vs. purchase price defaults across sales and purchase workflows.
4. **HSN/SAC Mapping:** Global reference data imported idempotently from the official reference workbook, with strict type enforcement (HSN for Products, SAC for Services) and decoupling from GST rates.

### Reference Files Inspected
- **Session Export:** `temp/categories-uom-pricing-hsn-sac-mapping.json` (Recovered initial architecture decisions, schema designs, and exact stopping point where the previous agent paused during downstream transaction line-item persistence).
- **Classification Source Workbook:** `temp/HSN_SAC.xlsx` (Parsed and validated sheets `HSN_MSTR` and `SAC_MSTR` via `scripts/import-hsn-sac.ts`).

---

## 2. Feature-by-Feature Status & Audit Checklist

| Feature | Audit Status | Final Status | Summary |
| :--- | :---: | :---: | :--- |
| **Categories** | `PARTIAL` | **`PASS`** | Complete domain, persistence, CRUD, seeding, search/filter, delete safeguard if used, and product/service integration. |
| **Units of Measurement (UOM)** | `PARTIAL` | **`PASS`** | Canonical org-scoped master, precision enforcement, standard unit seeding, delete safeguard, and downstream transaction line-item persistence. |
| **Pricing** | `PASS` | **`PASS`** | Centralized pricing overview, separate selling vs. purchase defaults in sales & purchase forms, immutable historical transaction preservation. |
| **HSN/SAC Mapping** | `PASS` | **`PASS`** | Global reference catalog, verified workbook parser & importer script, product (HSN) vs service (SAC) classification validation, tax rate separation. |

---

## 3. Canonical Sources of Truth & Architectural Boundaries

In accordance with `AGENTS.md` and Clean Architecture principles:

1. **Categories:**
   - **Canonical Source:** `Category` table (`organizationId`, `name`, `description`, `status`).
   - **Scope:** Organization-scoped master data.
   - **Integrity:** `(organizationId, name)` unique constraint. Rejection of inactive or foreign-organization categories on product creation/update. Delete blocked when referenced by catalogue products/services.

2. **Units of Measurement:**
   - **Canonical Source:** `UnitOfMeasurement` table (`organizationId`, `name`, `code`, `precision`, `status`).
   - **Scope:** Organization-scoped master data.
   - **Integrity:** `(organizationId, code)` unique constraint. Precision scale 0–4 enforced at domain level.
   - **Transaction Snapshots:** Downstream transaction item tables (`EstimateItem`, `SalesOrderItem`, `InvoiceItem`, `PurchaseOrderItem`, `PurchaseBillItem`) persist a snapshot `unit` string column, ensuring historical transaction lines remain immutable even if master UOM records change or are archived.

3. **Pricing:**
   - **Canonical Source:** `Product.sellingPrice` and `Product.purchasePrice` (Prisma `Decimal(12, 2)`).
   - **Semantics:**
     - Sales documents (Estimates, Sales Orders, Invoices) default item prices from `item.sellingPrice`.
     - Purchase documents (Purchase Orders, Purchase Bills) default item prices from `item.purchasePrice ?? item.sellingPrice ?? 0`.
     - Transaction line prices are persisted snapshots (`unitPrice`) and are never retroactively recalculated when master prices are updated.

4. **HSN/SAC Mapping:**
   - **Canonical Source:** `HsnSacCode` table (`code`, `type`, `description`, `isActive`).
   - **Scope:** Global reference data (shared across all organizations).
   - **Separation from GST:** Classification codes do NOT determine GST rates. GST rates and treatments continue to be governed strictly by the organization's tax configuration and tax rules engine (`tax-rules.ts`).
   - **Catalogue Enforcement:** `validateCatalogueReferences` enforces that `type === "PRODUCT"` may only reference HSN codes, and `type === "SERVICE"` may only reference SAC codes.

---

## 4. Reference Workbook Validation & Import Metrics

The workbook `temp/HSN_SAC.xlsx` was inspected and validated via `scripts/import-hsn-sac.ts`:

- **Sheet `HSN_MSTR`:**
  - Expected headers: `HSN_CD`, `HSN_Description`
  - Total source rows: **21,935**
  - Accepted records: **21,932**
  - Rejected records: **1** (Row 10,762 has blank description: code `481730`, logged and skipped)
  - Duplicate codes resolved: **2** (`230700` and `251400`, upserted idempotently)
  - Leading zeros normalized: **2** (`010110` and `010120`)
- **Sheet `SAC_MSTR`:**
  - Expected headers: `SAC_CD`, `SAC_Description`
  - Total source rows: **681**
  - Accepted records: **681**
  - Rejected records: **0**
- **Import Characteristics:**
  - Streaming batched upsert (`db.hsnSacCode.upsert`) in chunks of 500 records.
  - Safe, idempotent, non-destructive to existing master data.
  - Supports `--dry-run` and explicit file paths.

---

## 5. Downstream Transaction Line-Item Wiring

The snapshot `unit` field was integrated across the entire lifecycle (DTO, domain entity, validation schema, repository persistence, mapper, document view, and UI form table):

1. **Estimates:**
   - Domain: `EstimateLineItem.unit`
   - DTO & Schema: `EstimateLineItemInputDto.unit`, `estimateLineItemSchema`
   - Repository & Mapper: `PrismaEstimateRepository` (create/update persistence), `PrismaEstimateMapper`
   - Mutations: `createEstimate`, `updateEstimate`, and `convertToInvoice` (preserves line unit to invoice)
   - UI: `EstimateItemsSection.tsx` (product selection populates line unit, QTY column displays badge tag), `EstimateDocument.tsx` (renders unit)
2. **Sales Orders:**
   - Domain: `SalesOrderItem.unit`
   - DTO & Schema: `SalesOrderItemInputDto.unit`, `salesOrderItemSchema`
   - Repository & Mapper: `PrismaSalesOrderRepository`, `PrismaSalesOrderMapper`
   - UI: `SalesOrderItemsSection.tsx` (item select auto-populates unit, QTY displays badge tag)
3. **Invoices:**
   - Domain: `InvoiceLineItem.unit`
   - DTO & Schema: `InvoiceLineItemDto.unit`, `invoiceLineItemSchema`
   - Repository & Mapper: `PrismaInvoiceRepository`, `PrismaInvoiceMapper`
   - UI: `InvoiceItemsSection.tsx` (item select auto-populates unit, QTY displays badge tag), `InvoiceDocument.tsx` (renders unit)
4. **Purchase Orders:**
   - Domain: `PurchaseOrderItem.unit`
   - DTO & Schema: `PurchaseOrderItemInputDto.unit`, `purchaseOrderItemSchema`
   - Repository & Mapper: `PrismaPurchaseOrderRepository`, `PrismaPurchaseOrderMapper`
   - UI: `PurchaseOrderItemsSection.tsx` (item select auto-populates unit, defaults purchase price)
5. **Purchase Bills:**
   - Domain: `PurchaseBillItem.unit`
   - DTO & Schema: `PurchaseBillItemInputDto.unit`, `purchaseBillItemSchema`
   - Repository & Mapper: `PrismaPurchaseBillRepository`, `PrismaPurchaseBillMapper`
   - UI: `PurchaseBillItemsSection.tsx` (item select auto-populates unit, defaults purchase price)

---

## 6. Code Quality, Rules, and Design System Audit

- **Rule 09 (Arrow Functions):** All project-defined functions, including Next.js App Router route components (`src/app/(app)/categories/*`, `src/app/(app)/units/*`, `src/app/(app)/pricing/*`, `src/app/(app)/hsn-sac/*`, `src/app/(app)/products/*`, `src/app/(app)/services/*`), were authored using arrow-function syntax:
  ```tsx
  const PageName = async ({ searchParams }: ...) => { ... };
  export default PageName;
  ```
- **Rule 10 & 11 (Colors & UI Components):**
  - All colors use semantic CSS tokens (`text-primary`, `bg-surface-card`, `border-border`, `text-text-primary`, `text-danger`).
  - No native `<select>` or unstyled HTML form widgets: all screens use `@/shared/components/form` (`Input`, `Label`, `Select`, `Textarea`, `Button`) and `@/shared/components/table` (`Table`, `Pagination`).
  - Lucide React icons used throughout (`Tags`, `Boxes`, `CircleDollarSign`, `Package`, `Handshake`).
- **Organization Security & Server Authorization:**
  - Client-supplied organization IDs are never accepted.
  - Server actions resolve the authenticated session via `resolveCategoryContext()`, `resolveUnitContext()`, etc.
  - Cross-tenant queries are prevented via explicit `where: { organizationId }` clauses on all multi-tenant models.
- **No `any` or `@ts-ignore`:** All files are strictly typed with zero compiler suppressions.

---

## 7. Verification Commands & Actual Results

| Command | Target / Scope | Result | Details |
| :--- | :--- | :---: | :--- |
| `npx prisma validate` | Database schema consistency | **PASS** | `The schema at prisma/schema.prisma is valid` |
| `npx tsc --noEmit` | Full codebase TypeScript type check | **PASS** | 0 errors |
| `npm run lint` | ESLint across all files | **PASS** | 0 warnings, 0 errors |
| `npx vitest run src/features/{categories,units-of-measurement,pricing,hsn-sac-mapping,products}` | Master feature test suites | **PASS** | 24 test files passed, 100 tests passed |
| `npx vitest run src/features/{estimates,invoices,sales-orders,purchase-orders,purchase-bills}` | Downstream transaction test suites | **PASS** | 40 test files passed, 350 tests passed |
| `npm test` | Complete project Vitest suite | **PASS** | 184 test files passed, 1,186 tests passed |
| `npm run import:hsn-sac -- --file temp/HSN_SAC.xlsx --dry-run` | Importer test on real workbook | **PASS** | 21,932 HSN & 681 SAC records validated |
| `npm run build` | Next.js Turbopack production build | **PASS** | Compiled in 12.8s, all routes generated |

---

## 8. Summary of Files Created & Modified

### New Feature Architecture:
- `src/features/categories/` (domain, data, presentation, infrastructure)
- `src/features/units-of-measurement/` (domain, data, presentation, infrastructure)
- `src/features/pricing/` (domain, data, presentation, infrastructure)
- `src/features/hsn-sac-mapping/` (domain, data, presentation, infrastructure)
- `src/app/(app)/categories/` (`page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`, `new/page.tsx`)
- `src/app/(app)/units/` (`page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`, `new/page.tsx`)
- `src/app/(app)/pricing/` (`page.tsx`)
- `src/app/(app)/hsn-sac/` (`page.tsx`)
- `scripts/import-hsn-sac.ts` (repeatable, idempotent import script)
- `prisma/migrations/20261015140000_product_service_masters/`

### Integrated Existing Features:
- `src/features/products/`: Category & UOM dropdowns, HSN/SAC picker, selling & purchase price inputs, and `catalogue-reference-validation.ts`.
- `src/features/estimates/`: Added `unit` to schema, repository, mapper, item forms, document, and convert-to-invoice action.
- `src/features/sales-orders/`: Added `unit` to schema, repository, mapper, and item form.
- `src/features/invoices/`: Added `unit` to schema, repository, mapper, item form, and document.
- `src/features/purchase-orders/`: Added `unit` to schema, repository, mapper, and item form.
- `src/features/purchase-bills/`: Added `unit` to schema, repository, mapper, and item form.
- `src/features/dashboard/presentation/components/dashboardNavigation.ts`: Activated navigation items for `/categories`, `/units`, `/pricing`, `/hsn-sac`.

---

## 9. Conclusion
All four features—Categories, Units of Measurement, Pricing, and HSN/SAC Mapping—are fully implemented, strictly aligned with Clean Architecture, fully integrated with Catalogue items and downstream sales/purchase documents, and 100% verified through the test suite, linter, and production build.
