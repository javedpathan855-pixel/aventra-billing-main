import {
  InvoiceStatus as PrismaInvoiceStatus,
} from "@/generated/prisma/enums";
import type { Invoice as PrismaInvoice, InvoiceItem as PrismaInvoiceItem } from "@/generated/prisma/client";
import type { Invoice, InvoiceLineItem, InvoiceStatus, TaxMode } from "../../domain/invoice";

type PrismaInvoiceWithItems = PrismaInvoice & {
  items: PrismaInvoiceItem[];
  creditNotes?: Array<{ total: PrismaInvoice["total"] }>;
  debitNotes?: Array<{ total: PrismaInvoice["total"] }>;
  paymentAllocations?: Array<{ amount: PrismaInvoice["total"] }>;
};

export const toDomainInvoiceStatus = (status: PrismaInvoiceStatus): InvoiceStatus => {
  switch (status) {
    case PrismaInvoiceStatus.DRAFT:
      return "Draft";
    case PrismaInvoiceStatus.ISSUED:
      return "Issued";
    case PrismaInvoiceStatus.PARTIALLY_PAID:
      return "Partially Paid";
    case PrismaInvoiceStatus.PAID:
      return "Paid";
    case PrismaInvoiceStatus.OVERDUE:
      return "Overdue";
    case PrismaInvoiceStatus.CANCELLED:
      return "Cancelled";
    default:
      return "Draft";
  }
};

export const toPrismaInvoiceStatus = (status: InvoiceStatus): PrismaInvoiceStatus => {
  switch (status) {
    case "Draft":
      return PrismaInvoiceStatus.DRAFT;
    case "Issued":
      return PrismaInvoiceStatus.ISSUED;
    case "Partially Paid":
      return PrismaInvoiceStatus.PARTIALLY_PAID;
    case "Paid":
      return PrismaInvoiceStatus.PAID;
    case "Overdue":
      return PrismaInvoiceStatus.OVERDUE;
    case "Cancelled":
      return PrismaInvoiceStatus.CANCELLED;
    default:
      return PrismaInvoiceStatus.DRAFT;
  }
};

export const toDomainInvoiceLineItem = (item: PrismaInvoiceItem): InvoiceLineItem => ({
  id: item.id,
  item: item.item,
  description: item.description ?? "",
  hsnSac: item.hsnSac ?? undefined,
  unit: item.unit ?? undefined,
  quantity: Number(item.quantity),
  unitPrice: Number(item.unitPrice),
  discount: Number(item.discount),
  taxRate: Number(item.taxRate),
});

export const toDomainInvoice = (prismaRecord: PrismaInvoiceWithItems): Invoice => {
  const issueDateStr = prismaRecord.issueDate.toISOString().split("T")[0];
  const dueDateStr = prismaRecord.dueDate.toISOString().split("T")[0];

  const sortedItems = [...prismaRecord.items].sort((a, b) => a.sortOrder - b.sortOrder);
  const creditedSum = (prismaRecord.creditNotes ?? []).reduce(
    (sum, cn) => sum + Number(cn.total),
    0,
  );
  const debitedSum = (prismaRecord.debitNotes ?? []).reduce(
    (sum, dn) => sum + Number(dn.total),
    0,
  );
  const allocatedSum = (prismaRecord.paymentAllocations ?? []).reduce(
    (sum, allocation) => sum + Number(allocation.amount),
    0,
  );

  return {
    id: prismaRecord.id,
    number: prismaRecord.invoiceNumber,
    customerId: prismaRecord.customerId ?? undefined,
    customer: prismaRecord.customerName,
    customerEmail: prismaRecord.customerEmail ?? "",
    customerAddress: prismaRecord.customerAddress ?? "",
    customerGstin: prismaRecord.customerGstin ?? "",
    customerPlaceOfSupply: prismaRecord.customerPlaceOfSupply ?? undefined,
    issueDate: issueDateStr,
    dueDate: dueDateStr,
    status: toDomainInvoiceStatus(prismaRecord.status),
    taxMode: (prismaRecord.taxMode === "IGST" ? "IGST" : "CGST_SGST") as TaxMode,
    notes: prismaRecord.notes ?? "",
    paymentTerms: prismaRecord.paymentTerms,
    terms: prismaRecord.terms ?? "",
    items: sortedItems.map(toDomainInvoiceLineItem),
    amountPaid: Number(prismaRecord.amountPaid),
    creditedAmount: Math.round((creditedSum + Number.EPSILON) * 100) / 100,
    debitedAmount: Math.round((debitedSum + Number.EPSILON) * 100) / 100,
    allocatedCash: Math.round((allocatedSum + Number.EPSILON) * 100) / 100,
    additionalCharges: Number(prismaRecord.additionalCharges),
    additionalChargesLabel: prismaRecord.additionalChargesLabel ?? undefined,
    additionalDiscount: Number(prismaRecord.additionalDiscount),
    additionalDiscountType: (prismaRecord.additionalDiscountType === "percentage"
      ? "percentage"
      : "fixed") as "percentage" | "fixed",
    additionalDiscountLabel: prismaRecord.additionalDiscountLabel ?? undefined,
    createdAt: prismaRecord.createdAt.toISOString(),
    updatedAt: prismaRecord.updatedAt.toISOString(),
  };
};
