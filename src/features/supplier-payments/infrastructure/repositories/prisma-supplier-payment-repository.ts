import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type { SupplierPayment } from "../../domain/supplier-payment";
import type {
  ISupplierPaymentRepository,
  ListSupplierPaymentsFilters,
  ListSupplierPaymentsResult,
  SaveSupplierPaymentDomainInput,
} from "../../domain/repositories/supplier-payment-repository";
import {
  toDomainSupplierPayment,
  toPrismaSupplierPaymentMethod,
  toPrismaSupplierPaymentStatus,
} from "../mappers/prisma-supplier-payment-mapper";

const Decimal = Prisma.Decimal;

const allocationInclude = {
  include: {
    allocations: {
      include: {
        purchaseBill: { select: { billNumber: true } },
      },
      orderBy: { createdAt: "asc" as const },
    },
  },
};

export class PrismaSupplierPaymentRepository
  implements ISupplierPaymentRepository
{
  async findById(
    organizationId: string,
    id: string,
  ): Promise<SupplierPayment | null> {
    const prisma = getPrisma();
    const record = await prisma.supplierPayment.findFirst({
      where: { organizationId, id },
      ...allocationInclude,
    });
    if (!record) return null;
    return toDomainSupplierPayment(record);
  }

  async findByIdempotencyKey(
    organizationId: string,
    idempotencyKey: string,
  ): Promise<SupplierPayment | null> {
    const prisma = getPrisma();
    const record = await prisma.supplierPayment.findUnique({
      where: {
        organizationId_idempotencyKey: { organizationId, idempotencyKey },
      },
      ...allocationInclude,
    });
    if (!record) return null;
    return toDomainSupplierPayment(record);
  }

  async listWithFilters(
    organizationId: string,
    filters?: ListSupplierPaymentsFilters,
  ): Promise<ListSupplierPaymentsResult> {
    const prisma = getPrisma();
    const where: Prisma.SupplierPaymentWhereInput = { organizationId };

    if (filters?.status && filters.status !== "ALL") {
      where.status = toPrismaSupplierPaymentStatus(filters.status);
    }

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.method && filters.method !== "ALL") {
      where.method = toPrismaSupplierPaymentMethod(filters.method);
    }

    if (filters?.query && filters.query.trim().length > 0) {
      const q = filters.query.trim();
      where.OR = [
        { supplierName: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    if (filters?.from || filters?.to) {
      where.paymentDate = {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      };
    }

    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters?.pageSize ?? 20));

    const [rows, totalCount, allOrgRows, coveredBills] = await Promise.all([
      prisma.supplierPayment.findMany({
        where,
        ...allocationInclude,
        orderBy: { paymentDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supplierPayment.count({ where }),
      prisma.supplierPayment.findMany({
        where: { organizationId },
        select: { id: true, status: true, amount: true },
      }),
      prisma.supplierPaymentAllocation.findMany({
        where: {
          organizationId,
          payment: { status: "ACTIVE" },
        },
        distinct: ["purchaseBillId"],
        select: { purchaseBillId: true },
      }),
    ]);

    const payments = rows.map(toDomainSupplierPayment);

    let totalAmount = 0;
    let activeCount = 0;
    let activeAmount = 0;
    let reversedCount = 0;

    for (const r of allOrgRows) {
      const amt = Number(r.amount);
      totalAmount += amt;

      if (r.status === "ACTIVE") {
        activeCount++;
        activeAmount += amt;
      }
      if (r.status === "REVERSED") {
        reversedCount++;
      }
    }

    return {
      payments,
      metrics: {
        totalPayments: allOrgRows.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        activeCount,
        activeAmount: Math.round(activeAmount * 100) / 100,
        reversedCount,
        billsCovered: coveredBills.length,
      },
      totalCount,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    };
  }

  async findByBillId(
    organizationId: string,
    purchaseBillId: string,
  ): Promise<SupplierPayment[]> {
    const prisma = getPrisma();
    const records = await prisma.supplierPayment.findMany({
      where: {
        organizationId,
        allocations: { some: { purchaseBillId } },
      },
      ...allocationInclude,
      orderBy: { paymentDate: "desc" },
    });
    return records.map(toDomainSupplierPayment);
  }

  async getActiveAllocatedTotalForBill(
    organizationId: string,
    purchaseBillId: string,
    excludePaymentId?: string,
    txClient?: unknown,
  ): Promise<number> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const whereClause: Prisma.SupplierPaymentAllocationWhereInput = {
      organizationId,
      purchaseBillId,
      payment: { status: "ACTIVE" },
    };
    if (excludePaymentId) {
      whereClause.paymentId = { not: excludePaymentId };
    }
    const records = await prisma.supplierPaymentAllocation.findMany({
      where: whereClause,
      select: { amount: true },
    });
    const sum = records.reduce((acc, curr) => acc + Number(curr.amount), 0);
    return Math.round((sum + Number.EPSILON) * 100) / 100;
  }

  async create(
    input: SaveSupplierPaymentDomainInput,
    txClient?: Prisma.TransactionClient,
  ): Promise<SupplierPayment> {
    const runCreate = async (tx: Prisma.TransactionClient) => {
      const record = await tx.supplierPayment.create({
        data: {
          id: input.id,
          organizationId: input.organizationId,
          supplierId: input.supplierId ?? null,
          supplierName: input.supplierName,
          amount: new Decimal(input.amount),
          currency: input.currency ?? "INR (₹)",
          paymentDate: input.paymentDate,
          method: toPrismaSupplierPaymentMethod(input.method),
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
              purchaseBillId: allocation.purchaseBillId,
              amount: new Decimal(allocation.amount),
            })),
          },
        },
        ...allocationInclude,
      });
      return toDomainSupplierPayment(record);
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
    // reversal can never double-restore balances.
    const result = await prisma.supplierPayment.updateMany({
      where: { id, organizationId, status: "ACTIVE" },
      data: {
        status: "REVERSED",
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

export const supplierPaymentRepository = new PrismaSupplierPaymentRepository();
