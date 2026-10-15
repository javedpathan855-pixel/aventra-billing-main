export type SalesSettings = {
  id: string;
  organizationId: string;
  estimatePrefix: string;
  estimateSuffix: string | null;
  estimateNextNumber: number;
  estimatePadding: number;
  salesOrderPrefix: string;
  salesOrderSuffix: string | null;
  salesOrderNextNumber: number;
  salesOrderPadding: number;
  deliveryChallanPrefix: string;
  deliveryChallanSuffix: string | null;
  deliveryChallanNextNumber: number;
  deliveryChallanPadding: number;
  salesReturnPrefix: string;
  salesReturnSuffix: string | null;
  salesReturnNextNumber: number;
  salesReturnPadding: number;
  defaultValidityDays: number;
  defaultDeliveryDays: number;
  defaultNotes: string | null;
  defaultTerms: string | null;
  defaultSalesOrderNotes: string | null;
  defaultSalesOrderTerms: string | null;
  defaultDeliveryInstructions: string | null;
  defaultDeliveryTerms: string | null;
  defaultReturnReason: string | null;
  defaultReturnPolicy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type EstimateNumberComponents = {
  prefix: string;
  nextNumber: number;
  padding: number;
  suffix?: string | null;
};

export type SalesOrderNumberComponents = {
  prefix: string;
  nextNumber: number;
  padding: number;
  suffix?: string | null;
};

export type DeliveryChallanNumberComponents = {
  prefix: string;
  nextNumber: number;
  padding: number;
  suffix?: string | null;
};

export type SalesReturnNumberComponents = {
  prefix: string;
  nextNumber: number;
  padding: number;
  suffix?: string | null;
};
