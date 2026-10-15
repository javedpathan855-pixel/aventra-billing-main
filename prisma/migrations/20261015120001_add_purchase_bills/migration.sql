-- CreateEnum
CREATE TYPE "PurchaseBillStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "purchase_settings" ADD COLUMN     "defaultDueDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "defaultPurchaseBillNotes" TEXT,
ADD COLUMN     "defaultPurchaseBillTerms" TEXT,
ADD COLUMN     "purchaseBillNextNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "purchaseBillPadding" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "purchaseBillPrefix" TEXT NOT NULL DEFAULT 'PB-',
ADD COLUMN     "purchaseBillSuffix" TEXT;

-- CreateTable
CREATE TABLE "purchase_bill" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "supplierEmail" TEXT,
    "supplierAddress" TEXT,
    "supplierGstin" TEXT,
    "supplierPlaceOfSupply" TEXT,
    "supplierInvoiceNumber" TEXT,
    "supplierInvoiceDate" TIMESTAMP(3),
    "purchaseOrderId" TEXT,
    "purchaseOrderNumber" TEXT,
    "billDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "PurchaseBillStatus" NOT NULL DEFAULT 'DRAFT',
    "taxMode" TEXT NOT NULL DEFAULT 'CGST_SGST',
    "currency" TEXT NOT NULL DEFAULT 'INR (₹)',
    "paymentTerms" TEXT,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "lineDiscountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "additionalDiscount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "additionalDiscountType" TEXT NOT NULL DEFAULT 'fixed',
    "additionalDiscountLabel" TEXT,
    "additionalCharges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "additionalChargesLabel" TEXT,
    "taxableAmount" DECIMAL(14,2) NOT NULL,
    "cgst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sgst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "igst" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalTax" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_bill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_bill_item" (
    "id" TEXT NOT NULL,
    "purchaseBillId" TEXT NOT NULL,
    "productId" TEXT,
    "item" TEXT NOT NULL,
    "description" TEXT,
    "hsnSac" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "taxableAmount" DECIMAL(14,2) NOT NULL,
    "taxAmount" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_bill_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_bill_organizationId_idx" ON "purchase_bill"("organizationId");

-- CreateIndex
CREATE INDEX "purchase_bill_organizationId_status_idx" ON "purchase_bill"("organizationId", "status");

-- CreateIndex
CREATE INDEX "purchase_bill_organizationId_billDate_idx" ON "purchase_bill"("organizationId", "billDate");

-- CreateIndex
CREATE INDEX "purchase_bill_supplierId_idx" ON "purchase_bill"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_bill_purchaseOrderId_idx" ON "purchase_bill"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_bill_organizationId_billNumber_key" ON "purchase_bill"("organizationId", "billNumber");

-- CreateIndex
-- Duplicate supplier invoices for the same supplier within an organization
-- are rejected: partial index applies only when both references are present.
CREATE UNIQUE INDEX "purchase_bill_org_supplier_invoice_key" ON "purchase_bill"("organizationId", "supplierId", "supplierInvoiceNumber") WHERE "supplierInvoiceNumber" IS NOT NULL AND "supplierId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "purchase_bill_item_purchaseBillId_idx" ON "purchase_bill_item"("purchaseBillId");

-- CreateIndex
CREATE INDEX "purchase_bill_item_productId_idx" ON "purchase_bill_item"("productId");

-- AddForeignKey
ALTER TABLE "purchase_bill" ADD CONSTRAINT "purchase_bill_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_bill" ADD CONSTRAINT "purchase_bill_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_bill" ADD CONSTRAINT "purchase_bill_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_bill_item" ADD CONSTRAINT "purchase_bill_item_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "purchase_bill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_bill_item" ADD CONSTRAINT "purchase_bill_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
