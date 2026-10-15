import type {
  SalesReturn as PrismaSalesReturn,
  SalesReturnItem as PrismaSalesReturnItem,
} from "@/generated/prisma/client";
import type {
  SalesReturn,
  SalesReturnItem,
  SalesReturnStatus,
  ReturnDisposition,
} from "../../domain/entities/sales-return";

type PrismaSalesReturnWithRelations = PrismaSalesReturn & {
  items: PrismaSalesReturnItem[];
  invoice?: { invoiceNumber: string } | null;
  salesOrder?: { orderNumber: string } | null;
  creditNote?: { creditNoteNumber: string } | null;
};

export const toDomainSalesReturnItem = (
  raw: PrismaSalesReturnItem,
): SalesReturnItem => ({
  id: raw.id,
  salesReturnId: raw.salesReturnId,
  productId: raw.productId,
  invoiceItemId: raw.invoiceItemId,
  item: raw.item,
  description: raw.description,
  hsnSac: raw.hsnSac,
  soldQuantity: Number(raw.soldQuantity),
  returnQuantity: Number(raw.returnQuantity),
  receivedQuantity: Number(raw.receivedQuantity),
  unitPrice: Number(raw.unitPrice),
  discount: Number(raw.discount),
  taxRate: Number(raw.taxRate),
  taxAmount: Number(raw.taxAmount),
  lineTotal: Number(raw.lineTotal),
  disposition: (raw.disposition as ReturnDisposition) || "RESTOCK",
  reason: raw.reason,
  sortOrder: raw.sortOrder,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
});

export const toDomainSalesReturn = (
  raw: PrismaSalesReturnWithRelations,
): SalesReturn => ({
  id: raw.id,
  organizationId: raw.organizationId,
  returnNumber: raw.returnNumber,
  customerId: raw.customerId,
  customerName: raw.customerName,
  customerEmail: raw.customerEmail,
  customerAddress: raw.customerAddress,
  customerGstin: raw.customerGstin,
  customerPlaceOfSupply: raw.customerPlaceOfSupply,
  invoiceId: raw.invoiceId,
  invoiceNumber: raw.invoice?.invoiceNumber ?? null,
  salesOrderId: raw.salesOrderId,
  salesOrderNumber: raw.salesOrder?.orderNumber ?? null,
  creditNoteId: raw.creditNoteId,
  creditNoteNumber: raw.creditNote?.creditNoteNumber ?? null,
  returnDate: raw.returnDate,
  reason: raw.reason,
  status: raw.status as SalesReturnStatus,
  taxMode: raw.taxMode,
  currency: raw.currency,
  subtotal: Number(raw.subtotal),
  taxAmount: Number(raw.taxAmount),
  totalAmount: Number(raw.totalAmount),
  notes: raw.notes,
  createdAt: raw.createdAt,
  updatedAt: raw.updatedAt,
  items: (raw.items || []).map(toDomainSalesReturnItem),
});
