import type { SupplierPaymentMethod } from "../../domain/supplier-payment";
import type { SupplierPayment } from "../../domain/supplier-payment";

export type RecordSupplierPaymentAllocationDto = {
  purchaseBillId: string;
  amount: number;
};

export type RecordSupplierPaymentInputDto = {
  supplierId: string;
  amount: number;
  paymentDate: string; // ISO date YYYY-MM-DD
  method?: SupplierPaymentMethod;
  reference?: string;
  notes?: string;
  idempotencyKey?: string;
  allocations: RecordSupplierPaymentAllocationDto[];
};

export type ReverseSupplierPaymentInputDto = {
  id: string;
  reason?: string;
};

export type SupplierPaymentActionResult<T = SupplierPayment> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
