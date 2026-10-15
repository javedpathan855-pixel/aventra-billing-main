-- CreateEnum
CREATE TYPE "PurchaseReturnStatus" AS ENUM ('DRAFT', 'APPROVED', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "purchase_settings" ADD COLUMN     "defaultPurchaseReturnNotes" TEXT,
ADD COLUMN     "defaultPurchaseReturnReason" TEXT,
ADD COLUMN     "defaultPurchaseReturnTerms" TEXT,
ADD COLUMN     "purchaseReturnNextNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "purchaseReturnPadding" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "purchaseReturnPrefix" TEXT NOT NULL DEFAULT 'PR-',
ADD COLUMN     "purchaseReturnSuffix" TEXT;

-- CreateTable
CREATE TABLE "purchase_return" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "supplierEmail" TEXT,
    "supplierAddress" TEXT,
    "supplierGstin" TEXT,
    "supplierPlaceOfSupply" TEXT,
    "purchaseBillId" TEXT,
    "purchaseBillNumber" TEXT,
    "purchaseOrderId" TEXT,
    "purchaseOrderNumber" TEXT,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PurchaseReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "taxMode" TEXT NOT NULL DEFAULT 'CGST_SGST',
    "currency" TEXT NOT NULL DEFAULT 'INR (₹)',
    "subtotal" DECIMAL(14,2) NOT NULL,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_return_item" (
    "id" TEXT NOT NULL,
    "purchaseReturnId" TEXT NOT NULL,
    "productId" TEXT,
    "purchaseBillItemId" TEXT,
    "item" TEXT NOT NULL,
    "description" TEXT,
    "hsnSac" TEXT,
    "billedQuantity" DECIMAL(12,3) NOT NULL,
    "returnQuantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "disposition" TEXT NOT NULL DEFAULT 'RESTOCK',
    "reason" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_return_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR (₹)',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'OTHER',
    "reference" TEXT,
    "notes" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "reversedAt" TIMESTAMP(3),
    "reversalReason" TEXT,
    "reversedBy" TEXT,
    "idempotencyKey" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_payment_allocation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "purchaseBillId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_payment_allocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_return_organizationId_idx" ON "purchase_return"("organizationId");

-- CreateIndex
CREATE INDEX "purchase_return_organizationId_status_idx" ON "purchase_return"("organizationId", "status");

-- CreateIndex
CREATE INDEX "purchase_return_organizationId_returnDate_idx" ON "purchase_return"("organizationId", "returnDate");

-- CreateIndex
CREATE INDEX "purchase_return_supplierId_idx" ON "purchase_return"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_return_purchaseBillId_idx" ON "purchase_return"("purchaseBillId");

-- CreateIndex
CREATE INDEX "purchase_return_purchaseOrderId_idx" ON "purchase_return"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_return_organizationId_returnNumber_key" ON "purchase_return"("organizationId", "returnNumber");

-- CreateIndex
CREATE INDEX "purchase_return_item_purchaseReturnId_idx" ON "purchase_return_item"("purchaseReturnId");

-- CreateIndex
CREATE INDEX "purchase_return_item_productId_idx" ON "purchase_return_item"("productId");

-- CreateIndex
CREATE INDEX "purchase_return_item_purchaseBillItemId_idx" ON "purchase_return_item"("purchaseBillItemId");

-- CreateIndex
CREATE INDEX "supplier_payment_organizationId_idx" ON "supplier_payment"("organizationId");

-- CreateIndex
CREATE INDEX "supplier_payment_organizationId_status_idx" ON "supplier_payment"("organizationId", "status");

-- CreateIndex
CREATE INDEX "supplier_payment_organizationId_paymentDate_idx" ON "supplier_payment"("organizationId", "paymentDate");

-- CreateIndex
CREATE INDEX "supplier_payment_supplierId_idx" ON "supplier_payment"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payment_organizationId_idempotencyKey_key" ON "supplier_payment"("organizationId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "supplier_payment_allocation_organizationId_idx" ON "supplier_payment_allocation"("organizationId");

-- CreateIndex
CREATE INDEX "supplier_payment_allocation_paymentId_idx" ON "supplier_payment_allocation"("paymentId");

-- CreateIndex
CREATE INDEX "supplier_payment_allocation_purchaseBillId_idx" ON "supplier_payment_allocation"("purchaseBillId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_payment_allocation_paymentId_purchaseBillId_key" ON "supplier_payment_allocation"("paymentId", "purchaseBillId");

-- AddForeignKey
ALTER TABLE "purchase_return" ADD CONSTRAINT "purchase_return_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return" ADD CONSTRAINT "purchase_return_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return" ADD CONSTRAINT "purchase_return_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "purchase_bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return" ADD CONSTRAINT "purchase_return_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_item" ADD CONSTRAINT "purchase_return_item_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "purchase_return"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_item" ADD CONSTRAINT "purchase_return_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_return_item" ADD CONSTRAINT "purchase_return_item_purchaseBillItemId_fkey" FOREIGN KEY ("purchaseBillItemId") REFERENCES "purchase_bill_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment" ADD CONSTRAINT "supplier_payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment" ADD CONSTRAINT "supplier_payment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocation" ADD CONSTRAINT "supplier_payment_allocation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocation" ADD CONSTRAINT "supplier_payment_allocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "supplier_payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payment_allocation" ADD CONSTRAINT "supplier_payment_allocation_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "purchase_bill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
