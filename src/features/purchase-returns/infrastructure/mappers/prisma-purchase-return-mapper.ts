import type {
  PurchaseReturn as PrismaPurchaseReturn,
  PurchaseReturnItem as PrismaPurchaseReturnItem,
  PurchaseReturnStatus as PrismaPurchaseReturnStatus,
} from "@/generated/prisma/client";
import type {
  PurchaseReturn,
  PurchaseReturnItem,
  PurchaseReturnStatus,
  ReturnDisposition,
} from "../../domain/entities/purchase-return";

export const toDomainPurchaseReturnStatus = (
  status: PrismaPurchaseReturnStatus,
): PurchaseReturnStatus => {
  switch (status) {
    case "DRAFT":
      return "DRAFT";
    case "APPROVED":
      return "APPROVED";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
};

export const toPrismaPurchaseReturnStatus = (
  status: PurchaseReturnStatus,
): PrismaPurchaseReturnStatus => {
  switch (status) {
    case "DRAFT":
      return "DRAFT";
    case "APPROVED":
      return "APPROVED";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
};

const toDisposition = (value: string): ReturnDisposition =>
  value === "DAMAGED" || value === "QUARANTINE" ? value : "RESTOCK";

export type PrismaPurchaseReturnWithRelations = PrismaPurchaseReturn & {
  items: PrismaPurchaseReturnItem[];
};

export const toDomainPurchaseReturnItem = (
  raw: PrismaPurchaseReturnItem,
): PurchaseReturnItem => ({
  id: raw.id,
  purchaseReturnId: raw.purchaseReturnId,
  productId: raw.productId,
  purchaseBillItemId: raw.purchaseBillItemId,
  item: raw.item,
  description: raw.description,
  hsnSac: raw.hsnSac,
  billedQuantity: Number(raw.billedQuantity),
  returnQuantity: Number(raw.returnQuantity),
  unitPrice: Number(raw.unitPrice),
  discount: Number(raw.discount),
  taxRate: Number(raw.taxRate),
  taxAmount: Number(raw.taxAmount),
  lineTotal: Number(raw.lineTotal),
  disposition: toDisposition(raw.disposition),
  reason: raw.reason,
  sortOrder: raw.sortOrder,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

export const toDomainPurchaseReturn = (
  raw: PrismaPurchaseReturnWithRelations,
): PurchaseReturn => {
  const items = (raw.items || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toDomainPurchaseReturnItem);

  return {
    id: raw.id,
    organizationId: raw.organizationId,
    returnNumber: raw.returnNumber,
    supplierId: raw.supplierId,
    supplierName: raw.supplierName,
    supplierEmail: raw.supplierEmail,
    supplierAddress: raw.supplierAddress,
    supplierGstin: raw.supplierGstin,
    supplierPlaceOfSupply: raw.supplierPlaceOfSupply,
    purchaseBillId: raw.purchaseBillId,
    purchaseBillNumber: raw.purchaseBillNumber,
    purchaseOrderId: raw.purchaseOrderId,
    purchaseOrderNumber: raw.purchaseOrderNumber,
    returnDate: raw.returnDate.toISOString().split("T")[0],
    reason: raw.reason,
    status: toDomainPurchaseReturnStatus(raw.status),
    taxMode: (raw.taxMode as "CGST_SGST" | "IGST") || "CGST_SGST",
    currency: raw.currency,
    subtotal: Number(raw.subtotal),
    taxAmount: Number(raw.taxAmount),
    totalAmount: Number(raw.totalAmount),
    notes: raw.notes,
    terms: raw.terms,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    items,
  };
};
