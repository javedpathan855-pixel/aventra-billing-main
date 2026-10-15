import type {
  DeliveryChallan as PrismaDeliveryChallan,
  DeliveryChallanItem as PrismaDeliveryChallanItem,
} from "@/generated/prisma/client";
import type {
  DeliveryChallan,
  DeliveryChallanItem,
  DeliveryChallanStatus,
} from "../../domain/entities/delivery-challan";

type PrismaChallanWithRelations = PrismaDeliveryChallan & {
  items: PrismaDeliveryChallanItem[];
  salesOrder?: { orderNumber: string } | null;
  invoice?: { invoiceNumber: string } | null;
};

export const toDomainDeliveryChallanItem = (
  raw: PrismaDeliveryChallanItem,
): DeliveryChallanItem => ({
  id: raw.id,
  challanId: raw.challanId,
  salesOrderItemId: raw.salesOrderItemId,
  productId: raw.productId,
  item: raw.item,
  description: raw.description,
  hsnSac: raw.hsnSac,
  unit: raw.unit,
  orderedQuantity: Number(raw.orderedQuantity),
  deliveredQuantity: Number(raw.deliveredQuantity),
  sortOrder: raw.sortOrder,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

export const toDomainDeliveryChallan = (
  raw: PrismaChallanWithRelations,
): DeliveryChallan => ({
  id: raw.id,
  organizationId: raw.organizationId,
  challanNumber: raw.challanNumber,
  customerId: raw.customerId,
  customerName: raw.customerName,
  customerEmail: raw.customerEmail,
  customerAddress: raw.customerAddress,
  customerGstin: raw.customerGstin,
  salesOrderId: raw.salesOrderId,
  salesOrderNumber: raw.salesOrder?.orderNumber ?? null,
  invoiceId: raw.invoiceId,
  invoiceNumber: raw.invoice?.invoiceNumber ?? null,
  challanDate: raw.challanDate,
  dispatchDate: raw.dispatchDate,
  deliveryDate: raw.deliveryDate,
  status: raw.status as DeliveryChallanStatus,
  deliveryAddress: raw.deliveryAddress,
  transporterName: raw.transporterName,
  vehicleNumber: raw.vehicleNumber,
  trackingNumber: raw.trackingNumber,
  transportMode: raw.transportMode,
  deliveryReason: raw.deliveryReason,
  recipientName: raw.recipientName,
  recipientPhone: raw.recipientPhone,
  notes: raw.notes,
  terms: raw.terms,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  items: (raw.items || []).map(toDomainDeliveryChallanItem),
});
