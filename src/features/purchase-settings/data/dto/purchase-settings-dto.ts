import type { PurchaseSettings } from "../../domain/entities/purchase-settings";

export type SavePurchaseSettingsInputDto = {
  purchaseOrderPrefix?: string;
  purchaseOrderSuffix?: string | null;
  purchaseOrderNextNumber?: number;
  purchaseOrderPadding?: number;
  defaultDeliveryDays?: number;
  defaultPaymentTerms?: string | null;
  defaultPurchaseOrderNotes?: string | null;
  defaultPurchaseOrderTerms?: string | null;
  purchaseBillPrefix?: string;
  purchaseBillSuffix?: string | null;
  purchaseBillNextNumber?: number;
  purchaseBillPadding?: number;
  defaultDueDays?: number;
  defaultPurchaseBillNotes?: string | null;
  defaultPurchaseBillTerms?: string | null;
  purchaseReturnPrefix?: string;
  purchaseReturnSuffix?: string | null;
  purchaseReturnNextNumber?: number;
  purchaseReturnPadding?: number;
  defaultPurchaseReturnReason?: string | null;
  defaultPurchaseReturnNotes?: string | null;
  defaultPurchaseReturnTerms?: string | null;
};

export type PurchaseSettingsActionResult<T = PurchaseSettings> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
