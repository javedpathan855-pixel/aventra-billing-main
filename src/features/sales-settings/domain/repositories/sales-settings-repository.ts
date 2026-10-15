import type { SalesSettings } from "../entities/sales-settings";

export type SaveSalesSettingsInput = {
  estimatePrefix?: string;
  estimateSuffix?: string | null;
  estimateNextNumber?: number;
  estimatePadding?: number;
  salesOrderPrefix?: string;
  salesOrderSuffix?: string | null;
  salesOrderNextNumber?: number;
  salesOrderPadding?: number;
  deliveryChallanPrefix?: string;
  deliveryChallanSuffix?: string | null;
  deliveryChallanNextNumber?: number;
  deliveryChallanPadding?: number;
  salesReturnPrefix?: string;
  salesReturnSuffix?: string | null;
  salesReturnNextNumber?: number;
  salesReturnPadding?: number;
  defaultValidityDays?: number;
  defaultDeliveryDays?: number;
  defaultNotes?: string | null;
  defaultTerms?: string | null;
  defaultSalesOrderNotes?: string | null;
  defaultSalesOrderTerms?: string | null;
  defaultDeliveryInstructions?: string | null;
  defaultDeliveryTerms?: string | null;
  defaultReturnReason?: string | null;
  defaultReturnPolicy?: string | null;
};

export type AllocatedEstimateNumber = {
  allocatedNumber: string;
  sequenceNumber: number;
};

export type AllocatedSalesOrderNumber = {
  allocatedNumber: string;
  sequenceNumber: number;
};

export type AllocatedDeliveryChallanNumber = {
  allocatedNumber: string;
  sequenceNumber: number;
};

export type AllocatedSalesReturnNumber = {
  allocatedNumber: string;
  sequenceNumber: number;
};

export interface ISalesSettingsRepository {
  getSettings(organizationId: string, txClient?: unknown): Promise<SalesSettings>;
  saveSettings(
    organizationId: string,
    input: SaveSalesSettingsInput,
    txClient?: unknown,
  ): Promise<SalesSettings>;
  allocateNextNumber(
    organizationId: string,
    txClient?: unknown,
  ): Promise<AllocatedEstimateNumber>;
  allocateNextSalesOrderNumber(
    organizationId: string,
    txClient?: unknown,
  ): Promise<AllocatedSalesOrderNumber>;
  allocateNextDeliveryChallanNumber(
    organizationId: string,
    txClient?: unknown,
  ): Promise<AllocatedDeliveryChallanNumber>;
  allocateNextSalesReturnNumber(
    organizationId: string,
    txClient?: unknown,
  ): Promise<AllocatedSalesReturnNumber>;
}
