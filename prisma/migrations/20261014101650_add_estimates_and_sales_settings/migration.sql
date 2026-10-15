-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "estimate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "estimateNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "customerGstin" TEXT,
    "customerPlaceOfSupply" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT,
    "status" "EstimateStatus" NOT NULL DEFAULT 'DRAFT',
    "taxMode" TEXT NOT NULL DEFAULT 'CGST_SGST',
    "currency" TEXT NOT NULL DEFAULT 'INR (₹)',
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
    "convertedToInvoiceId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimate_item" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
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

    CONSTRAINT "estimate_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "estimatePrefix" TEXT NOT NULL DEFAULT 'EST-',
    "estimateSuffix" TEXT,
    "estimateNextNumber" INTEGER NOT NULL DEFAULT 1,
    "estimatePadding" INTEGER NOT NULL DEFAULT 4,
    "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
    "defaultNotes" TEXT,
    "defaultTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "estimate_convertedToInvoiceId_key" ON "estimate"("convertedToInvoiceId");

-- CreateIndex
CREATE INDEX "estimate_organizationId_idx" ON "estimate"("organizationId");

-- CreateIndex
CREATE INDEX "estimate_organizationId_status_idx" ON "estimate"("organizationId", "status");

-- CreateIndex
CREATE INDEX "estimate_organizationId_issueDate_idx" ON "estimate"("organizationId", "issueDate");

-- CreateIndex
CREATE INDEX "estimate_customerId_idx" ON "estimate"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "estimate_organizationId_estimateNumber_key" ON "estimate"("organizationId", "estimateNumber");

-- CreateIndex
CREATE INDEX "estimate_item_estimateId_idx" ON "estimate_item"("estimateId");

-- CreateIndex
CREATE INDEX "estimate_item_productId_idx" ON "estimate_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_settings_organizationId_key" ON "sales_settings"("organizationId");

-- CreateIndex
CREATE INDEX "sales_settings_organizationId_idx" ON "sales_settings"("organizationId");

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_convertedToInvoiceId_fkey" FOREIGN KEY ("convertedToInvoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_item" ADD CONSTRAINT "estimate_item_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_item" ADD CONSTRAINT "estimate_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_settings" ADD CONSTRAINT "sales_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
