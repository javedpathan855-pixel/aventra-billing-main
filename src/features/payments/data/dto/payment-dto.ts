import type { PaymentMethod } from "../../domain/payment";

export type PaymentActionResult<T = unknown> =
  | {
      success: true;
      data: T;
      error?: never;
      fieldErrors?: never;
    }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string>;
      data?: never;
    };

export type PaymentAllocationInputDto = {
  invoiceId: string;
  amount: number;
};

export type RecordPaymentInputDto = {
  customerId: string;
  amount: number;
  paymentDate: string;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
  idempotencyKey?: string;
  allocations: PaymentAllocationInputDto[];
};

export type ReversePaymentInputDto = {
  id: string;
  reason?: string;
};
