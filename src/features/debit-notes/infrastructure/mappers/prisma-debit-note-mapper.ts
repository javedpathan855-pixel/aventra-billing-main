import { DebitNoteStatus as PrismaDebitNoteStatus } from "@/generated/prisma/enums";
import type {
  DebitNote as PrismaDebitNote,
  DebitNoteItem as PrismaDebitNoteItem,
} from "@/generated/prisma/client";
import type {
  DebitNote,
  DebitNoteLineItem,
  DebitNoteStatus,
  TaxMode,
} from "../../domain/debit-note";

export type PrismaDebitNoteWithRelations = PrismaDebitNote & {
  items: PrismaDebitNoteItem[];
  invoice?: {
    invoiceNumber: string;
  } | null;
};

export const toDomainDebitNoteStatus = (
  status: PrismaDebitNoteStatus,
): DebitNoteStatus => {
  switch (status) {
    case PrismaDebitNoteStatus.DRAFT:
      return "Draft";
    case PrismaDebitNoteStatus.ISSUED:
      return "Issued";
    case PrismaDebitNoteStatus.CANCELLED:
      return "Cancelled";
    default:
      return "Draft";
  }
};

export const toPrismaDebitNoteStatus = (
  status: DebitNoteStatus,
): PrismaDebitNoteStatus => {
  switch (status) {
    case "Draft":
      return PrismaDebitNoteStatus.DRAFT;
    case "Issued":
      return PrismaDebitNoteStatus.ISSUED;
    case "Cancelled":
      return PrismaDebitNoteStatus.CANCELLED;
    default:
      return PrismaDebitNoteStatus.DRAFT;
  }
};

export const toDomainDebitNoteLineItem = (
  item: PrismaDebitNoteItem,
): DebitNoteLineItem => ({
  id: item.id,
  invoiceItemId: item.invoiceItemId ?? undefined,
  productId: item.productId ?? undefined,
  item: item.item,
  description: item.description ?? "",
  hsnSac: item.hsnSac ?? undefined,
  quantity: Number(item.quantity),
  unitPrice: Number(item.unitPrice),
  discount: Number(item.discount),
  taxRate: Number(item.taxRate),
});

export const toDomainDebitNote = (
  record: PrismaDebitNoteWithRelations,
): DebitNote => {
  const issueDateStr = record.issueDate.toISOString().split("T")[0] ?? "";
  const sortedItems = [...record.items].sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    id: record.id,
    debitNoteNumber: record.debitNoteNumber,
    invoiceId: record.invoiceId,
    invoiceNumber: record.invoice?.invoiceNumber,
    customerId: record.customerId ?? undefined,
    customerName: record.customerName,
    customerEmail: record.customerEmail ?? "",
    customerAddress: record.customerAddress ?? "",
    customerGstin: record.customerGstin ?? "",
    customerPlaceOfSupply: record.customerPlaceOfSupply ?? undefined,
    issueDate: issueDateStr,
    status: toDomainDebitNoteStatus(record.status),
    reason: record.reason,
    taxMode: (record.taxMode === "IGST" ? "IGST" : "CGST_SGST") as TaxMode,
    currency: record.currency,
    subtotal: Number(record.subtotal),
    lineDiscountTotal: Number(record.lineDiscountTotal),
    taxableAmount: Number(record.taxableAmount),
    cgst: Number(record.cgst),
    sgst: Number(record.sgst),
    igst: Number(record.igst),
    totalTax: Number(record.totalTax),
    total: Number(record.total),
    notes: record.notes ?? "",
    terms: record.terms ?? "",
    items: sortedItems.map(toDomainDebitNoteLineItem),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};
