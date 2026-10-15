import { z } from "zod";

const supplierPaymentMethodValues = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Card",
  "Other",
] as const;

export const recordSupplierPaymentSchema = z.object({
  supplierId: z.string().trim().min(1, "A supplier is required."),
  amount: z.coerce
    .number()
    .finite("Payment amount must be a valid number.")
    .positive("Payment amount must be greater than zero."),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be in YYYY-MM-DD format."),
  method: z.enum(supplierPaymentMethodValues).default("Other"),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  idempotencyKey: z.string().trim().max(100).optional().nullable(),
  allocations: z
    .array(
      z.object({
        purchaseBillId: z.string().trim().min(1, "A purchase bill is required."),
        amount: z.coerce.number().finite().positive(),
      }),
    )
    .min(1, "Allocate the payment to at least one purchase bill."),
});

export const reverseSupplierPaymentSchema = z.object({
  id: z.string().trim().min(1, "A payment id is required."),
  reason: z.string().trim().max(500).optional().nullable(),
});
