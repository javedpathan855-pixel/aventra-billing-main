export type PurchaseSettings = {
  id: string;
  organizationId: string;
  purchaseOrderPrefix: string;
  purchaseOrderSuffix: string | null;
  purchaseOrderNextNumber: number;
  purchaseOrderPadding: number;
  defaultDeliveryDays: number;
  defaultPaymentTerms: string | null;
  defaultPurchaseOrderNotes: string | null;
  defaultPurchaseOrderTerms: string | null;
  purchaseBillPrefix: string;
  purchaseBillSuffix: string | null;
  purchaseBillNextNumber: number;
  purchaseBillPadding: number;
  defaultDueDays: number;
  defaultPurchaseBillNotes: string | null;
  defaultPurchaseBillTerms: string | null;
  purchaseReturnPrefix: string;
  purchaseReturnSuffix: string | null;
  purchaseReturnNextNumber: number;
  purchaseReturnPadding: number;
  defaultPurchaseReturnReason: string | null;
  defaultPurchaseReturnNotes: string | null;
  defaultPurchaseReturnTerms: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PurchaseOrderNumberComponents = {
  prefix: string;
  nextNumber: number;
  padding: number;
  suffix?: string | null;
};

export type PurchaseBillNumberComponents = {
  prefix: string;
  nextNumber: number;
  padding: number;
  suffix?: string | null;
};

export type PurchaseReturnNumberComponents = {
  prefix: string;
  nextNumber: number;
  padding: number;
  suffix?: string | null;
};
