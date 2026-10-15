import { z } from "zod";

export const deliveryChallanItemSchema = z.object({
  salesOrderItemId: z.string().optional().nullable(),
  productId: z.string().optional().nullable(),
  item: z.string().trim().min(1, "Item name is required.").max(255),
  description: z.string().trim().max(1000).optional().nullable(),
  hsnSac: z.string().trim().max(50).optional().nullable(),
  unit: z.string().trim().min(1).default("PCS"),
  orderedQuantity: z.coerce
    .number()
    .min(0, "Ordered quantity must be greater than or equal to 0."),
  deliveredQuantity: z.coerce
    .number()
    .gt(0, "Delivered quantity must be greater than 0."),
  sortOrder: z.coerce.number().int().optional().default(0),
});

export const createDeliveryChallanSchema = z.object({
  customerId: z.string().optional().nullable(),
  customerName: z.string().trim().min(1, "Customer name is required.").max(255),
  customerEmail: z.string().trim().email("Invalid email address.").optional().nullable().or(z.literal("")),
  customerAddress: z.string().trim().max(1000).optional().nullable(),
  customerGstin: z.string().trim().max(50).optional().nullable(),
  salesOrderId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  challanDate: z.string().min(1, "Challan date is required."),
  dispatchDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  deliveryAddress: z.string().trim().max(1000).optional().nullable(),
  transporterName: z.string().trim().max(255).optional().nullable(),
  vehicleNumber: z.string().trim().max(50).optional().nullable(),
  trackingNumber: z.string().trim().max(100).optional().nullable(),
  transportMode: z.string().trim().max(50).optional().nullable(),
  deliveryReason: z.string().trim().max(255).default("Supply against Sales Order"),
  recipientName: z.string().trim().max(255).optional().nullable(),
  recipientPhone: z.string().trim().max(50).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  terms: z.string().trim().max(2000).optional().nullable(),
  items: z.array(deliveryChallanItemSchema).min(1, "At least one item must be delivered."),
});

export const updateDeliveryChallanStatusSchema = z.object({
  status: z.enum(["DRAFT", "DISPATCHED", "DELIVERED", "CANCELLED"]),
  dispatchDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
  recipientName: z.string().trim().max(255).optional().nullable(),
  recipientPhone: z.string().trim().max(50).optional().nullable(),
  transporterName: z.string().trim().max(255).optional().nullable(),
  vehicleNumber: z.string().trim().max(50).optional().nullable(),
  trackingNumber: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});
