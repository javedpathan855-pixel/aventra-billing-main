-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "HsnSacType" AS ENUM ('HSN', 'SAC');

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_of_measurement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "precision" INTEGER NOT NULL DEFAULT 3,
    "status" "UnitStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "unit_of_measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hsn_sac_code" (
    "id" TEXT NOT NULL,
    "type" "HsnSacType" NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceFile" TEXT,
    "sourceSheet" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hsn_sac_code_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "category_organizationId_name_key" ON "category"("organizationId", "name");

-- CreateIndex
CREATE INDEX "category_organizationId_idx" ON "category"("organizationId");

-- CreateIndex
CREATE INDEX "category_organizationId_status_idx" ON "category"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "unit_of_measurement_organizationId_code_key" ON "unit_of_measurement"("organizationId", "code");

-- CreateIndex
CREATE INDEX "unit_of_measurement_organizationId_idx" ON "unit_of_measurement"("organizationId");

-- CreateIndex
CREATE INDEX "unit_of_measurement_organizationId_status_idx" ON "unit_of_measurement"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hsn_sac_code_type_code_key" ON "hsn_sac_code"("type", "code");

-- CreateIndex
CREATE INDEX "hsn_sac_code_type_idx" ON "hsn_sac_code"("type");

-- CreateIndex
CREATE INDEX "hsn_sac_code_code_idx" ON "hsn_sac_code"("code");

-- AlterTable
ALTER TABLE "invoice_item" ADD COLUMN "unit" TEXT;

-- AlterTable
ALTER TABLE "estimate_item" ADD COLUMN "unit" TEXT;

-- AlterTable
ALTER TABLE "sales_order_item" ADD COLUMN "unit" TEXT;

-- AlterTable
ALTER TABLE "purchase_order_item" ADD COLUMN "unit" TEXT;

-- AlterTable
ALTER TABLE "purchase_bill_item" ADD COLUMN "unit" TEXT;

-- AddForeignKey
ALTER TABLE "category" ADD CONSTRAINT "category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "unit_of_measurement" ADD CONSTRAINT "unit_of_measurement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
