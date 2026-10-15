-- CreateEnum
CREATE TYPE "DeliveryChallanStatus" AS ENUM ('DRAFT', 'DISPATCHED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalesReturnStatus" AS ENUM ('DRAFT', 'APPROVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OpportunityStage" AS ENUM ('NEW_LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST');

-- AlterTable
ALTER TABLE "sales_settings" ADD COLUMN "deliveryChallanNextNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "deliveryChallanPadding" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "deliveryChallanPrefix" TEXT NOT NULL DEFAULT 'DC-',
ADD COLUMN "deliveryChallanSuffix" TEXT,
ADD COLUMN "defaultDeliveryInstructions" TEXT,
ADD COLUMN "defaultDeliveryTerms" TEXT,
ADD COLUMN "salesReturnNextNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "salesReturnPadding" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "salesReturnPrefix" TEXT NOT NULL DEFAULT 'SR-',
ADD COLUMN "salesReturnSuffix" TEXT,
ADD COLUMN "defaultReturnReason" TEXT,
ADD COLUMN "defaultReturnPolicy" TEXT;

-- CreateTable
CREATE TABLE "delivery_challan" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "challanNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "customerGstin" TEXT,
    "salesOrderId" TEXT,
    "invoiceId" TEXT,
    "challanDate" TIMESTAMP(3) NOT NULL,
    "dispatchDate" TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "status" "DeliveryChallanStatus" NOT NULL DEFAULT 'DRAFT',
    "deliveryAddress" TEXT,
    "transporterName" TEXT,
    "vehicleNumber" TEXT,
    "trackingNumber" TEXT,
    "transportMode" TEXT,
    "deliveryReason" TEXT NOT NULL DEFAULT 'Supply against Sales Order',
    "recipientName" TEXT,
    "recipientPhone" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_challan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_challan_item" (
    "id" TEXT NOT NULL,
    "challanId" TEXT NOT NULL,
    "salesOrderItemId" TEXT,
    "productId" TEXT,
    "item" TEXT NOT NULL,
    "description" TEXT,
    "hsnSac" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'PCS',
    "orderedQuantity" DECIMAL(12,3) NOT NULL,
    "deliveredQuantity" DECIMAL(12,3) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_challan_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_return" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "customerGstin" TEXT,
    "customerPlaceOfSupply" TEXT,
    "invoiceId" TEXT,
    "salesOrderId" TEXT,
    "creditNoteId" TEXT,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "SalesReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "taxMode" TEXT NOT NULL DEFAULT 'CGST_SGST',
    "currency" TEXT NOT NULL DEFAULT 'INR (₹)',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_return_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_return_item" (
    "id" TEXT NOT NULL,
    "salesReturnId" TEXT NOT NULL,
    "productId" TEXT,
    "invoiceItemId" TEXT,
    "item" TEXT NOT NULL,
    "description" TEXT,
    "hsnSac" TEXT,
    "soldQuantity" DECIMAL(12,3) NOT NULL,
    "returnQuantity" DECIMAL(12,3) NOT NULL,
    "receivedQuantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "taxAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "disposition" TEXT NOT NULL DEFAULT 'RESTOCK',
    "reason" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_return_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_opportunity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "contactPerson" TEXT,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'Website',
    "stage" "OpportunityStage" NOT NULL DEFAULT 'NEW_LEAD',
    "estimatedValue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR (₹)',
    "probability" INTEGER NOT NULL DEFAULT 10,
    "expectedCloseDate" TIMESTAMP(3),
    "assignedTo" TEXT,
    "nextFollowUpDate" TIMESTAMP(3),
    "nextAction" TEXT,
    "lossReason" TEXT,
    "estimateId" TEXT,
    "salesOrderId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_challan_organizationId_challanNumber_key" ON "delivery_challan"("organizationId", "challanNumber");
CREATE INDEX "delivery_challan_organizationId_idx" ON "delivery_challan"("organizationId");
CREATE INDEX "delivery_challan_organizationId_status_idx" ON "delivery_challan"("organizationId", "status");
CREATE INDEX "delivery_challan_organizationId_challanDate_idx" ON "delivery_challan"("organizationId", "challanDate");
CREATE INDEX "delivery_challan_customerId_idx" ON "delivery_challan"("customerId");
CREATE INDEX "delivery_challan_salesOrderId_idx" ON "delivery_challan"("salesOrderId");

-- CreateIndex
CREATE INDEX "delivery_challan_item_challanId_idx" ON "delivery_challan_item"("challanId");
CREATE INDEX "delivery_challan_item_productId_idx" ON "delivery_challan_item"("productId");
CREATE INDEX "delivery_challan_item_salesOrderItemId_idx" ON "delivery_challan_item"("salesOrderItemId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_return_organizationId_returnNumber_key" ON "sales_return"("organizationId", "returnNumber");
CREATE INDEX "sales_return_organizationId_idx" ON "sales_return"("organizationId");
CREATE INDEX "sales_return_organizationId_status_idx" ON "sales_return"("organizationId", "status");
CREATE INDEX "sales_return_organizationId_returnDate_idx" ON "sales_return"("organizationId", "returnDate");
CREATE INDEX "sales_return_customerId_idx" ON "sales_return"("customerId");
CREATE INDEX "sales_return_invoiceId_idx" ON "sales_return"("invoiceId");
CREATE INDEX "sales_return_salesOrderId_idx" ON "sales_return"("salesOrderId");

-- CreateIndex
CREATE INDEX "sales_return_item_salesReturnId_idx" ON "sales_return_item"("salesReturnId");
CREATE INDEX "sales_return_item_productId_idx" ON "sales_return_item"("productId");

-- CreateIndex
CREATE INDEX "sales_opportunity_organizationId_idx" ON "sales_opportunity"("organizationId");
CREATE INDEX "sales_opportunity_organizationId_stage_idx" ON "sales_opportunity"("organizationId", "stage");
CREATE INDEX "sales_opportunity_customerId_idx" ON "sales_opportunity"("customerId");
CREATE INDEX "sales_opportunity_nextFollowUpDate_idx" ON "sales_opportunity"("nextFollowUpDate");

-- AddForeignKey
ALTER TABLE "delivery_challan" ADD CONSTRAINT "delivery_challan_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_challan" ADD CONSTRAINT "delivery_challan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_challan" ADD CONSTRAINT "delivery_challan_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_challan" ADD CONSTRAINT "delivery_challan_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_challan_item" ADD CONSTRAINT "delivery_challan_item_challanId_fkey" FOREIGN KEY ("challanId") REFERENCES "delivery_challan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "delivery_challan_item" ADD CONSTRAINT "delivery_challan_item_salesOrderItemId_fkey" FOREIGN KEY ("salesOrderItemId") REFERENCES "sales_order_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "delivery_challan_item" ADD CONSTRAINT "delivery_challan_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return" ADD CONSTRAINT "sales_return_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_return" ADD CONSTRAINT "sales_return_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_return" ADD CONSTRAINT "sales_return_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_return" ADD CONSTRAINT "sales_return_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_return" ADD CONSTRAINT "sales_return_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_return_item" ADD CONSTRAINT "sales_return_item_salesReturnId_fkey" FOREIGN KEY ("salesReturnId") REFERENCES "sales_return"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_return_item" ADD CONSTRAINT "sales_return_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_return_item" ADD CONSTRAINT "sales_return_item_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "invoice_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_opportunity" ADD CONSTRAINT "sales_opportunity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sales_opportunity" ADD CONSTRAINT "sales_opportunity_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_opportunity" ADD CONSTRAINT "sales_opportunity_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales_opportunity" ADD CONSTRAINT "sales_opportunity_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
