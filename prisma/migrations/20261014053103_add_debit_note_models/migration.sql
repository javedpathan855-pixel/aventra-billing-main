-- CreateEnum
CREATE TYPE "DebitNoteStatus" AS ENUM ('DRAFT', 'ISSUED', 'CANCELLED');

-- CreateTable
CREATE TABLE "debit_note" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "debitNoteNumber" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "customerGstin" TEXT,
    "customerPlaceOfSupply" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "status" "DebitNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "taxMode" TEXT NOT NULL DEFAULT 'CGST_SGST',
    "currency" TEXT NOT NULL DEFAULT 'INR (₹)',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "lineDiscountTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
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

    CONSTRAINT "debit_note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debit_note_item" (
    "id" TEXT NOT NULL,
    "debitNoteId" TEXT NOT NULL,
    "invoiceItemId" TEXT,
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

    CONSTRAINT "debit_note_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debit_note_organizationId_idx" ON "debit_note"("organizationId");

-- CreateIndex
CREATE INDEX "debit_note_organizationId_status_idx" ON "debit_note"("organizationId", "status");

-- CreateIndex
CREATE INDEX "debit_note_organizationId_issueDate_idx" ON "debit_note"("organizationId", "issueDate");

-- CreateIndex
CREATE INDEX "debit_note_invoiceId_idx" ON "debit_note"("invoiceId");

-- CreateIndex
CREATE INDEX "debit_note_customerId_idx" ON "debit_note"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "debit_note_organizationId_debitNoteNumber_key" ON "debit_note"("organizationId", "debitNoteNumber");

-- CreateIndex
CREATE INDEX "debit_note_item_debitNoteId_idx" ON "debit_note_item"("debitNoteId");

-- CreateIndex
CREATE INDEX "debit_note_item_productId_idx" ON "debit_note_item"("productId");

-- CreateIndex
CREATE INDEX "debit_note_item_invoiceItemId_idx" ON "debit_note_item"("invoiceItemId");

-- AddForeignKey
ALTER TABLE "debit_note" ADD CONSTRAINT "debit_note_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_note" ADD CONSTRAINT "debit_note_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_note" ADD CONSTRAINT "debit_note_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_note_item" ADD CONSTRAINT "debit_note_item_debitNoteId_fkey" FOREIGN KEY ("debitNoteId") REFERENCES "debit_note"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debit_note_item" ADD CONSTRAINT "debit_note_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
