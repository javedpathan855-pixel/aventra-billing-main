import { describe, expect, it } from "vitest";
import {
  PaymentMethod as PrismaPaymentMethod,
  PaymentStatus as PrismaPaymentStatus,
} from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import {
  toDomainPayment,
  toDomainPaymentMethod,
  toDomainPaymentStatus,
  toPrismaPaymentMethod,
  toPrismaPaymentStatus,
} from "./prisma-payment-mapper";

const Decimal = Prisma.Decimal;

describe("prisma-payment-mapper", () => {
  it("maps statuses and methods both directions", () => {
    expect(toDomainPaymentStatus(PrismaPaymentStatus.ACTIVE)).toBe("Active");
    expect(toDomainPaymentStatus(PrismaPaymentStatus.REVERSED)).toBe("Reversed");
    expect(toPrismaPaymentStatus("Active")).toBe(PrismaPaymentStatus.ACTIVE);
    expect(toPrismaPaymentStatus("Reversed")).toBe(PrismaPaymentStatus.REVERSED);
    expect(toDomainPaymentMethod(PrismaPaymentMethod.UPI)).toBe("UPI");
    expect(toPrismaPaymentMethod("Cheque")).toBe(PrismaPaymentMethod.CHEQUE);
  });

  it("maps a record with allocations and invoice numbers", () => {
    const record = {
      id: "pay-1",
      organizationId: "org-1",
      customerId: "cust-1",
      customerName: "Acme",
      amount: new Decimal(10000),
      currency: "INR (₹)",
      paymentDate: new Date("2026-10-15T00:00:00.000Z"),
      method: PrismaPaymentMethod.BANK_TRANSFER,
      reference: "NEFT-001",
      notes: "October receipt",
      status: PrismaPaymentStatus.ACTIVE,
      reversedAt: null,
      reversalReason: null,
      reversedBy: null,
      idempotencyKey: "key-1",
      createdBy: "user-1",
      createdAt: new Date("2026-10-15T10:00:00.000Z"),
      updatedAt: new Date("2026-10-15T10:00:00.000Z"),
      allocations: [
        {
          id: "pa-1",
          organizationId: "org-1",
          paymentId: "pay-1",
          invoiceId: "inv-1",
          amount: new Decimal(10000),
          createdAt: new Date("2026-10-15T10:00:00.000Z"),
          updatedAt: new Date("2026-10-15T10:00:00.000Z"),
          invoice: { invoiceNumber: "INV-0001" },
        },
      ],
    };

    const domain = toDomainPayment(record as Parameters<typeof toDomainPayment>[0]);
    expect(domain.method).toBe("Bank Transfer");
    expect(domain.reference).toBe("NEFT-001");
    expect(domain.allocations).toHaveLength(1);
    expect(domain.allocations[0].invoiceNumber).toBe("INV-0001");
    expect(domain.allocations[0].amount).toBe(10000);
  });
});
