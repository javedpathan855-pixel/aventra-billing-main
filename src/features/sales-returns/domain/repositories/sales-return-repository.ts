import type {
  SalesReturn,
  SalesReturnStatus,
  ReturnDisposition,
  ReturnableInvoice,
} from "../entities/sales-return";

export type SalesReturnFilter = {
  search?: string;
  status?: SalesReturnStatus;
  customerId?: string;
  invoiceId?: string;
  salesOrderId?: string;
  startDate?: Date;
  endDate?: Date;
};

export type CreateSalesReturnItemInput = {
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

export type CreateSalesReturnInput = {
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  customerPlaceOfSupply?: string | null;
  invoiceId?: string | null;
  salesOrderId?: string | null;
  returnDate: Date;
  reason: string;
  taxMode?: string;
  currency?: string;
  notes?: string | null;
  items: CreateSalesReturnItemInput[];
};

export type UpdateSalesReturnStatusInput = {
  status: SalesReturnStatus;
  receivedQuantities?: Record<string, number>; // itemId -> receivedQuantity
  dispositions?: Record<string, ReturnDisposition>; // itemId -> disposition
  createCreditNote?: boolean;
};

export interface ISalesReturnRepository {
  findMany(
    organizationId: string,
    filter?: SalesReturnFilter,
  ): Promise<SalesReturn[]>;
  findById(id: string, organizationId: string): Promise<SalesReturn | null>;
  create(
    organizationId: string,
    input: CreateSalesReturnInput,
  ): Promise<SalesReturn>;
  updateStatus(
    id: string,
    organizationId: string,
    input: UpdateSalesReturnStatusInput,
  ): Promise<SalesReturn>;
  delete(id: string, organizationId: string): Promise<boolean>;
  getReturnableInvoices(organizationId: string): Promise<ReturnableInvoice[]>;
  getReturnableInvoiceById(
    invoiceId: string,
    organizationId: string,
  ): Promise<ReturnableInvoice | null>;
}
