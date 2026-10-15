import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
} from "../../domain/entities/purchase-order";
import { calculatePurchaseOrderTotals } from "../../domain/rules/purchase-order-rules";
import type {
  IPurchaseOrderRepository,
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ListPurchaseOrdersFilters,
  ListPurchaseOrdersResult,
} from "../../domain/repositories/purchase-order-repository";
import {
  toDomainPurchaseOrder,
  toPrismaPurchaseOrderStatus,
} from "../mappers/prisma-purchase-order-mapper";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class PrismaPurchaseOrderRepository implements IPurchaseOrderRepository {
  private getClient(txClient?: unknown) {
    return (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
  }

  async findById(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<PurchaseOrder | null> {
    const prisma = this.getClient(txClient);
    const row = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return row ? toDomainPurchaseOrder(row) : null;
  }

  async findByNumber(
    organizationId: string,
    orderNumber: string,
    txClient?: unknown,
  ): Promise<PurchaseOrder | null> {
    const prisma = this.getClient(txClient);
    const row = await prisma.purchaseOrder.findUnique({
      where: {
        organizationId_orderNumber: { organizationId, orderNumber },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return row ? toDomainPurchaseOrder(row) : null;
  }

  async listWithFilters(
    organizationId: string,
    filters?: ListPurchaseOrdersFilters,
  ): Promise<ListPurchaseOrdersResult> {
    const prisma = getPrisma();
    const where: Prisma.PurchaseOrderWhereInput = { organizationId };

    if (filters?.status && filters.status !== "ALL") {
      where.status = toPrismaPurchaseOrderStatus(filters.status);
    }

    if (filters?.query && filters.query.trim().length > 0) {
      const q = filters.query.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { supplierName: { contains: q, mode: "insensitive" } },
        { referenceNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.from || filters?.to) {
      where.orderDate = {
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
      prisma.purchaseOrder.findMany({
        where,
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { orderDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where: { organizationId },
        select: {
          id: true,
          status: true,
          total: true,
        },
      }),
    ]);

    const orders = rows.map(toDomainPurchaseOrder);

    let totalAmount = 0;
    let confirmedCount = 0;
    let confirmedAmount = 0;
    let receivedCount = 0;

    for (const r of allOrgRows) {
      const amt = Number(r.total);
      totalAmount += amt;

      if (r.status === "CONFIRMED" || r.status === "PARTIALLY_RECEIVED") {
        confirmedCount++;
        confirmedAmount += amt;
      }
      if (r.status === "RECEIVED") {
        receivedCount++;
      }
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      orders,
      metrics: {
        totalOrders: allOrgRows.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        confirmedCount,
        confirmedAmount: Math.round(confirmedAmount * 100) / 100,
        receivedCount,
      },
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  async create(
    organizationId: string,
    input: CreatePurchaseOrderInput,
    txClient?: unknown,
  ): Promise<PurchaseOrder> {
    const prisma = this.getClient(txClient);

    const totals = calculatePurchaseOrderTotals({
      items: input.items,
      taxMode: input.taxMode,
      additionalCharges: input.additionalCharges || 0,
      additionalDiscount: input.additionalDiscount || 0,
      additionalDiscountType: input.additionalDiscountType || "fixed",
    });

    const purchaseOrderId = `po_${crypto.randomUUID()}`;

    const lineItemsData = input.items.map((it, idx) => {
      const qty = it.quantity;
      const price = it.unitPrice;
      const disc = it.discount || 0;
      const rate = it.taxRate ?? 0;
      const received = it.receivedQuantity || 0;

      const gross = qty * price;
      const discAmt = gross * (disc / 100);
      const taxable = Math.max(0, gross - discAmt);
      const taxAmt = taxable * (rate / 100);
      const lineTotal = taxable + taxAmt;

      return {
        id: `po_item_${crypto.randomUUID()}`,
        productId: it.productId || null,
        item: it.item,
        description: it.description || null,
        hsnSac: it.hsnSac || null,
        unit: it.unit || null,
        quantity: new Prisma.Decimal(qty),
        receivedQuantity: new Prisma.Decimal(received),
        unitPrice: new Prisma.Decimal(price),
        discount: new Prisma.Decimal(disc),
        taxRate: new Prisma.Decimal(rate),
        taxableAmount: new Prisma.Decimal(Math.round(taxable * 100) / 100),
        taxAmount: new Prisma.Decimal(Math.round(taxAmt * 100) / 100),
        lineTotal: new Prisma.Decimal(Math.round(lineTotal * 100) / 100),
        sortOrder: it.sortOrder !== undefined ? it.sortOrder : idx,
      };
    });

    const row = await prisma.purchaseOrder.create({
      data: {
        id: purchaseOrderId,
        organizationId,
        orderNumber: input.orderNumber,
        supplierId: input.supplierId || null,
        supplierName: input.supplierName,
        supplierEmail: input.supplierEmail || null,
        supplierAddress: input.supplierAddress || null,
        supplierGstin: input.supplierGstin || null,
        supplierPlaceOfSupply: input.supplierPlaceOfSupply || null,
        orderDate: input.orderDate,
        expectedDeliveryDate: input.expectedDeliveryDate || null,
        referenceNumber: input.referenceNumber || null,
        status: toPrismaPurchaseOrderStatus(input.status),
        taxMode: input.taxMode,
        currency: input.currency || "INR (₹)",
        paymentTerms: input.paymentTerms || null,
        subtotal: new Prisma.Decimal(totals.subtotal),
        lineDiscountTotal: new Prisma.Decimal(totals.lineDiscountTotal),
        additionalDiscount: new Prisma.Decimal(
          totals.effectiveAdditionalDiscount,
        ),
        additionalDiscountType: input.additionalDiscountType || "fixed",
        additionalDiscountLabel: input.additionalDiscountLabel || null,
        additionalCharges: new Prisma.Decimal(totals.additionalCharges),
        additionalChargesLabel: input.additionalChargesLabel || null,
        taxableAmount: new Prisma.Decimal(totals.taxableAmount),
        cgst: new Prisma.Decimal(totals.cgst),
        sgst: new Prisma.Decimal(totals.sgst),
        igst: new Prisma.Decimal(totals.igst),
        totalTax: new Prisma.Decimal(totals.totalTax),
        total: new Prisma.Decimal(totals.total),
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

    return toDomainPurchaseOrder(row);
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdatePurchaseOrderInput,
    txClient?: unknown,
  ): Promise<PurchaseOrder> {
    const prisma = this.getClient(txClient);

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!existing) {
      throw new Error(`Purchase Order ${id} not found.`);
    }

    const effectiveItems = input.items || existing.items.map((it) => ({
      productId: it.productId,
      item: it.item,
      description: it.description,
      hsnSac: it.hsnSac,
      quantity: Number(it.quantity),
      receivedQuantity: Number(it.receivedQuantity),
      unitPrice: Number(it.unitPrice),
      discount: Number(it.discount),
      taxRate: Number(it.taxRate),
      sortOrder: it.sortOrder,
    }));

    const taxMode = input.taxMode || (existing.taxMode as "CGST_SGST" | "IGST");
    const totals = calculatePurchaseOrderTotals({
      items: effectiveItems,
      taxMode,
      additionalCharges:
        input.additionalCharges !== undefined
          ? input.additionalCharges
          : Number(existing.additionalCharges),
      additionalDiscount:
        input.additionalDiscount !== undefined
          ? input.additionalDiscount
          : Number(existing.additionalDiscount),
      additionalDiscountType:
        input.additionalDiscountType ||
        (existing.additionalDiscountType as "fixed" | "percentage"),
    });

    if (input.items) {
      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id },
      });
    }

    const row = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...(input.orderNumber && { orderNumber: input.orderNumber }),
        ...(input.supplierId !== undefined && { supplierId: input.supplierId }),
        ...(input.supplierName && { supplierName: input.supplierName }),
        ...(input.supplierEmail !== undefined && {
          supplierEmail: input.supplierEmail,
        }),
        ...(input.supplierAddress !== undefined && {
          supplierAddress: input.supplierAddress,
        }),
        ...(input.supplierGstin !== undefined && {
          supplierGstin: input.supplierGstin,
        }),
        ...(input.supplierPlaceOfSupply !== undefined && {
          supplierPlaceOfSupply: input.supplierPlaceOfSupply,
        }),
        ...(input.orderDate && { orderDate: input.orderDate }),
        ...(input.expectedDeliveryDate !== undefined && {
          expectedDeliveryDate: input.expectedDeliveryDate,
        }),
        ...(input.referenceNumber !== undefined && {
          referenceNumber: input.referenceNumber,
        }),
        ...(input.status && { status: toPrismaPurchaseOrderStatus(input.status) }),
        taxMode,
        ...(input.paymentTerms !== undefined && {
          paymentTerms: input.paymentTerms,
        }),
        subtotal: new Prisma.Decimal(totals.subtotal),
        lineDiscountTotal: new Prisma.Decimal(totals.lineDiscountTotal),
        additionalDiscount: new Prisma.Decimal(totals.effectiveAdditionalDiscount),
        ...(input.additionalDiscountType && {
          additionalDiscountType: input.additionalDiscountType,
        }),
        ...(input.additionalDiscountLabel !== undefined && {
          additionalDiscountLabel: input.additionalDiscountLabel,
        }),
        additionalCharges: new Prisma.Decimal(totals.additionalCharges),
        ...(input.additionalChargesLabel !== undefined && {
          additionalChargesLabel: input.additionalChargesLabel,
        }),
        taxableAmount: new Prisma.Decimal(totals.taxableAmount),
        cgst: new Prisma.Decimal(totals.cgst),
        sgst: new Prisma.Decimal(totals.sgst),
        igst: new Prisma.Decimal(totals.igst),
        totalTax: new Prisma.Decimal(totals.totalTax),
        total: new Prisma.Decimal(totals.total),
        ...(input.notes !== undefined && { notes: input.notes }),
        ...(input.terms !== undefined && { terms: input.terms }),
        ...(input.items && {
          items: {
            create: input.items.map((it, idx) => {
              const qty = it.quantity;
              const price = it.unitPrice;
              const disc = it.discount || 0;
              const rate = it.taxRate ?? 0;
              const received = it.receivedQuantity || 0;

              const gross = qty * price;
              const discAmt = gross * (disc / 100);
              const taxable = Math.max(0, gross - discAmt);
              const taxAmt = taxable * (rate / 100);
              const lineTotal = taxable + taxAmt;

              return {
                id: `po_item_${crypto.randomUUID()}`,
                productId: it.productId || null,
                item: it.item,
                description: it.description || null,
                hsnSac: it.hsnSac || null,
                unit: it.unit || null,
                quantity: new Prisma.Decimal(qty),
                receivedQuantity: new Prisma.Decimal(received),
                unitPrice: new Prisma.Decimal(price),
                discount: new Prisma.Decimal(disc),
                taxRate: new Prisma.Decimal(rate),
                taxableAmount: new Prisma.Decimal(
                  Math.round(taxable * 100) / 100,
                ),
                taxAmount: new Prisma.Decimal(Math.round(taxAmt * 100) / 100),
                lineTotal: new Prisma.Decimal(Math.round(lineTotal * 100) / 100),
                sortOrder: it.sortOrder !== undefined ? it.sortOrder : idx,
              };
            }),
          },
        }),
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return toDomainPurchaseOrder(row);
  }

  async delete(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<void> {
    const prisma = this.getClient(txClient);
    await prisma.purchaseOrder.deleteMany({
      where: { id, organizationId },
    });
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: PurchaseOrderStatus,
    txClient?: unknown,
  ): Promise<PurchaseOrder> {
    const prisma = this.getClient(txClient);
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error(`Purchase Order ${id} not found.`);
    }

    const row = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: toPrismaPurchaseOrderStatus(status),
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return toDomainPurchaseOrder(row);
  }

  async updateItemReceiving(
    organizationId: string,
    purchaseOrderId: string,
    itemsToUpdate: Array<{ id: string; receivedQuantity: number }>,
    txClient?: unknown,
  ): Promise<PurchaseOrder> {
    const prisma = this.getClient(txClient);

    const owned = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId },
      include: { items: { select: { id: true } } },
    });

    if (!owned) {
      throw new Error(`Purchase Order ${purchaseOrderId} not found.`);
    }

    const ownedItemIds = new Set(owned.items.map((it) => it.id));
    for (const it of itemsToUpdate) {
      if (!ownedItemIds.has(it.id)) {
        throw new Error(
          `Line item "${it.id}" does not belong to purchase order "${purchaseOrderId}".`,
        );
      }
    }

    for (const it of itemsToUpdate) {
      await prisma.purchaseOrderItem.update({
        where: { id: it.id },
        data: {
          receivedQuantity: new Prisma.Decimal(Math.max(0, it.receivedQuantity)),
        },
      });
    }

    const fresh = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, organizationId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!fresh) {
      throw new Error(`Purchase Order ${purchaseOrderId} not found.`);
    }

    // Evaluate overall receiving state
    let totalQty = 0;
    let totalReceived = 0;
    for (const line of fresh.items) {
      totalQty += Number(line.quantity);
      totalReceived += Number(line.receivedQuantity);
    }

    let nextStatus = fresh.status;
    if (totalReceived >= totalQty && totalQty > 0) {
      nextStatus = "RECEIVED";
    } else if (totalReceived > 0) {
      nextStatus = "PARTIALLY_RECEIVED";
    }

    if (nextStatus !== fresh.status) {
      const updated = await prisma.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: { status: nextStatus },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
      });
      return toDomainPurchaseOrder(updated);
    }

    return toDomainPurchaseOrder(fresh);
  }
}

export const purchaseOrderRepository = new PrismaPurchaseOrderRepository();
