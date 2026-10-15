import type {
  SalesReturn,
  SalesReturnStatus,
  ReturnDisposition,
} from "../../domain/entities/sales-return";

export type SalesReturnItemInputDto = {
  productId?: string | null;
  invoiceItemId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  soldQuantity: number;
  returnQuantity: number;
  receivedQuantity?: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  disposition?: ReturnDisposition;
  reason?: string | null;
  sortOrder?: number;
};

export type CreateSalesReturnInputDto = {
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  customerPlaceOfSupply?: string | null;
  invoiceId?: string | null;
  salesOrderId?: string | null;
  returnDate: string; // ISO date
  reason: string;
  taxMode?: string;
  currency?: string;
  notes?: string | null;
  items: SalesReturnItemInputDto[];
};

export type UpdateSalesReturnStatusInputDto = {
  status: SalesReturnStatus;
  receivedQuantities?: Record<string, number>;
  dispositions?: Record<string, ReturnDisposition>;
  createCreditNote?: boolean;
};

export type SalesReturnActionResult<T = SalesReturn> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
