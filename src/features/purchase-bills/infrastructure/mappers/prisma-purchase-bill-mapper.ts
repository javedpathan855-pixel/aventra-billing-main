import type {
  PurchaseBill as PrismaPurchaseBill,
  PurchaseBillItem as PrismaPurchaseBillItem,
  PurchaseBillStatus as PrismaPurchaseBillStatus,
} from "@/generated/prisma/client";
import type {
  PurchaseBill,
  PurchaseBillItem,
  PurchaseBillStatus,
} from "../../domain/entities/purchase-bill";

export const toDomainPurchaseBillStatus = (
  status: PrismaPurchaseBillStatus,
): PurchaseBillStatus => {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "CONFIRMED":
      return "Confirmed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Draft";
  }
};

export const toPrismaPurchaseBillStatus = (
  status: PurchaseBillStatus,
): PrismaPurchaseBillStatus => {
  switch (status) {
    case "Draft":
      return "DRAFT";
    case "Confirmed":
      return "CONFIRMED";
    case "Cancelled":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
};

export type PrismaPurchaseBillWithRelations = PrismaPurchaseBill & {
  items: PrismaPurchaseBillItem[];
};

export const toDomainPurchaseBillItem = (
  raw: PrismaPurchaseBillItem,
): PurchaseBillItem => ({
  id: raw.id,
  purchaseBillId: raw.purchaseBillId,
  productId: raw.productId,
  item: raw.item,
  description: raw.description,
  hsnSac: raw.hsnSac,
  unit: raw.unit,
  quantity: Number(raw.quantity),
  unitPrice: Number(raw.unitPrice),
  discount: Number(raw.discount),
  taxRate: Number(raw.taxRate),
  taxableAmount: Number(raw.taxableAmount),
  taxAmount: Number(raw.taxAmount),
  lineTotal: Number(raw.lineTotal),
  sortOrder: raw.sortOrder,
});

export const toDomainPurchaseBill = (
  raw: PrismaPurchaseBillWithRelations,
): PurchaseBill => {
  const items = (raw.items || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toDomainPurchaseBillItem);

  return {
    id: raw.id,
    organizationId: raw.organizationId,
    billNumber: raw.billNumber,
    supplierId: raw.supplierId,
    supplierName: raw.supplierName,
    supplierEmail: raw.supplierEmail,
    supplierAddress: raw.supplierAddress,
    supplierGstin: raw.supplierGstin,
    supplierPlaceOfSupply: raw.supplierPlaceOfSupply,
    supplierInvoiceNumber: raw.supplierInvoiceNumber,
    supplierInvoiceDate: raw.supplierInvoiceDate
      ? raw.supplierInvoiceDate.toISOString().split("T")[0]
      : null,
    purchaseOrderId: raw.purchaseOrderId,
    purchaseOrderNumber: raw.purchaseOrderNumber,
    billDate: raw.billDate.toISOString().split("T")[0],
    dueDate: raw.dueDate.toISOString().split("T")[0],
    status: toDomainPurchaseBillStatus(raw.status),
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
