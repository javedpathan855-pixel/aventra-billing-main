-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CANCELLED');

-- AlterTable
ALTER TABLE "estimate" ADD COLUMN     "convertedToSalesOrderId" TEXT;

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "salesOrderId" TEXT;

-- AlterTable
ALTER TABLE "sales_settings" ADD COLUMN     "defaultDeliveryDays" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "defaultSalesOrderNotes" TEXT,
ADD COLUMN     "defaultSalesOrderTerms" TEXT,
ADD COLUMN     "salesOrderNextNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "salesOrderPadding" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "salesOrderPrefix" TEXT NOT NULL DEFAULT 'SO-',
ADD COLUMN     "salesOrderSuffix" TEXT;

-- CreateTable
CREATE TABLE "sales_order" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "customerGstin" TEXT,
    "customerPlaceOfSupply" TEXT,
    "orderDate" TIMESTAMP(3) NOT NULL,
    "expectedDeliveryDate" TIMESTAMP(3),
    "referenceNumber" TEXT,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_item" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "item" TEXT NOT NULL,
    "description" TEXT,
    "hsnSac" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "fulfilledQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "taxableAmount" DECIMAL(14,2) NOT NULL,
    "taxAmount" DECIMAL(14,2) NOT NULL,
    "lineTotal" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_order_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_order_organizationId_idx" ON "sales_order"("organizationId");

-- CreateIndex
CREATE INDEX "sales_order_organizationId_status_idx" ON "sales_order"("organizationId", "status");

-- CreateIndex
CREATE INDEX "sales_order_organizationId_orderDate_idx" ON "sales_order"("organizationId", "orderDate");

-- CreateIndex
CREATE INDEX "sales_order_customerId_idx" ON "sales_order"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_organizationId_orderNumber_key" ON "sales_order"("organizationId", "orderNumber");

-- CreateIndex
CREATE INDEX "sales_order_item_salesOrderId_idx" ON "sales_order_item"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_order_item_productId_idx" ON "sales_order_item"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "estimate_convertedToSalesOrderId_key" ON "estimate"("convertedToSalesOrderId");

-- CreateIndex
CREATE INDEX "invoice_salesOrderId_idx" ON "invoice"("salesOrderId");

-- AddForeignKey
ALTER TABLE "invoice" ADD CONSTRAINT "invoice_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate" ADD CONSTRAINT "estimate_convertedToSalesOrderId_fkey" FOREIGN KEY ("convertedToSalesOrderId") REFERENCES "sales_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order" ADD CONSTRAINT "sales_order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_item" ADD CONSTRAINT "sales_order_item_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_item" ADD CONSTRAINT "sales_order_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
