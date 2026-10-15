import type { PurchaseSettings as PrismaPurchaseSettings } from "@/generated/prisma/client";
import type { PurchaseSettings } from "../../domain/entities/purchase-settings";

export const toDomainPurchaseSettings = (
  raw: PrismaPurchaseSettings,
): PurchaseSettings => ({
  id: raw.id,
  organizationId: raw.organizationId,
  purchaseOrderPrefix: raw.purchaseOrderPrefix,
  purchaseOrderSuffix: raw.purchaseOrderSuffix,
  purchaseOrderNextNumber: raw.purchaseOrderNextNumber,
  purchaseOrderPadding: raw.purchaseOrderPadding,
  defaultDeliveryDays: raw.defaultDeliveryDays,
  defaultPaymentTerms: raw.defaultPaymentTerms,
  defaultPurchaseOrderNotes: raw.defaultPurchaseOrderNotes,
  defaultPurchaseOrderTerms: raw.defaultPurchaseOrderTerms,
  purchaseBillPrefix: raw.purchaseBillPrefix,
  purchaseBillSuffix: raw.purchaseBillSuffix,
  purchaseBillNextNumber: raw.purchaseBillNextNumber,
  purchaseBillPadding: raw.purchaseBillPadding,
  defaultDueDays: raw.defaultDueDays,
  defaultPurchaseBillNotes: raw.defaultPurchaseBillNotes,
  defaultPurchaseBillTerms: raw.defaultPurchaseBillTerms,
  purchaseReturnPrefix: raw.purchaseReturnPrefix,
  purchaseReturnSuffix: raw.purchaseReturnSuffix,
  purchaseReturnNextNumber: raw.purchaseReturnNextNumber,
  purchaseReturnPadding: raw.purchaseReturnPadding,
  defaultPurchaseReturnReason: raw.defaultPurchaseReturnReason,
  defaultPurchaseReturnNotes: raw.defaultPurchaseReturnNotes,
  defaultPurchaseReturnTerms: raw.defaultPurchaseReturnTerms,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});
