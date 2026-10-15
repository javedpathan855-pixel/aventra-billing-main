import {
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus as PrismaPaymentStatus,
} from "@/generated/prisma/enums";
import type {
  Payment as PrismaPayment,
  PaymentAllocation as PrismaPaymentAllocation,
} from "@/generated/prisma/client";
import type {
  Payment,
  PaymentAllocationLine,
  PaymentMethod,
  PaymentStatus,
} from "../../domain/payment";

export type PrismaPaymentWithRelations = PrismaPayment & {
  allocations: Array<
    PrismaPaymentAllocation & { invoice?: { invoiceNumber: string } | null }
  >;
};

export const toDomainPaymentStatus = (status: PrismaPaymentStatus): PaymentStatus => {
  switch (status) {
    case PrismaPaymentStatus.ACTIVE:
      return "Active";
    case PrismaPaymentStatus.REVERSED:
      return "Reversed";
    default:
      return "Active";
  }
};

export const toPrismaPaymentStatus = (status: PaymentStatus): PrismaPaymentStatus => {
  switch (status) {
    case "Active":
      return PrismaPaymentStatus.ACTIVE;
    case "Reversed":
      return PrismaPaymentStatus.REVERSED;
    default:
      return PrismaPaymentStatus.ACTIVE;
  }
};

export const toDomainPaymentMethod = (method: PrismaPaymentMethod): PaymentMethod => {
  switch (method) {
    case PrismaPaymentMethod.CASH:
      return "Cash";
    case PrismaPaymentMethod.BANK_TRANSFER:
      return "Bank Transfer";
    case PrismaPaymentMethod.UPI:
      return "UPI";
    case PrismaPaymentMethod.CHEQUE:
      return "Cheque";
    case PrismaPaymentMethod.CARD:
      return "Card";
    case PrismaPaymentMethod.OTHER:
      return "Other";
    default:
      return "Other";
  }
};

export const toPrismaPaymentMethod = (method: PaymentMethod): PrismaPaymentMethod => {
  switch (method) {
    case "Cash":
      return PrismaPaymentMethod.CASH;
    case "Bank Transfer":
      return PrismaPaymentMethod.BANK_TRANSFER;
    case "UPI":
      return PrismaPaymentMethod.UPI;
    case "Cheque":
      return PrismaPaymentMethod.CHEQUE;
    case "Card":
      return PrismaPaymentMethod.CARD;
    case "Other":
      return PrismaPaymentMethod.OTHER;
    default:
      return PrismaPaymentMethod.OTHER;
  }
};

export const toDomainAllocationLine = (
  allocation: PrismaPaymentAllocation & { invoice?: { invoiceNumber: string } | null },
): PaymentAllocationLine => ({
  id: allocation.id,
  invoiceId: allocation.invoiceId,
  invoiceNumber: allocation.invoice?.invoiceNumber,
  amount: Number(allocation.amount),
});

export const toDomainPayment = (record: PrismaPaymentWithRelations): Payment => {
  const paymentDateStr = record.paymentDate.toISOString().split("T")[0] ?? "";
  const sortedAllocations = [...record.allocations].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return {
    id: record.id,
    organizationId: record.organizationId,
    customerId: record.customerId ?? undefined,
    customerName: record.customerName,
    amount: Number(record.amount),
    currency: record.currency,
    paymentDate: paymentDateStr,
    method: toDomainPaymentMethod(record.method),
    reference: record.reference ?? undefined,
    notes: record.notes ?? "",
    status: toDomainPaymentStatus(record.status),
    reversedAt: record.reversedAt ? record.reversedAt.toISOString() : undefined,
    reversalReason: record.reversalReason ?? undefined,
    reversedBy: record.reversedBy ?? undefined,
    idempotencyKey: record.idempotencyKey ?? undefined,
    createdBy: record.createdBy ?? undefined,
    allocations: sortedAllocations.map(toDomainAllocationLine),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
};
