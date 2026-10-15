import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { DebitNoteStatus as PrismaDebitNoteStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/shared/lib/prisma";
import type { DebitNote } from "../../domain/debit-note";
import type {
  IDebitNoteRepository,
  DebitNoteFilterCriteria,
  SaveDebitNoteDomainInput,
} from "../../domain/repositories/debit-note-repository";
import {
  toDomainDebitNote,
  toPrismaDebitNoteStatus,
} from "../mappers/prisma-debit-note-mapper";

const Decimal = Prisma.Decimal;

export class PrismaDebitNoteRepository implements IDebitNoteRepository {
  async findById(organizationId: string, id: string): Promise<DebitNote | null> {
    const prisma = getPrisma();
    const record = await prisma.debitNote.findFirst({
      where: {
        organizationId,
        OR: [{ id }, { debitNoteNumber: id }],
      },
      include: {
        items: true,
        invoice: {
          select: { invoiceNumber: true },
        },
      },
    });

    if (!record) return null;
    return toDomainDebitNote(record);
  }

  async findByNumber(
    organizationId: string,
    debitNoteNumber: string,
  ): Promise<DebitNote | null> {
    const prisma = getPrisma();
    const record = await prisma.debitNote.findUnique({
      where: {
        organizationId_debitNoteNumber: {
          organizationId,
          debitNoteNumber,
        },
      },
      include: {
        items: true,
        invoice: {
          select: { invoiceNumber: true },
        },
      },
    });

    if (!record) return null;
    return toDomainDebitNote(record);
  }

  async findMany(
    organizationId: string,
    criteria?: DebitNoteFilterCriteria,
  ): Promise<DebitNote[]> {
    const prisma = getPrisma();
    const whereClause: Prisma.DebitNoteWhereInput = {
      organizationId,
    };

    if (criteria?.status) {
      whereClause.status = toPrismaDebitNoteStatus(criteria.status);
    }

    if (criteria?.customerId) {
      whereClause.customerId = criteria.customerId;
    }

    if (criteria?.invoiceId) {
      whereClause.invoiceId = criteria.invoiceId;
    }

    if (criteria?.query) {
      const q = criteria.query.trim();
      whereClause.OR = [
        { debitNoteNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerEmail: { contains: q, mode: "insensitive" } },
        { invoice: { invoiceNumber: { contains: q, mode: "insensitive" } } },
      ];
    }

    if (criteria?.startDate || criteria?.endDate) {
      whereClause.issueDate = {
        ...(criteria.startDate && { gte: new Date(criteria.startDate) }),
        ...(criteria.endDate && { lte: new Date(criteria.endDate) }),
      };
    }

    const records = await prisma.debitNote.findMany({
      where: whereClause,
      include: {
        items: true,
        invoice: {
          select: { invoiceNumber: true },
        },
      },
      orderBy: {
        issueDate: "desc",
      },
    });

    return records.map(toDomainDebitNote);
  }

  async findByInvoiceId(
    organizationId: string,
    invoiceId: string,
  ): Promise<DebitNote[]> {
    const prisma = getPrisma();
    const records = await prisma.debitNote.findMany({
      where: {
        organizationId,
        invoiceId,
      },
      include: {
        items: true,
        invoice: {
          select: { invoiceNumber: true },
        },
      },
      orderBy: {
        issueDate: "desc",
      },
    });

    return records.map(toDomainDebitNote);
  }

  async getIssuedTotalForInvoice(
    organizationId: string,
    invoiceId: string,
    excludeDebitNoteId?: string,
    txClient?: unknown,
  ): Promise<number> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const whereClause: Prisma.DebitNoteWhereInput = {
      organizationId,
      invoiceId,
      status: PrismaDebitNoteStatus.ISSUED,
    };

    if (excludeDebitNoteId) {
      whereClause.id = { not: excludeDebitNoteId };
    }

    const records = await prisma.debitNote.findMany({
      where: whereClause,
      select: { total: true },
    });

    const sum = records.reduce((acc, curr) => acc + Number(curr.total), 0);
    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }

  async create(
    input: SaveDebitNoteDomainInput,
    txClient?: Prisma.TransactionClient,
  ): Promise<DebitNote> {
    const runCreate = async (tx: Prisma.TransactionClient) => {
      const record = await tx.debitNote.create({
        data: {
          id: input.id,
          organizationId: input.organizationId,
          debitNoteNumber: input.debitNoteNumber,
          invoiceId: input.invoiceId,
          customerId: input.customerId ?? null,
          customerName: input.customerName,
          customerEmail: input.customerEmail ?? null,
          customerAddress: input.customerAddress ?? null,
          customerGstin: input.customerGstin ?? null,
          customerPlaceOfSupply: input.customerPlaceOfSupply ?? null,
          issueDate: input.issueDate,
          status: toPrismaDebitNoteStatus(input.status),
          reason: input.reason,
          taxMode: input.taxMode,
          currency: input.currency ?? "INR (₹)",
          subtotal: new Decimal(input.subtotal),
          lineDiscountTotal: new Decimal(input.lineDiscountTotal),
          taxableAmount: new Decimal(input.taxableAmount),
          cgst: new Decimal(input.cgst),
          sgst: new Decimal(input.sgst),
          igst: new Decimal(input.igst),
          totalTax: new Decimal(input.totalTax),
          total: new Decimal(input.total),
          notes: input.notes ?? null,
          terms: input.terms ?? null,
          items: {
            create: input.items.map((it) => ({
              id: it.id,
              invoiceItemId: it.invoiceItemId ?? null,
              productId: it.productId ?? null,
              item: it.item,
              description: it.description ?? null,
              hsnSac: it.hsnSac ?? null,
              quantity: new Decimal(it.quantity),
              unitPrice: new Decimal(it.unitPrice),
              discount: new Decimal(it.discount),
              taxRate: new Decimal(it.taxRate),
              taxableAmount: new Decimal(it.taxableAmount),
              taxAmount: new Decimal(it.taxAmount),
              lineTotal: new Decimal(it.lineTotal),
              sortOrder: it.sortOrder,
            })),
          },
        },
        include: {
          items: true,
          invoice: {
            select: { invoiceNumber: true },
          },
        },
      });

      return toDomainDebitNote(record);
    };

    if (txClient) {
      return await runCreate(txClient);
    }

    const prisma = getPrisma();
    return await prisma.$transaction(async (tx) => {
      return await runCreate(tx);
    });
  }

  async update(
    organizationId: string,
    id: string,
    input: SaveDebitNoteDomainInput,
    txClient?: Prisma.TransactionClient,
  ): Promise<DebitNote> {
    const runUpdate = async (tx: Prisma.TransactionClient) => {
      await tx.debitNoteItem.deleteMany({
        where: { debitNoteId: id },
      });

      const record = await tx.debitNote.update({
        where: {
          id,
          organizationId,
        },
        data: {
          debitNoteNumber: input.debitNoteNumber,
          invoiceId: input.invoiceId,
          customerId: input.customerId ?? null,
          customerName: input.customerName,
          customerEmail: input.customerEmail ?? null,
          customerAddress: input.customerAddress ?? null,
          customerGstin: input.customerGstin ?? null,
          customerPlaceOfSupply: input.customerPlaceOfSupply ?? null,
          issueDate: input.issueDate,
          status: toPrismaDebitNoteStatus(input.status),
          reason: input.reason,
          taxMode: input.taxMode,
          currency: input.currency ?? "INR (₹)",
          subtotal: new Decimal(input.subtotal),
          lineDiscountTotal: new Decimal(input.lineDiscountTotal),
          taxableAmount: new Decimal(input.taxableAmount),
          cgst: new Decimal(input.cgst),
          sgst: new Decimal(input.sgst),
          igst: new Decimal(input.igst),
          totalTax: new Decimal(input.totalTax),
          total: new Decimal(input.total),
          notes: input.notes ?? null,
          terms: input.terms ?? null,
          items: {
            create: input.items.map((it) => ({
              id: it.id,
              invoiceItemId: it.invoiceItemId ?? null,
              productId: it.productId ?? null,
              item: it.item,
              description: it.description ?? null,
              hsnSac: it.hsnSac ?? null,
              quantity: new Decimal(it.quantity),
              unitPrice: new Decimal(it.unitPrice),
              discount: new Decimal(it.discount),
              taxRate: new Decimal(it.taxRate),
              taxableAmount: new Decimal(it.taxableAmount),
              taxAmount: new Decimal(it.taxAmount),
              lineTotal: new Decimal(it.lineTotal),
              sortOrder: it.sortOrder,
            })),
          },
        },
        include: {
          items: true,
          invoice: {
            select: { invoiceNumber: true },
          },
        },
      });

      return toDomainDebitNote(record);
    };

    if (txClient) {
      return await runUpdate(txClient);
    }

    const prisma = getPrisma();
    return await prisma.$transaction(async (tx) => {
      return await runUpdate(tx);
    });
  }

  async delete(organizationId: string, id: string): Promise<number> {
    const prisma = getPrisma();
    // Draft-only enforced at the row level so a concurrent issuance racing
    // this delete cannot silently remove issued financial history.
    const result = await prisma.debitNote.deleteMany({
      where: {
        id,
        organizationId,
        status: PrismaDebitNoteStatus.DRAFT,
      },
    });
    return result.count;
  }
}

export const debitNoteRepository = new PrismaDebitNoteRepository();
