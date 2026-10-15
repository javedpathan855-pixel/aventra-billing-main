import { describe, expect, it } from "vitest";
import { DebitNoteStatus as PrismaDebitNoteStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import {
  toDomainDebitNote,
  toDomainDebitNoteStatus,
  toPrismaDebitNoteStatus,
} from "./prisma-debit-note-mapper";

const Decimal = Prisma.Decimal;

describe("prisma-debit-note-mapper", () => {
  it("maps Prisma debit note statuses to domain statuses correctly", () => {
    expect(toDomainDebitNoteStatus(PrismaDebitNoteStatus.DRAFT)).toBe("Draft");
    expect(toDomainDebitNoteStatus(PrismaDebitNoteStatus.ISSUED)).toBe("Issued");
    expect(toDomainDebitNoteStatus(PrismaDebitNoteStatus.CANCELLED)).toBe("Cancelled");
  });

  it("maps Domain debit note statuses to Prisma statuses correctly", () => {
    expect(toPrismaDebitNoteStatus("Draft")).toBe(PrismaDebitNoteStatus.DRAFT);
    expect(toPrismaDebitNoteStatus("Issued")).toBe(PrismaDebitNoteStatus.ISSUED);
    expect(toPrismaDebitNoteStatus("Cancelled")).toBe(PrismaDebitNoteStatus.CANCELLED);
  });

  it("maps Prisma record with Decimal values and relations to Domain debit note entity", () => {
    const prismaRecord = {
      id: "dn-test-1",
      organizationId: "org-test-1",
      debitNoteNumber: "DN-2026-0001",
      invoiceId: "inv-test-1",
      customerId: "cust-1",
      customerName: "Acme Enterprises",
      customerEmail: "billing@acme.com",
      customerAddress: "Mumbai, MH",
      customerGstin: "27ABCDE1234F1Z5",
      customerPlaceOfSupply: "27-Maharashtra",
      issueDate: new Date("2026-10-15T00:00:00.000Z"),
      status: PrismaDebitNoteStatus.ISSUED,
      reason: "Under-billing correction",
      taxMode: "CGST_SGST",
      currency: "INR (₹)",
      subtotal: new Decimal(10000),
      lineDiscountTotal: new Decimal(0),
      taxableAmount: new Decimal(10000),
      cgst: new Decimal(900),
      sgst: new Decimal(900),
      igst: new Decimal(0),
      totalTax: new Decimal(1800),
      total: new Decimal(11800),
      notes: "Debit note against INV-2026-0001",
      terms: "Payable within 15 days",
      createdAt: new Date("2026-10-15T10:00:00.000Z"),
      updatedAt: new Date("2026-10-15T10:00:00.000Z"),
      invoice: {
        invoiceNumber: "INV-2026-0001",
      },
      items: [
        {
          id: "dn-item-1",
          debitNoteId: "dn-test-1",
          invoiceItemId: "inv-item-1",
          productId: "prod-1",
          item: "Additional service",
          description: "Extra work",
          hsnSac: "998314",
          quantity: new Decimal(1),
          unitPrice: new Decimal(10000),
          discount: new Decimal(0),
          taxRate: new Decimal(18),
          taxableAmount: new Decimal(10000),
          taxAmount: new Decimal(1800),
          lineTotal: new Decimal(11800),
          sortOrder: 0,
          createdAt: new Date("2026-10-15T10:00:00.000Z"),
          updatedAt: new Date("2026-10-15T10:00:00.000Z"),
        },
      ],
    };

    const domain = toDomainDebitNote(prismaRecord as Parameters<typeof toDomainDebitNote>[0]);

    expect(domain.id).toBe("dn-test-1");
    expect(domain.debitNoteNumber).toBe("DN-2026-0001");
    expect(domain.invoiceId).toBe("inv-test-1");
    expect(domain.invoiceNumber).toBe("INV-2026-0001");
    expect(domain.customerName).toBe("Acme Enterprises");
    expect(domain.status).toBe("Issued");
    expect(domain.reason).toBe("Under-billing correction");
    expect(domain.taxMode).toBe("CGST_SGST");
    expect(domain.subtotal).toBe(10000);
    expect(domain.total).toBe(11800);
    expect(domain.items[0].quantity).toBe(1);
    expect(domain.items[0].unitPrice).toBe(10000);
  });
});
