import type {
  SalesOrder as PrismaSalesOrder,
  SalesOrderItem as PrismaSalesOrderItem,
  Estimate as PrismaEstimate,
  Invoice as PrismaInvoice,
  SalesOrderStatus as PrismaSalesOrderStatus,
} from "@/generated/prisma/client";
import type {
  SalesOrder,
  SalesOrderItem,
  SalesOrderStatus,
  RelatedInvoiceSummary,
} from "../../domain/entities/sales-order";

export const toDomainSalesOrderStatus = (
  status: PrismaSalesOrderStatus,
): SalesOrderStatus => {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "CONFIRMED":
      return "Confirmed";
    case "PARTIALLY_FULFILLED":
      return "PartiallyFulfilled";
    case "FULFILLED":
      return "Fulfilled";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Draft";
  }
};

export const toPrismaSalesOrderStatus = (
  status: SalesOrderStatus,
): PrismaSalesOrderStatus => {
  switch (status) {
    case "Draft":
      return "DRAFT";
    case "Confirmed":
      return "CONFIRMED";
    case "PartiallyFulfilled":
      return "PARTIALLY_FULFILLED";
    case "Fulfilled":
      return "FULFILLED";
    case "Cancelled":
      return "CANCELLED";
    default:
      return "DRAFT";
  }
};

export type PrismaSalesOrderWithRelations = PrismaSalesOrder & {
  items: PrismaSalesOrderItem[];
  sourceEstimate?: PrismaEstimate | null;
  invoices?: PrismaInvoice[];
};

export const toDomainSalesOrderItem = (
  raw: PrismaSalesOrderItem,
): SalesOrderItem => {
  const qty = Number(raw.quantity);
  const fulfilled = Number(raw.fulfilledQuantity);
  return {
    id: raw.id,
    salesOrderId: raw.salesOrderId,
    productId: raw.productId,
    item: raw.item,
    description: raw.description,
    hsnSac: raw.hsnSac,
    unit: raw.unit,
    quantity: qty,
    fulfilledQuantity: fulfilled,
    remainingQuantity: Math.max(0, qty - fulfilled),
    unitPrice: Number(raw.unitPrice),
    discount: Number(raw.discount),
    taxRate: Number(raw.taxRate),
    taxableAmount: Number(raw.taxableAmount),
    taxAmount: Number(raw.taxAmount),
    lineTotal: Number(raw.lineTotal),
    sortOrder: raw.sortOrder,
  };
};

export const toDomainSalesOrder = (
  raw: PrismaSalesOrderWithRelations,
): SalesOrder => {
  const items = (raw.items || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(toDomainSalesOrderItem);

  const invoices: RelatedInvoiceSummary[] = (raw.invoices || []).map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    issueDate: inv.issueDate.toISOString().split("T")[0],
    dueDate: inv.dueDate.toISOString().split("T")[0],
    status: inv.status,
    total: Number(inv.total),
  }));

  return {
    id: raw.id,
    organizationId: raw.organizationId,
    orderNumber: raw.orderNumber,
    customerId: raw.customerId,
    customerName: raw.customerName,
    customerEmail: raw.customerEmail,
    customerAddress: raw.customerAddress,
    customerGstin: raw.customerGstin,
    customerPlaceOfSupply: raw.customerPlaceOfSupply,
    orderDate: raw.orderDate.toISOString().split("T")[0],
    expectedDeliveryDate: raw.expectedDeliveryDate
      ? raw.expectedDeliveryDate.toISOString().split("T")[0]
      : null,
    referenceNumber: raw.referenceNumber,
    status: toDomainSalesOrderStatus(raw.status),
    taxMode: (raw.taxMode as "CGST_SGST" | "IGST") || "CGST_SGST",
    currency: raw.currency,
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
    sourceEstimateId: raw.sourceEstimate?.id ?? null,
    sourceEstimateNumber: raw.sourceEstimate?.estimateNumber ?? null,
    invoices,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    items,
  };
};
