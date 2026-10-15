import type {
  PurchaseOrder,
  PurchaseOrderStatus,
} from "../entities/purchase-order";

export type ListPurchaseOrdersFilters = {
  status?: PurchaseOrderStatus | "ALL";
  query?: string;
  from?: Date;
  to?: Date;
  supplierId?: string;
  page?: number;
  pageSize?: number;
};

export type ListPurchaseOrdersResult = {
  orders: PurchaseOrder[];
  metrics: {
    totalOrders: number;
    totalAmount: number;
    confirmedCount: number;
    confirmedAmount: number;
    receivedCount: number;
  };
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreatePurchaseOrderInput = {
  orderNumber: string;
  supplierId?: string | null;
  supplierName: string;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  supplierGstin?: string | null;
  supplierPlaceOfSupply?: string | null;
  orderDate: Date;
  expectedDeliveryDate?: Date | null;
  referenceNumber?: string | null;
  status: PurchaseOrderStatus;
  taxMode: "CGST_SGST" | "IGST";
  currency?: string;
  paymentTerms?: string | null;
  notes?: string | null;
  terms?: string | null;
  additionalCharges?: number;
  additionalChargesLabel?: string | null;
  additionalDiscount?: number;
  additionalDiscountType?: "fixed" | "percentage";
  additionalDiscountLabel?: string | null;
  items: Array<{
    productId?: string | null;
    item: string;
    description?: string | null;
    hsnSac?: string | null;
    unit?: string | null;
    quantity: number;
    receivedQuantity?: number;
    unitPrice: number;
    discount?: number;
    taxRate?: number;
    sortOrder?: number;
  }>;
};

export type UpdatePurchaseOrderInput = Partial<CreatePurchaseOrderInput>;

export interface IPurchaseOrderRepository {
  findById(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<PurchaseOrder | null>;
  findByNumber(
    organizationId: string,
    orderNumber: string,
    txClient?: unknown,
  ): Promise<PurchaseOrder | null>;
  listWithFilters(
    organizationId: string,
    filters?: ListPurchaseOrdersFilters,
  ): Promise<ListPurchaseOrdersResult>;
  create(
    organizationId: string,
    input: CreatePurchaseOrderInput,
    txClient?: unknown,
  ): Promise<PurchaseOrder>;
  update(
    organizationId: string,
    id: string,
    input: UpdatePurchaseOrderInput,
    txClient?: unknown,
  ): Promise<PurchaseOrder>;
  delete(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<void>;
  updateStatus(
    organizationId: string,
    id: string,
    status: PurchaseOrderStatus,
    txClient?: unknown,
  ): Promise<PurchaseOrder>;
  updateItemReceiving(
    organizationId: string,
    purchaseOrderId: string,
    items: Array<{ id: string; receivedQuantity: number }>,
    txClient?: unknown,
  ): Promise<PurchaseOrder>;
}
