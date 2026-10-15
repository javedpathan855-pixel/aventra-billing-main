import type { SalesOrder, SalesOrderStatus } from "../entities/sales-order";

export type ListSalesOrdersFilters = {
  status?: SalesOrderStatus | "ALL";
  query?: string;
  from?: Date;
  to?: Date;
  customerId?: string;
};

export type ListSalesOrdersResult = {
  orders: SalesOrder[];
  metrics: {
    totalOrders: number;
    totalAmount: number;
    confirmedCount: number;
    confirmedAmount: number;
    fulfilledCount: number;
    invoicedCount: number;
  };
};

export type CreateSalesOrderInput = {
  orderNumber: string;
  customerId?: string | null;
  customerName: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  customerGstin?: string | null;
  customerPlaceOfSupply?: string | null;
  orderDate: Date;
  expectedDeliveryDate?: Date | null;
  referenceNumber?: string | null;
  status: SalesOrderStatus;
  taxMode: "CGST_SGST" | "IGST";
  currency?: string;
  notes?: string | null;
  terms?: string | null;
  additionalCharges?: number;
  additionalChargesLabel?: string | null;
  additionalDiscount?: number;
  additionalDiscountType?: "fixed" | "percentage";
  additionalDiscountLabel?: string | null;
  sourceEstimateId?: string | null;
  items: Array<{
    productId?: string | null;
    item: string;
    description?: string | null;
    hsnSac?: string | null;
    unit?: string | null;
    quantity: number;
    fulfilledQuantity?: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
    sortOrder?: number;
  }>;
};

export type UpdateSalesOrderInput = Partial<CreateSalesOrderInput>;

export interface ISalesOrderRepository {
  findById(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<SalesOrder | null>;
  findByNumber(
    organizationId: string,
    orderNumber: string,
    txClient?: unknown,
  ): Promise<SalesOrder | null>;
  listWithFilters(
    organizationId: string,
    filters?: ListSalesOrdersFilters,
  ): Promise<ListSalesOrdersResult>;
  create(
    organizationId: string,
    input: CreateSalesOrderInput,
    txClient?: unknown,
  ): Promise<SalesOrder>;
  update(
    organizationId: string,
    id: string,
    input: UpdateSalesOrderInput,
    txClient?: unknown,
  ): Promise<SalesOrder>;
  delete(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<void>;
  updateStatus(
    organizationId: string,
    id: string,
    status: SalesOrderStatus,
    txClient?: unknown,
  ): Promise<SalesOrder>;
  updateItemFulfilment(
    organizationId: string,
    salesOrderId: string,
    items: Array<{ id: string; fulfilledQuantity: number }>,
    txClient?: unknown,
  ): Promise<SalesOrder>;
}
