import type {
  SupplierPayment as PrismaSupplierPayment,
  SupplierPaymentAllocation as PrismaSupplierPaymentAllocation,
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus as PrismaPaymentStatus,
} from "@/generated/prisma/client";
import type {
  SupplierPayment,
  SupplierPaymentAllocationLine,
  SupplierPaymentMethod,
  SupplierPaymentStatus,
} from "../../domain/supplier-payment";

export type PrismaSupplierPaymentWithRelations = PrismaSupplierPayment & {
  allocations: Array<
    PrismaSupplierPaymentAllocation & {
      purchaseBill?: { billNumber: string } | null;
    }
  >;
};

export const toDomainSupplierPaymentStatus = (
  status: PrismaPaymentStatus,
): SupplierPaymentStatus => {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "REVERSED":
      return "Reversed";
    default:
      return "Active";
  }
};

export const toPrismaSupplierPaymentStatus = (
  status: SupplierPaymentStatus,
): PrismaPaymentStatus => {
  switch (status) {
    case "Active":
      return "ACTIVE";
    case "Reversed":
      return "REVERSED";
    default:
      return "ACTIVE";
  }
};

export const toDomainSupplierPaymentMethod = (
  method: PrismaPaymentMethod,
): SupplierPaymentMethod => {
  switch (method) {
    case "CASH":
      return "Cash";
    case "BANK_TRANSFER":
      return "Bank Transfer";
    case "UPI":
      return "UPI";
    case "CHEQUE":
      return "Cheque";
    case "CARD":
      return "Card";
    case "OTHER":
      return "Other";
    default:
      return "Other";
  }
};

export const toPrismaSupplierPaymentMethod = (
  method: SupplierPaymentMethod,
): PrismaPaymentMethod => {
  switch (method) {
    case "Cash":
      return "CASH";
    case "Bank Transfer":
      return "BANK_TRANSFER";
    case "UPI":
      return "UPI";
    case "Cheque":
      return "CHEQUE";
    case "Card":
      return "CARD";
    case "Other":
      return "OTHER";
    default:
      return "OTHER";
  }
};

export const toDomainSupplierPaymentAllocation = (
  raw: PrismaSupplierPaymentAllocation & {
    purchaseBill?: { billNumber: string } | null;
  },
): SupplierPaymentAllocationLine => ({
  id: raw.id,
  purchaseBillId: raw.purchaseBillId,
  billNumber: raw.purchaseBill?.billNumber,
  amount: Number(raw.amount),
});

export const toDomainSupplierPayment = (
  raw: PrismaSupplierPaymentWithRelations,
): SupplierPayment => {
  const sortedAllocations = [...(raw.allocations || [])].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );

  return {
    id: raw.id,
    organizationId: raw.organizationId,
    supplierId: raw.supplierId ?? undefined,
    supplierName: raw.supplierName,
    amount: Number(raw.amount),
    currency: raw.currency,
    paymentDate: raw.paymentDate.toISOString().split("T")[0] ?? "",
    method: toDomainSupplierPaymentMethod(raw.method),
    reference: raw.reference ?? undefined,
    notes: raw.notes ?? "",
    status: toDomainSupplierPaymentStatus(raw.status),
    reversedAt: raw.reversedAt ? raw.reversedAt.toISOString() : undefined,
    reversalReason: raw.reversalReason ?? undefined,
    reversedBy: raw.reversedBy ?? undefined,
    idempotencyKey: raw.idempotencyKey ?? undefined,
    createdBy: raw.createdBy ?? undefined,
    allocations: sortedAllocations.map(toDomainSupplierPaymentAllocation),
    createdAt: raw.createdAt.toISOString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
};
