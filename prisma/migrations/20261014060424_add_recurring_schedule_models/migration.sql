-- CreateEnum
CREATE TYPE "RecurringFrequency" AS ENUM ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "RecurringScheduleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RecurringOccurrenceStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED');

-- AlterTable
ALTER TABLE "invoice" ADD COLUMN     "recurringPeriod" TEXT,
ADD COLUMN     "recurringScheduleId" TEXT;

-- CreateTable
CREATE TABLE "recurring_schedule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerAddress" TEXT,
    "customerGstin" TEXT,
    "customerPlaceOfSupply" TEXT,
    "frequency" "RecurringFrequency" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" "RecurringScheduleStatus" NOT NULL DEFAULT 'ACTIVE',
    "paymentTerms" TEXT NOT NULL DEFAULT 'Net 15 days',
    "additionalCharges" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "additionalChargesLabel" TEXT,
    "additionalDiscount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "additionalDiscountType" TEXT NOT NULL DEFAULT 'fixed',
    "additionalDiscountLabel" TEXT,
    "notes" TEXT,
    "terms" TEXT,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "lastResult" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_schedule_item" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "productId" TEXT,
    "item" TEXT NOT NULL,
    "description" TEXT,
    "hsnSac" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitPrice" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 18,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_schedule_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_occurrence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" "RecurringOccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claimedAt" TIMESTAMP(3),
    "claimedBy" TEXT,
    "invoiceId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurring_occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurring_schedule_organizationId_idx" ON "recurring_schedule"("organizationId");

-- CreateIndex
CREATE INDEX "recurring_schedule_organizationId_status_idx" ON "recurring_schedule"("organizationId", "status");

-- CreateIndex
CREATE INDEX "recurring_schedule_organizationId_status_nextRunDate_idx" ON "recurring_schedule"("organizationId", "status", "nextRunDate");

-- CreateIndex
CREATE INDEX "recurring_schedule_customerId_idx" ON "recurring_schedule"("customerId");

-- CreateIndex
CREATE INDEX "recurring_schedule_item_scheduleId_idx" ON "recurring_schedule_item"("scheduleId");

-- CreateIndex
CREATE INDEX "recurring_schedule_item_productId_idx" ON "recurring_schedule_item"("productId");

-- CreateIndex
CREATE INDEX "recurring_occurrence_organizationId_idx" ON "recurring_occurrence"("organizationId");

-- CreateIndex
CREATE INDEX "recurring_occurrence_organizationId_status_idx" ON "recurring_occurrence"("organizationId", "status");

-- CreateIndex
CREATE INDEX "recurring_occurrence_scheduleId_idx" ON "recurring_occurrence"("scheduleId");

-- CreateIndex
CREATE INDEX "recurring_occurrence_invoiceId_idx" ON "recurring_occurrence"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "recurring_occurrence_scheduleId_periodKey_key" ON "recurring_occurrence"("scheduleId", "periodKey");

-- CreateIndex
CREATE INDEX "invoice_recurringScheduleId_recurringPeriod_idx" ON "invoice"("recurringScheduleId", "recurringPeriod");

-- AddForeignKey
ALTER TABLE "recurring_schedule" ADD CONSTRAINT "recurring_schedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_schedule" ADD CONSTRAINT "recurring_schedule_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_schedule_item" ADD CONSTRAINT "recurring_schedule_item_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "recurring_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_schedule_item" ADD CONSTRAINT "recurring_schedule_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_occurrence" ADD CONSTRAINT "recurring_occurrence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_occurrence" ADD CONSTRAINT "recurring_occurrence_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "recurring_schedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recurring_occurrence" ADD CONSTRAINT "recurring_occurrence_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
