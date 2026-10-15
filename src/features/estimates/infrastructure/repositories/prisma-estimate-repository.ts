import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type { Estimate, EstimateStatus } from "../../domain/entities/estimate";
import type {
  IEstimateRepository,
  EstimateFilterCriteria,
  SaveEstimateDomainInput,
} from "../../domain/repositories/estimate-repository";
import {
  toDomainEstimate,
  toPrismaEstimateStatus,
} from "../mappers/prisma-estimate-mapper";

const Decimal = Prisma.Decimal;

export class PrismaEstimateRepository implements IEstimateRepository {
  async findById(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<Estimate | null> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const record = await prisma.estimate.findFirst({
      where: {
        organizationId,
        OR: [{ id }, { estimateNumber: id }],
      },
      include: {
        items: true,
      },
    });

    if (!record) return null;
    return toDomainEstimate(record);
  }

  async findByNumber(
    organizationId: string,
    estimateNumber: string,
    txClient?: unknown,
  ): Promise<Estimate | null> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
    const record = await prisma.estimate.findUnique({
      where: {
        organizationId_estimateNumber: {
          organizationId,
          estimateNumber,
        },
      },
      include: {
        items: true,
      },
    });

    if (!record) return null;
    return toDomainEstimate(record);
  }

  async findMany(
    organizationId: string,
    criteria?: EstimateFilterCriteria,
  ): Promise<Estimate[]> {
    const prisma = getPrisma();

    const where: Prisma.EstimateWhereInput = {
      organizationId,
    };

    if (criteria?.status && criteria.status !== "all") {
      const upperStatus = criteria.status.toUpperCase();
      const validStatuses = [
        "DRAFT",
        "SENT",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
        "CONVERTED",
        "CANCELLED",
      ];
      if (validStatuses.includes(upperStatus)) {
        where.status = upperStatus as Prisma.EnumEstimateStatusFilter;
      }
    }

    if (criteria?.customerId) {
      where.customerId = criteria.customerId;
    }

    if (criteria?.search) {
      const q = criteria.search.trim();
      if (q.length > 0) {
        where.OR = [
          { estimateNumber: { contains: q, mode: "insensitive" } },
          { customerName: { contains: q, mode: "insensitive" } },
          { customerEmail: { contains: q, mode: "insensitive" } },
          { referenceNumber: { contains: q, mode: "insensitive" } },
        ];
      }
    }

    const records = await prisma.estimate.findMany({
      where,
      include: {
        items: true,
      },
      orderBy: {
        issueDate: "desc",
      },
    });

    return records.map(toDomainEstimate);
  }

  async create(
    data: SaveEstimateDomainInput,
    txClient?: unknown,
  ): Promise<Estimate> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();

    const record = await prisma.estimate.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        estimateNumber: data.estimateNumber,
        customerId: data.customerId ?? null,
        customerName: data.customerName,
        customerEmail: data.customerEmail ?? null,
        customerAddress: data.customerAddress ?? null,
        customerGstin: data.customerGstin ?? null,
        customerPlaceOfSupply: data.customerPlaceOfSupply ?? null,
        referenceNumber: data.referenceNumber ?? null,
        issueDate: data.issueDate,
        validUntil: data.validUntil,
        status: toPrismaEstimateStatus(data.status),
        taxMode: data.taxMode,
        currency: data.currency,
        subtotal: new Decimal(data.subtotal.toFixed(2)),
        lineDiscountTotal: new Decimal(data.lineDiscountTotal.toFixed(2)),
        additionalDiscount: new Decimal(data.additionalDiscount.toFixed(2)),
        additionalDiscountType: data.additionalDiscountType,
        additionalDiscountLabel: data.additionalDiscountLabel ?? null,
        additionalCharges: new Decimal(data.additionalCharges.toFixed(2)),
        additionalChargesLabel: data.additionalChargesLabel ?? null,
        taxableAmount: new Decimal(data.taxableAmount.toFixed(2)),
        cgst: new Decimal(data.cgst.toFixed(2)),
        sgst: new Decimal(data.sgst.toFixed(2)),
        igst: new Decimal(data.igst.toFixed(2)),
        totalTax: new Decimal(data.totalTax.toFixed(2)),
        total: new Decimal(data.total.toFixed(2)),
        notes: data.notes ?? null,
        terms: data.terms ?? null,
        items: {
          create: data.items.map((item, idx) => ({
            id: item.id,
            productId: item.productId ?? null,
            item: item.item,
            description: item.description ?? null,
            hsnSac: item.hsnSac ?? null,
            quantity: new Decimal(item.quantity.toString()),
            unitPrice: new Decimal(item.unitPrice.toFixed(2)),
            discount: new Decimal(item.discount.toFixed(2)),
            taxRate: new Decimal(item.taxRate.toFixed(2)),
            taxableAmount: new Decimal(item.taxableAmount.toFixed(2)),
            taxAmount: new Decimal(item.taxAmount.toFixed(2)),
            lineTotal: new Decimal(item.lineTotal.toFixed(2)),
            sortOrder: item.sortOrder ?? idx,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return toDomainEstimate(record);
  }

  async update(
    organizationId: string,
    id: string,
    data: SaveEstimateDomainInput,
    txClient?: unknown,
  ): Promise<Estimate> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();

    // In a transaction, update estimate and replace items
    const record = await prisma.$transaction(async (tx) => {
      await tx.estimateItem.deleteMany({
        where: { estimateId: id },
      });

      return tx.estimate.update({
        where: {
          organizationId,
          id,
        },
        data: {
          estimateNumber: data.estimateNumber,
          customerId: data.customerId ?? null,
          customerName: data.customerName,
          customerEmail: data.customerEmail ?? null,
          customerAddress: data.customerAddress ?? null,
          customerGstin: data.customerGstin ?? null,
          customerPlaceOfSupply: data.customerPlaceOfSupply ?? null,
          referenceNumber: data.referenceNumber ?? null,
          issueDate: data.issueDate,
          validUntil: data.validUntil,
          status: toPrismaEstimateStatus(data.status),
          taxMode: data.taxMode,
          currency: data.currency,
          subtotal: new Decimal(data.subtotal.toFixed(2)),
          lineDiscountTotal: new Decimal(data.lineDiscountTotal.toFixed(2)),
          additionalDiscount: new Decimal(data.additionalDiscount.toFixed(2)),
          additionalDiscountType: data.additionalDiscountType,
          additionalDiscountLabel: data.additionalDiscountLabel ?? null,
          additionalCharges: new Decimal(data.additionalCharges.toFixed(2)),
          additionalChargesLabel: data.additionalChargesLabel ?? null,
          taxableAmount: new Decimal(data.taxableAmount.toFixed(2)),
          cgst: new Decimal(data.cgst.toFixed(2)),
          sgst: new Decimal(data.sgst.toFixed(2)),
          igst: new Decimal(data.igst.toFixed(2)),
          totalTax: new Decimal(data.totalTax.toFixed(2)),
          total: new Decimal(data.total.toFixed(2)),
          notes: data.notes ?? null,
          terms: data.terms ?? null,
          items: {
            create: data.items.map((item, idx) => ({
              id: item.id,
              productId: item.productId ?? null,
              item: item.item,
              description: item.description ?? null,
              hsnSac: item.hsnSac ?? null,
              quantity: new Decimal(item.quantity.toString()),
              unitPrice: new Decimal(item.unitPrice.toFixed(2)),
              discount: new Decimal(item.discount.toFixed(2)),
              taxRate: new Decimal(item.taxRate.toFixed(2)),
              taxableAmount: new Decimal(item.taxableAmount.toFixed(2)),
              taxAmount: new Decimal(item.taxAmount.toFixed(2)),
              lineTotal: new Decimal(item.lineTotal.toFixed(2)),
              sortOrder: item.sortOrder ?? idx,
            })),
          },
        },
        include: {
          items: true,
        },
      });
    });

    return toDomainEstimate(record);
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: EstimateStatus,
    extra?: { convertedToInvoiceId?: string; convertedAt?: Date },
    txClient?: unknown,
  ): Promise<Estimate> {
    const prisma = (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();

    const record = await prisma.estimate.update({
      where: {
        organizationId,
        id,
      },
      data: {
        status: toPrismaEstimateStatus(status),
        ...(extra?.convertedToInvoiceId !== undefined && {
          convertedToInvoiceId: extra.convertedToInvoiceId,
        }),
        ...(extra?.convertedAt !== undefined && {
          convertedAt: extra.convertedAt,
        }),
      },
      include: {
        items: true,
      },
    });

    return toDomainEstimate(record);
  }

  async delete(organizationId: string, id: string): Promise<number> {
    const prisma = getPrisma();
    const result = await prisma.estimate.deleteMany({
      where: {
        organizationId,
        id,
        status: "DRAFT",
      },
    });
    return result.count;
  }
}

export const estimateRepository = new PrismaEstimateRepository();
