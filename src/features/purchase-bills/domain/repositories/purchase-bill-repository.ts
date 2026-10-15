import type {
  PurchaseBill,
  PurchaseBillStatus,
} from "../entities/purchase-bill";

export type ListPurchaseBillsFilters = {
  status?: PurchaseBillStatus | "ALL";
  query?: string;
  from?: Date;
  to?: Date;
  supplierId?: string;
  purchaseOrderId?: string;
  page?: number;
  pageSize?: number;
};

export type ListPurchaseBillsResult = {
  bills: PurchaseBill[];
  metrics: {
    totalBills: number;
    totalAmount: number;
    confirmedCount: number;
    confirmedAmount: number;
    cancelledCount: number;
  };
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type CreatePurchaseBillInput = {
  billNumber: string;
  supplierId?: string | null;
  supplierName: string;
  supplierEmail?: string | null;
  supplierAddress?: string | null;
  supplierGstin?: string | null;
  supplierPlaceOfSupply?: string | null;
  supplierInvoiceNumber?: string | null;
  supplierInvoiceDate?: Date | null;
  purchaseOrderId?: string | null;
  purchaseOrderNumber?: string | null;
  billDate: Date;
  dueDate: Date;
  status: PurchaseBillStatus;
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
    unitPrice: number;
    discount?: number;
    taxRate?: number;
    sortOrder?: number;
  }>;
};

export type UpdatePurchaseBillInput = Partial<CreatePurchaseBillInput>;

export interface IPurchaseBillRepository {
  findById(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<PurchaseBill | null>;
  findByNumber(
    organizationId: string,
    billNumber: string,
    txClient?: unknown,
  ): Promise<PurchaseBill | null>;
  findBySupplierInvoice(
    organizationId: string,
    supplierId: string,
    supplierInvoiceNumber: string,
    txClient?: unknown,
  ): Promise<PurchaseBill | null>;
  listWithFilters(
    organizationId: string,
    filters?: ListPurchaseBillsFilters,
  ): Promise<ListPurchaseBillsResult>;
  create(
    organizationId: string,
    input: CreatePurchaseBillInput,
    txClient?: unknown,
  ): Promise<PurchaseBill>;
  update(
    organizationId: string,
    id: string,
    input: UpdatePurchaseBillInput,
    txClient?: unknown,
  ): Promise<PurchaseBill>;
  delete(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<void>;
  updateStatus(
    organizationId: string,
    id: string,
    status: PurchaseBillStatus,
    txClient?: unknown,
  ): Promise<PurchaseBill>;
}
