import type { PurchaseSettings } from "../entities/purchase-settings";

export type SavePurchaseSettingsInput = {
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

export type AllocatedPurchaseOrderNumber = {
  allocatedNumber: string;
  sequenceNumber: number;
};

export type AllocatedPurchaseBillNumber = {
  allocatedNumber: string;
  sequenceNumber: number;
};

export type AllocatedPurchaseReturnNumber = {
  allocatedNumber: string;
  sequenceNumber: number;
};

export interface IPurchaseSettingsRepository {
  getSettings(
    organizationId: string,
    txClient?: unknown,
  ): Promise<PurchaseSettings>;
  saveSettings(
    organizationId: string,
    input: SavePurchaseSettingsInput,
    txClient?: unknown,
  ): Promise<PurchaseSettings>;
  allocateNextPurchaseOrderNumber(
    organizationId: string,
    txClient?: unknown,
  ): Promise<AllocatedPurchaseOrderNumber>;
  allocateNextPurchaseBillNumber(
    organizationId: string,
    txClient?: unknown,
  ): Promise<AllocatedPurchaseBillNumber>;
  allocateNextPurchaseReturnNumber(
    organizationId: string,
    txClient?: unknown,
  ): Promise<AllocatedPurchaseReturnNumber>;
}
