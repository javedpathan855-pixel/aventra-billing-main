import type { SalesSettings } from "../../domain/entities/sales-settings";

export type SaveSalesSettingsInputDto = {
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

export type SalesSettingsActionResult<T = SalesSettings> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
