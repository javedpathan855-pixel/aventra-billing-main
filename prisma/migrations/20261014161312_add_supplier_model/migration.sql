-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "supplier" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "billingAddressLine1" TEXT,
    "billingAddressLine2" TEXT,
    "billingCity" TEXT,
    "billingState" TEXT,
    "billingPinCode" TEXT,
    "billingCountry" TEXT NOT NULL DEFAULT 'India',
    "sameAsBillingAddress" BOOLEAN NOT NULL DEFAULT true,
    "shippingAddressLine1" TEXT,
    "shippingAddressLine2" TEXT,
    "shippingCity" TEXT,
    "shippingState" TEXT,
    "shippingPinCode" TEXT,
    "shippingCountry" TEXT DEFAULT 'India',
    "gstTreatment" "GstTreatment" NOT NULL DEFAULT 'REGISTERED_BUSINESS_REGULAR',
    "gstin" TEXT,
    "pan" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR (₹)',
    "paymentTerms" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_organizationId_idx" ON "supplier"("organizationId");

-- CreateIndex
CREATE INDEX "supplier_organizationId_name_idx" ON "supplier"("organizationId", "name");

-- CreateIndex
CREATE INDEX "supplier_organizationId_status_idx" ON "supplier"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_organizationId_gstin_key" ON "supplier"("organizationId", "gstin");

-- AddForeignKey
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
