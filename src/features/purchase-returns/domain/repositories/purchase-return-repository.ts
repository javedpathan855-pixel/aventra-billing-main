import type {
  PurchaseReturn,
  PurchaseReturnStatus,
  ReturnableBill,
  ReturnDisposition,
} from "../entities/purchase-return";

export type ListPurchaseReturnsFilters = {
  search?: string;
  status?: PurchaseReturnStatus | "ALL";
  supplierId?: string;
  purchaseBillId?: string;
  purchaseOrderId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export type ListPurchaseReturnsResult = {
  returns: PurchaseReturn[];
  metrics: {
    totalReturns: number;
    totalAmount: number;
    approvedCount: number;
    completedCount: number;
    cancelledCount: number;
  };
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreatePurchaseReturnItemInput = {
  productId?: string | null;
  purchaseBillItemId?: string | null;
  item: string;
  description?: string | null;
  hsnSac?: string | null;
  billedQuantity: number;
  returnQuantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  disposition?: ReturnDisposition;
  reason?: string | null;
  sortOrder?: number;
};

export type CreatePurchaseReturnInput = {
  returnNumber: string;
  supplierId?: string | null;
  supplierName: string;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  supplierGstin?: string | null;
  supplierPlaceOfSupply?: string | null;
  purchaseBillId?: string | null;
  purchaseBillNumber?: string | null;
  purchaseOrderId?: string | null;
  purchaseOrderNumber?: string | null;
  returnDate: Date;
  reason: string;
  taxMode?: "CGST_SGST" | "IGST";
  currency?: string;
  notes?: string | null;
  terms?: string | null;
  items: CreatePurchaseReturnItemInput[];
};

export type UpdatePurchaseReturnStatusInput = {
  status: PurchaseReturnStatus;
};

export interface IPurchaseReturnRepository {
  findById(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<PurchaseReturn | null>;
  findByNumber(
    organizationId: string,
    returnNumber: string,
    txClient?: unknown,
  ): Promise<PurchaseReturn | null>;
  listWithFilters(
    organizationId: string,
    filters?: ListPurchaseReturnsFilters,
  ): Promise<ListPurchaseReturnsResult>;
  create(
    organizationId: string,
    input: CreatePurchaseReturnInput,
    txClient?: unknown,
  ): Promise<PurchaseReturn>;
  updateStatus(
    organizationId: string,
    id: string,
    input: UpdatePurchaseReturnStatusInput,
    txClient?: unknown,
  ): Promise<PurchaseReturn>;
  delete(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<void>;
  getReturnableBills(
    organizationId: string,
    supplierId?: string,
    txClient?: unknown,
  ): Promise<ReturnableBill[]>;
  getReturnableBillById(
    organizationId: string,
    billId: string,
    txClient?: unknown,
  ): Promise<ReturnableBill | null>;
  sumReturnedForBillItem(
    organizationId: string,
    purchaseBillItemId: string,
    txClient?: unknown,
  ): Promise<number>;
}
