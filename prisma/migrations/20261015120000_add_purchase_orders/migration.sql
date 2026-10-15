-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateTable
CREATE TABLE "purchase_settings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "purchaseOrderPrefix" TEXT NOT NULL DEFAULT 'PO-',
    "purchaseOrderSuffix" TEXT,
    "purchaseOrderNextNumber" INTEGER NOT NULL DEFAULT 1,
    "purchaseOrderPadding" INTEGER NOT NULL DEFAULT 4,
    "defaultDeliveryDays" INTEGER NOT NULL DEFAULT 15,
    "defaultPaymentTerms" TEXT,
    "defaultPurchaseOrderNotes" TEXT,
    "defaultPurchaseOrderTerms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "supplierEmail" TEXT,
    "supplierAddress" TEXT,
    "supplierGstin" TEXT,
    "supplierPlaceOfSupply" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "referenceNumber" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
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

    CONSTRAINT "purchase_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_item" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "item" TEXT NOT NULL,
    "description" TEXT,
    "hsnSac" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "receivedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "taxableAmount" DECIMAL(14,2) NOT NULL,
    "taxAmount" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_settings_organizationId_key" ON "purchase_settings"("organizationId");

-- CreateIndex
CREATE INDEX "purchase_settings_organizationId_idx" ON "purchase_settings"("organizationId");

-- CreateIndex
CREATE INDEX "purchase_order_organizationId_idx" ON "purchase_order"("organizationId");

-- CreateIndex
CREATE INDEX "purchase_order_organizationId_status_idx" ON "purchase_order"("organizationId", "status");

-- CreateIndex
CREATE INDEX "purchase_order_organizationId_orderDate_idx" ON "purchase_order"("organizationId", "orderDate");

-- CreateIndex
CREATE INDEX "purchase_order_supplierId_idx" ON "purchase_order"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_organizationId_orderNumber_key" ON "purchase_order"("organizationId", "orderNumber");

-- CreateIndex
CREATE INDEX "purchase_order_item_purchaseOrderId_idx" ON "purchase_order_item"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_item_productId_idx" ON "purchase_order_item"("productId");

-- AddForeignKey
ALTER TABLE "purchase_settings" ADD CONSTRAINT "purchase_settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order" ADD CONSTRAINT "purchase_order_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_item" ADD CONSTRAINT "purchase_order_item_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_item" ADD CONSTRAINT "purchase_order_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
