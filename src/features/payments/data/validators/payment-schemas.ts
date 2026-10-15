import { z } from "zod";

export const paymentAllocationSchema = z.object({
  invoiceId: z.string().min(1, "Select an invoice for this allocation."),
  amount: z.coerce
    .number()
    .finite("Allocation amount must be a valid number.")
    .positive("Allocation amount must be greater than zero."),
});

export const recordPaymentSchema = z.object({
  customerId: z.string().min(1, "Select the customer who paid."),
  amount: z.coerce
    .number()
    .finite("Amount received must be a valid number.")
    .positive("Amount received must be greater than zero."),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must be in YYYY-MM-DD format."),
  method: z
    .enum(["Cash", "Bank Transfer", "UPI", "Cheque", "Card", "Other"])
    .default("Other"),
  reference: z.string().trim().max(100, "Reference cannot exceed 100 characters.").optional(),
  notes: z.string().max(2000, "Notes cannot exceed 2000 characters.").optional(),
  idempotencyKey: z.string().trim().max(100).optional(),
  allocations: z.array(paymentAllocationSchema).min(1, "Allocate the payment to at least one invoice."),
});

export const reversePaymentSchema = z.object({
  id: z.string().min(1, "Payment ID is required."),
  reason: z.string().trim().max(500, "Reversal reason cannot exceed 500 characters.").optional(),
});
