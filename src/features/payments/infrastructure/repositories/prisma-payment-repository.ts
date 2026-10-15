import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { PaymentStatus as PrismaPaymentStatus } from "@/generated/prisma/enums";
import { getPrisma } from "@/shared/lib/prisma";
import type { Payment } from "../../domain/payment";
import type {
  IPaymentRepository,
  PaymentFilterCriteria,
  SavePaymentDomainInput,
} from "../../domain/repositories/payment-repository";
import {
  toDomainPayment,
  toPrismaPaymentMethod,
  toPrismaPaymentStatus,
} from "../mappers/prisma-payment-mapper";

const Decimal = Prisma.Decimal;

const allocationInclude = {
  include: {
    allocations: {
      include: {
        invoice: { select: { invoiceNumber: true } },
      },
      orderBy: { createdAt: "asc" as const },
    },
  },
};

export class PrismaPaymentRepository implements IPaymentRepository {
  async findById(organizationId: string, id: string): Promise<Payment | null> {
    const prisma = getPrisma();
    const record = await prisma.payment.findFirst({
      where: { organizationId, id },
      ...allocationInclude,
    });
    if (!record) return null;
    return toDomainPayment(record);
  }

  async findByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<Payment | null> {
    const prisma = getPrisma();
    const record = await prisma.payment.findUnique({
      where: { organizationId_idempotencyKey: { organizationId, idempotencyKey } },
      ...allocationInclude,
    });
    if (!record) return null;
    return toDomainPayment(record);
  }

  async findMany(
    organizationId: string,
    criteria?: PaymentFilterCriteria,
  ): Promise<Payment[]> {
    const prisma = getPrisma();
    const whereClause: Prisma.PaymentWhereInput = { organizationId };

    if (criteria?.status) {
      whereClause.status = toPrismaPaymentStatus(criteria.status);
    }
    if (criteria?.customerId) {
      whereClause.customerId = criteria.customerId;
    }
    if (criteria?.method) {
      whereClause.method = toPrismaPaymentMethod(criteria.method);
    }
    if (criteria?.query) {
      const q = criteria.query.trim();
      whereClause.OR = [
        { customerName: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }
    if (criteria?.startDate || criteria?.endDate) {
      whereClause.paymentDate = {
        ...(criteria.startDate && { gte: new Date(criteria.startDate) }),
        ...(criteria.endDate && { lte: new Date(criteria.endDate) }),
      };
    }

    const records = await prisma.payment.findMany({
      where: whereClause,
      ...allocationInclude,
      orderBy: { paymentDate: "desc" },
    });
    return records.map(toDomainPayment);
  }

  async findByInvoiceId(organizationId: string, invoiceId: string): Promise<Payment[]> {
    const prisma = getPrisma();
    const records = await prisma.payment.findMany({
      where: {
        organizationId,
        allocations: { some: { invoiceId } },
      },
      ...allocationInclude,
      orderBy: { paymentDate: "desc" },
    });
    return records.map(toDomainPayment);
  }

  async getActiveAllocatedTotalForInvoice(
    organizationId: string,
    invoiceId: string,
    excludePaymentId?: string,
    txClient?: unknown,
  ): Promise<number> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const whereClause: Prisma.PaymentAllocationWhereInput = {
      organizationId,
      invoiceId,
      payment: { status: PrismaPaymentStatus.ACTIVE },
    };
    if (excludePaymentId) {
      whereClause.paymentId = { not: excludePaymentId };
    }
    const records = await prisma.paymentAllocation.findMany({
      where: whereClause,
      select: { amount: true },
    });
    const sum = records.reduce((acc, curr) => acc + Number(curr.amount), 0);
    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }

  async create(
    input: SavePaymentDomainInput,
    txClient?: Prisma.TransactionClient,
  ): Promise<Payment> {
    const runCreate = async (tx: Prisma.TransactionClient) => {
      const record = await tx.payment.create({
        data: {
          id: input.id,
          organizationId: input.organizationId,
          customerId: input.customerId ?? null,
          customerName: input.customerName,
          amount: new Decimal(input.amount),
          currency: input.currency ?? "INR (₹)",
          paymentDate: input.paymentDate,
          method: toPrismaPaymentMethod(input.method),
          reference: input.reference?.trim() ? input.reference.trim() : null,
          notes: input.notes ?? null,
          idempotencyKey:
            input.idempotencyKey && input.idempotencyKey.trim().length > 0
              ? input.idempotencyKey.trim()
              : null,
          createdBy: input.createdBy ?? null,
          allocations: {
            create: input.allocations.map((allocation) => ({
              id: allocation.id,
              organizationId: input.organizationId,
              invoiceId: allocation.invoiceId,
              amount: new Decimal(allocation.amount),
            })),
          },
        },
        ...allocationInclude,
      });
      return toDomainPayment(record);
    };

    if (txClient) {
      return await runCreate(txClient);
    }
    const prisma = getPrisma();
    return await prisma.$transaction(async (tx) => {
      return await runCreate(tx);
    });
  }

  async reverse(
    organizationId: string,
    id: string,
    reversal: { reason?: string | null; reversedBy?: string | null; reversedAt: Date },
    txClient?: unknown,
  ): Promise<number> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    // Conditional transition: only an Active payment reverses, so a repeated
    // reversal can never double-decrease balances.
    const result = await prisma.payment.updateMany({
      where: { id, organizationId, status: PrismaPaymentStatus.ACTIVE },
      data: {
        status: PrismaPaymentStatus.REVERSED,
        reversedAt: reversal.reversedAt,
        reversalReason:
          reversal.reason && reversal.reason.trim().length > 0
            ? reversal.reason.trim().slice(0, 500)
            : null,
        reversedBy: reversal.reversedBy ?? null,
      },
    });
    return result.count;
  }
}

export const paymentRepository = new PrismaPaymentRepository();
