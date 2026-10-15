import type {
  SupplierPayment,
  SupplierPaymentMethod,
  SupplierPaymentStatus,
} from "../supplier-payment";

export type ListSupplierPaymentsFilters = {
  query?: string;
  status?: SupplierPaymentStatus | "ALL";
  supplierId?: string;
  method?: SupplierPaymentMethod | "ALL";
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
};

export type ListSupplierPaymentsResult = {
  payments: SupplierPayment[];
  metrics: {
    totalPayments: number;
    totalAmount: number;
    activeCount: number;
    activeAmount: number;
    reversedCount: number;
    billsCovered: number;
  };
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SaveSupplierPaymentAllocationInput = {
  id: string;
  purchaseBillId: string;
  amount: number;
};

export type SaveSupplierPaymentDomainInput = {
  id: string;
  organizationId: string;
  supplierId?: string;
  supplierName: string;
  amount: number;
  currency?: string;
  paymentDate: Date;
  method: SupplierPaymentMethod;
  reference?: string | null;
  notes?: string | null;
  idempotencyKey?: string;
  createdBy?: string;
  allocations: SaveSupplierPaymentAllocationInput[];
};

export interface ISupplierPaymentRepository {
  findById(
    organizationId: string,
    id: string,
  ): Promise<SupplierPayment | null>;
  findByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<SupplierPayment | null>;
  listWithFilters(
    organizationId: string,
    filters?: ListSupplierPaymentsFilters,
  ): Promise<ListSupplierPaymentsResult>;
  findByBillId(
    organizationId: string,
    purchaseBillId: string,
  ): Promise<SupplierPayment[]>;
  getActiveAllocatedTotalForBill(
    organizationId: string,
    purchaseBillId: string,
    excludePaymentId?: string,
    txClient?: unknown,
  ): Promise<number>;
  create(
    input: SaveSupplierPaymentDomainInput,
    txClient?: unknown,
  ): Promise<SupplierPayment>;
  reverse(
    organizationId: string,
    id: string,
    reversal: { reason?: string; reversedBy?: string; reversedAt: Date },
    txClient?: unknown,
  ): Promise<number>;
}
