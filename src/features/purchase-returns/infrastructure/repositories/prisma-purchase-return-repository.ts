import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type {
  PurchaseReturn,
  ReturnableBill,
  ReturnableBillItem,
} from "../../domain/entities/purchase-return";
import {
  calculatePurchaseReturnLineTotals,
  calculatePurchaseReturnTotals,
  calculateRemainingReturnableQuantity,
} from "../../domain/rules/purchase-return-rules";
import type {
  IPurchaseReturnRepository,
  CreatePurchaseReturnInput,
  UpdatePurchaseReturnStatusInput,
  ListPurchaseReturnsFilters,
  ListPurchaseReturnsResult,
} from "../../domain/repositories/purchase-return-repository";
import {
  toDomainPurchaseReturn,
  toPrismaPurchaseReturnStatus,
} from "../mappers/prisma-purchase-return-mapper";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class PrismaPurchaseReturnRepository implements IPurchaseReturnRepository {
  private getClient(txClient?: unknown) {
    return (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
  }

  async findById(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<PurchaseReturn | null> {
    const prisma = this.getClient(txClient);
    const row = await prisma.purchaseReturn.findFirst({
      where: { id, organizationId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return row ? toDomainPurchaseReturn(row) : null;
  }

  async findByNumber(
    organizationId: string,
    returnNumber: string,
    txClient?: unknown,
  ): Promise<PurchaseReturn | null> {
    const prisma = this.getClient(txClient);
    const row = await prisma.purchaseReturn.findUnique({
      where: {
        organizationId_returnNumber: { organizationId, returnNumber },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return row ? toDomainPurchaseReturn(row) : null;
  }

  async listWithFilters(
    organizationId: string,
    filters?: ListPurchaseReturnsFilters,
  ): Promise<ListPurchaseReturnsResult> {
    const prisma = getPrisma();
    const where: Prisma.PurchaseReturnWhereInput = { organizationId };

    if (filters?.status && filters.status !== "ALL") {
      where.status = toPrismaPurchaseReturnStatus(filters.status);
    }

    if (filters?.search && filters.search.trim().length > 0) {
      const q = filters.search.trim();
      where.OR = [
        { returnNumber: { contains: q, mode: "insensitive" } },
        { supplierName: { contains: q, mode: "insensitive" } },
        { reason: { contains: q, mode: "insensitive" } },
        { purchaseBillNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.purchaseBillId) {
      where.purchaseBillId = filters.purchaseBillId;
    }

    if (filters?.purchaseOrderId) {
      where.purchaseOrderId = filters.purchaseOrderId;
    }

    if (filters?.from || filters?.to) {
      where.returnDate = {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      };
    }

    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, filters?.pageSize ?? DEFAULT_PAGE_SIZE),
    );

    const [rows, totalCount, allOrgRows] = await Promise.all([
      prisma.purchaseReturn.findMany({
        where,
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { returnDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseReturn.count({ where }),
      prisma.purchaseReturn.findMany({
        where: { organizationId },
        select: {
          id: true,
          status: true,
          totalAmount: true,
        },
      }),
    ]);

    const returns = rows.map(toDomainPurchaseReturn);

    let totalAmount = 0;
    let approvedCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    for (const r of allOrgRows) {
      totalAmount += Number(r.totalAmount);

      if (r.status === "APPROVED") {
        approvedCount++;
      }
      if (r.status === "COMPLETED") {
        completedCount++;
      }
      if (r.status === "CANCELLED") {
        cancelledCount++;
      }
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      returns,
      metrics: {
        totalReturns: allOrgRows.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        approvedCount,
        completedCount,
        cancelledCount,
      },
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  async create(
    organizationId: string,
    input: CreatePurchaseReturnInput,
    txClient?: unknown,
  ): Promise<PurchaseReturn> {
    const prisma = this.getClient(txClient);

    const totals = calculatePurchaseReturnTotals(input.items);

    const purchaseReturnId = `prt_${crypto.randomUUID()}`;

    const lineItemsData = input.items.map((it, idx) => {
      const lineTotals = calculatePurchaseReturnLineTotals({
        quantity: it.returnQuantity,
        unitPrice: it.unitPrice,
        discount: it.discount || 0,
        taxRate: it.taxRate ?? 0,
      });

      return {
        id: `prti_${crypto.randomUUID()}`,
        productId: it.productId || null,
        purchaseBillItemId: it.purchaseBillItemId || null,
        item: it.item,
        description: it.description || null,
        hsnSac: it.hsnSac || null,
        billedQuantity: new Prisma.Decimal(it.billedQuantity),
        returnQuantity: new Prisma.Decimal(it.returnQuantity),
        unitPrice: new Prisma.Decimal(it.unitPrice),
        discount: new Prisma.Decimal(it.discount || 0),
        taxRate: new Prisma.Decimal(it.taxRate ?? 0),
        taxAmount: new Prisma.Decimal(lineTotals.taxAmount),
        lineTotal: new Prisma.Decimal(lineTotals.lineTotal),
        disposition: it.disposition || "RESTOCK",
        reason: it.reason || null,
        sortOrder: it.sortOrder !== undefined ? it.sortOrder : idx,
      };
    });

    const row = await prisma.purchaseReturn.create({
      data: {
        id: purchaseReturnId,
        organizationId,
        returnNumber: input.returnNumber,
        supplierId: input.supplierId || null,
        supplierName: input.supplierName,
        supplierEmail: input.supplierEmail || null,
        supplierAddress: input.supplierAddress || null,
        supplierGstin: input.supplierGstin || null,
        supplierPlaceOfSupply: input.supplierPlaceOfSupply || null,
        purchaseBillId: input.purchaseBillId || null,
        purchaseBillNumber: input.purchaseBillNumber || null,
        purchaseOrderId: input.purchaseOrderId || null,
        purchaseOrderNumber: input.purchaseOrderNumber || null,
        returnDate: input.returnDate,
        reason: input.reason,
        status: "DRAFT",
        taxMode: input.taxMode || "CGST_SGST",
        currency: input.currency || "INR (₹)",
        subtotal: new Prisma.Decimal(totals.subtotal),
        taxAmount: new Prisma.Decimal(totals.taxAmount),
        totalAmount: new Prisma.Decimal(totals.totalAmount),
        notes: input.notes || null,
        terms: input.terms || null,
        items: {
          create: lineItemsData,
        },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return toDomainPurchaseReturn(row);
  }

  async updateStatus(
    organizationId: string,
    id: string,
    input: UpdatePurchaseReturnStatusInput,
    txClient?: unknown,
  ): Promise<PurchaseReturn> {
    const prisma = this.getClient(txClient);
    const existing = await prisma.purchaseReturn.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error(`Purchase Return ${id} not found.`);
    }

    const row = await prisma.purchaseReturn.update({
      where: { id },
      data: {
        status: toPrismaPurchaseReturnStatus(input.status),
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return toDomainPurchaseReturn(row);
  }

  async delete(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<void> {
    const prisma = this.getClient(txClient);
    await prisma.purchaseReturn.deleteMany({
      where: { id, organizationId },
    });
  }

  async getReturnableBills(
    organizationId: string,
    supplierId?: string,
    txClient?: unknown,
  ): Promise<ReturnableBill[]> {
    const prisma = this.getClient(txClient);

    const bills = await prisma.purchaseBill.findMany({
      where: {
        organizationId,
        status: "CONFIRMED",
        ...(supplierId ? { supplierId } : {}),
      },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { product: { select: { unit: true } } },
        },
      },
      orderBy: { billDate: "desc" },
    });

    const returnable: ReturnableBill[] = [];

    for (const bill of bills) {
      const items: ReturnableBillItem[] = [];

      for (const line of bill.items) {
        const aggregate = await prisma.purchaseReturnItem.aggregate({
          _sum: { returnQuantity: true },
          where: {
            purchaseBillItemId: line.id,
            purchaseReturn: {
              organizationId,
              status: { not: "CANCELLED" },
            },
          },
        });

        const previouslyReturned = Number(aggregate._sum.returnQuantity ?? 0);
        const remaining = calculateRemainingReturnableQuantity(
          Number(line.quantity),
          previouslyReturned,
        );

        if (remaining <= 0) {
          continue;
        }

        items.push({
          id: line.id,
          productId: line.productId,
          item: line.item,
          description: line.description,
          hsnSac: line.hsnSac,
          billedQuantity: Number(line.quantity),
          previouslyReturnedQuantity: previouslyReturned,
          remainingReturnableQuantity: remaining,
          unitPrice: Number(line.unitPrice),
          discount: Number(line.discount),
          taxRate: Number(line.taxRate),
          unit: line.product?.unit || "PCS",
        });
      }

      if (items.length === 0) {
        continue;
      }

      returnable.push({
        id: bill.id,
        billNumber: bill.billNumber,
        billDate: bill.billDate.toISOString().split("T")[0],
        supplierId: bill.supplierId,
        supplierName: bill.supplierName,
        supplierEmail: bill.supplierEmail,
        supplierAddress: bill.supplierAddress,
        supplierGstin: bill.supplierGstin,
        supplierPlaceOfSupply: bill.supplierPlaceOfSupply,
        taxMode: (bill.taxMode as "CGST_SGST" | "IGST") || "CGST_SGST",
        currency: bill.currency,
        items,
      });
    }

    return returnable;
  }

  async getReturnableBillById(
    organizationId: string,
    billId: string,
    txClient?: unknown,
  ): Promise<ReturnableBill | null> {
    const prisma = this.getClient(txClient);

    const bill = await prisma.purchaseBill.findFirst({
      where: { id: billId, organizationId },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { product: { select: { unit: true } } },
        },
      },
    });

    if (!bill) {
      return null;
    }

    const items: ReturnableBillItem[] = [];

    for (const line of bill.items) {
      const aggregate = await prisma.purchaseReturnItem.aggregate({
        _sum: { returnQuantity: true },
        where: {
          purchaseBillItemId: line.id,
          purchaseReturn: {
            organizationId,
            status: { not: "CANCELLED" },
          },
        },
      });

      const previouslyReturned = Number(aggregate._sum.returnQuantity ?? 0);

      items.push({
        id: line.id,
        productId: line.productId,
        item: line.item,
        description: line.description,
        hsnSac: line.hsnSac,
        billedQuantity: Number(line.quantity),
        previouslyReturnedQuantity: previouslyReturned,
        remainingReturnableQuantity: calculateRemainingReturnableQuantity(
          Number(line.quantity),
          previouslyReturned,
        ),
        unitPrice: Number(line.unitPrice),
        discount: Number(line.discount),
        taxRate: Number(line.taxRate),
        unit: line.product?.unit || "PCS",
      });
    }

    return {
      id: bill.id,
      billNumber: bill.billNumber,
      billDate: bill.billDate.toISOString().split("T")[0],
      supplierId: bill.supplierId,
      supplierName: bill.supplierName,
      supplierEmail: bill.supplierEmail,
      supplierAddress: bill.supplierAddress,
      supplierGstin: bill.supplierGstin,
      supplierPlaceOfSupply: bill.supplierPlaceOfSupply,
      taxMode: (bill.taxMode as "CGST_SGST" | "IGST") || "CGST_SGST",
      currency: bill.currency,
      items,
    };
  }

  /**
   * Sums quantities already returned against a bill line by non-cancelled
   * returns. Used inside creation transactions to enforce remaining
   * quantities against authoritative state.
   */
  async sumReturnedForBillItem(
    organizationId: string,
    purchaseBillItemId: string,
    txClient?: unknown,
  ): Promise<number> {
    const prisma = this.getClient(txClient);
    const aggregate = await prisma.purchaseReturnItem.aggregate({
      _sum: { returnQuantity: true },
      where: {
        purchaseBillItemId,
        purchaseReturn: {
          organizationId,
          status: { not: "CANCELLED" },
        },
      },
    });
    return Number(aggregate._sum.returnQuantity ?? 0);
  }
}

export const purchaseReturnRepository = new PrismaPurchaseReturnRepository();
