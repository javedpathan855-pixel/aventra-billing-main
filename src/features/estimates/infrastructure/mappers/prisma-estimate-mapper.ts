import {
  EstimateStatus as PrismaEstimateStatus,
  type Estimate as PrismaEstimate,
  type EstimateItem as PrismaEstimateItem,
} from "@/generated/prisma/client";
import type {
  Estimate,
  EstimateLineItem,
  EstimateStatus,
  TaxMode,
} from "../../domain/entities/estimate";

export const toDomainEstimateStatus = (
  status: PrismaEstimateStatus,
): EstimateStatus => {
  switch (status) {
    case PrismaEstimateStatus.DRAFT:
      return "Draft";
    case PrismaEstimateStatus.SENT:
      return "Sent";
    case PrismaEstimateStatus.ACCEPTED:
      return "Accepted";
    case PrismaEstimateStatus.REJECTED:
      return "Rejected";
    case PrismaEstimateStatus.EXPIRED:
      return "Expired";
    case PrismaEstimateStatus.CONVERTED:
      return "Converted";
    case PrismaEstimateStatus.CANCELLED:
      return "Cancelled";
    default:
      return "Draft";
  }
};

export const toPrismaEstimateStatus = (
  status: EstimateStatus,
): PrismaEstimateStatus => {
  switch (status) {
    case "Draft":
      return PrismaEstimateStatus.DRAFT;
    case "Sent":
      return PrismaEstimateStatus.SENT;
    case "Accepted":
      return PrismaEstimateStatus.ACCEPTED;
    case "Rejected":
      return PrismaEstimateStatus.REJECTED;
    case "Expired":
      return PrismaEstimateStatus.EXPIRED;
    case "Converted":
      return PrismaEstimateStatus.CONVERTED;
    case "Cancelled":
      return PrismaEstimateStatus.CANCELLED;
    default:
      return PrismaEstimateStatus.DRAFT;
  }
};

export type PrismaEstimateWithRelations = PrismaEstimate & {
  items: PrismaEstimateItem[];
};

export const toDomainEstimate = (
  raw: PrismaEstimateWithRelations,
): Estimate => {
  const sortedItems = [...raw.items].sort((a, b) => a.sortOrder - b.sortOrder);

  const domainItems: EstimateLineItem[] = sortedItems.map((item) => ({
    id: item.id,
    productId: item.productId ?? undefined,
    item: item.item,
    description: item.description ?? "",
    hsnSac: item.hsnSac ?? undefined,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unitPrice),
    discount: Number(item.discount),
    taxRate: Number(item.taxRate),
  }));

  const issueDateStr = raw.issueDate.toISOString().slice(0, 10);
  const validUntilStr = raw.validUntil.toISOString().slice(0, 10);

  return {
    id: raw.id,
    estimateNumber: raw.estimateNumber,
    customer: raw.customerName,
    customerEmail: raw.customerEmail ?? "",
    customerAddress: raw.customerAddress ?? "",
    customerGstin: raw.customerGstin ?? "",
    customerPlaceOfSupply: raw.customerPlaceOfSupply ?? undefined,
    customerId: raw.customerId ?? undefined,
    referenceNumber: raw.referenceNumber ?? undefined,
    issueDate: issueDateStr,
    validUntil: validUntilStr,
    status: toDomainEstimateStatus(raw.status),
    taxMode: (raw.taxMode as TaxMode) || "CGST_SGST",
    notes: raw.notes ?? "",
    terms: raw.terms ?? "",
    items: domainItems,
    additionalCharges: Number(raw.additionalCharges) || undefined,
    additionalChargesLabel: raw.additionalChargesLabel ?? undefined,
    additionalDiscount: Number(raw.additionalDiscount) || undefined,
    additionalDiscountType: (raw.additionalDiscountType as "percentage" | "fixed") || "fixed",
    additionalDiscountLabel: raw.additionalDiscountLabel ?? undefined,
    convertedToInvoiceId: raw.convertedToInvoiceId ?? undefined,
    convertedToSalesOrderId: raw.convertedToSalesOrderId ?? undefined,
    convertedAt: raw.convertedAt ? raw.convertedAt.toISOString() : undefined,
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
};
