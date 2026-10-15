import type {
  SalesOrder,
  SalesOrderStatus,
} from "../../domain/entities/sales-order";

export type SalesOrderItemInputDto = {
  productId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
};

export type CreateSalesOrderDto = {
  orderNumber?: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  customerPlaceOfSupply?: string | null;
  orderDate: string; // ISO date YYYY-MM-DD
  expectedDeliveryDate?: string | null;
  referenceNumber?: string | null;
  taxMode?: "CGST_SGST" | "IGST";
  currency?: string;
  status?: SalesOrderStatus;
  notes?: string | null;
  terms?: string | null;
  additionalCharges?: number;
  additionalChargesLabel?: string | null;
  additionalDiscount?: number;
  additionalDiscountType?: "fixed" | "percentage";
  additionalDiscountLabel?: string | null;
  sourceEstimateId?: string | null;
  items: SalesOrderItemInputDto[];
};

export type UpdateSalesOrderDto = Partial<CreateSalesOrderDto>;

export type RecordFulfilmentItemDto = {
  id: string; // Line item ID
  fulfilledQuantity: number;
};

export type RecordFulfilmentDto = {
  items: RecordFulfilmentItemDto[];
};

export type ConvertSalesOrderToInvoiceResult = {
  salesOrder: SalesOrder;
  invoiceId: string;
  invoiceNumber: string;
};

export type SalesOrderActionResult<T = SalesOrder> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
