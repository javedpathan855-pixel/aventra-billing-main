import type { Payment, PaymentMethod, PaymentStatus } from "../payment";

export type PaymentFilterCriteria = {
  query?: string;
  status?: PaymentStatus;
  customerId?: string;
  method?: PaymentMethod;
  startDate?: string;
  endDate?: string;
};

export type SavePaymentAllocationInput = {
  id: string;
  invoiceId: string;
  amount: number;
};

export type SavePaymentDomainInput = {
  id: string;
  organizationId: string;
  customerId?: string | null;
  customerName: string;
  amount: number;
  currency?: string;
  paymentDate: Date;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  createdBy?: string | null;
  allocations: SavePaymentAllocationInput[];
};

export type IPaymentRepository = {
  findById(organizationId: string, id: string): Promise<Payment | null>;
  findByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<Payment | null>;
  findMany(organizationId: string, criteria?: PaymentFilterCriteria): Promise<Payment[]>;
  findByInvoiceId(organizationId: string, invoiceId: string): Promise<Payment[]>;
  getActiveAllocatedTotalForInvoice(
    organizationId: string,
    invoiceId: string,
    excludePaymentId?: string,
    txClient?: unknown,
  ): Promise<number>;
  create(input: SavePaymentDomainInput, txClient?: unknown): Promise<Payment>;
  reverse(
    organizationId: string,
    id: string,
    reversal: { reason?: string | null; reversedBy?: string | null; reversedAt: Date },
    txClient?: unknown,
  ): Promise<number>;
};
