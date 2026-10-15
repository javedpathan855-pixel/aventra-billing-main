import type {
  PurchaseOrder as PrismaPurchaseOrder,
  PurchaseOrderItem as PrismaPurchaseOrderItem,
  PurchaseOrderStatus as PrismaPurchaseOrderStatus,
} from "@/generated/prisma/client";
import type {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from "../../domain/entities/purchase-order";

export const toDomainPurchaseOrderStatus = (
  status: PrismaPurchaseOrderStatus,
): PurchaseOrderStatus => {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "CONFIRMED":
      return "Confirmed";
    case "PARTIALLY_RECEIVED":
      return "PartiallyReceived";
    case "RECEIVED":
      return "Received";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Draft";
  }
};

export const toPrismaPurchaseOrderStatus = (
  status: PurchaseOrderStatus,
): PrismaPurchaseOrderStatus => {
  switch (status) {
    case "Draft":
      return "DRAFT";
    case "Confirmed":
      return "CONFIRMED";
    case "PartiallyReceived":
      return "PARTIALLY_RECEIVED";
    case "Received":
      return "RECEIVED";
    case "Cancelled":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
};

export type PrismaPurchaseOrderWithRelations = PrismaPurchaseOrder & {
  items: PrismaPurchaseOrderItem[];
};

export const toDomainPurchaseOrderItem = (
  raw: PrismaPurchaseOrderItem,
): PurchaseOrderItem => {
  const qty = Number(raw.quantity);
  const received = Number(raw.receivedQuantity);
  return {
    id: raw.id,
    purchaseOrderId: raw.purchaseOrderId,
    productId: raw.productId,
    item: raw.item,
    description: raw.description,
    hsnSac: raw.hsnSac,
    unit: raw.unit,
    quantity: qty,
    receivedQuantity: received,
    remainingQuantity: Math.max(0, qty - received),
    unitPrice: Number(raw.unitPrice),
    discount: Number(raw.discount),
    taxRate: Number(raw.taxRate),
    taxableAmount: Number(raw.taxableAmount),
    taxAmount: Number(raw.taxAmount),
    lineTotal: Number(raw.lineTotal),
    sortOrder: raw.sortOrder,
  };
};

export const toDomainPurchaseOrder = (
  raw: PrismaPurchaseOrderWithRelations,
): PurchaseOrder => {
  const items = (raw.items || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toDomainPurchaseOrderItem);

  return {
    id: raw.id,
    organizationId: raw.organizationId,
    orderNumber: raw.orderNumber,
    supplierId: raw.supplierId,
    supplierName: raw.supplierName,
    supplierEmail: raw.supplierEmail,
    supplierAddress: raw.supplierAddress,
    supplierGstin: raw.supplierGstin,
    supplierPlaceOfSupply: raw.supplierPlaceOfSupply,
    orderDate: raw.orderDate.toISOString().split("T")[0],
    expectedDeliveryDate: raw.expectedDeliveryDate
      ? raw.expectedDeliveryDate.toISOString().split("T")[0]
      : null,
    referenceNumber: raw.referenceNumber,
    status: toDomainPurchaseOrderStatus(raw.status),
    taxMode: (raw.taxMode as "CGST_SGST" | "IGST") || "CGST_SGST",
    currency: raw.currency,
    paymentTerms: raw.paymentTerms,
    subtotal: Number(raw.subtotal),
    lineDiscountTotal: Number(raw.lineDiscountTotal),
    additionalDiscount: Number(raw.additionalDiscount),
    additionalDiscountType:
      (raw.additionalDiscountType as "fixed" | "percentage") || "fixed",
    additionalDiscountLabel: raw.additionalDiscountLabel,
    additionalCharges: Number(raw.additionalCharges),
    additionalChargesLabel: raw.additionalChargesLabel,
    taxableAmount: Number(raw.taxableAmount),
    cgst: Number(raw.cgst),
    sgst: Number(raw.sgst),
    igst: Number(raw.igst),
    totalTax: Number(raw.totalTax),
    total: Number(raw.total),
    notes: raw.notes,
    terms: raw.terms,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    items,
  };
};
