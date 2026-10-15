import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type { SalesOrder, SalesOrderStatus } from "../../domain/entities/sales-order";
import { calculateSalesOrderTotals } from "../../domain/rules/sales-order-rules";
import type {
  ISalesOrderRepository,
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
  ListSalesOrdersFilters,
  ListSalesOrdersResult,
} from "../../domain/repositories/sales-order-repository";
import {
  toDomainSalesOrder,
  toPrismaSalesOrderStatus,
} from "../mappers/prisma-sales-order-mapper";

export class PrismaSalesOrderRepository implements ISalesOrderRepository {
  private getClient(txClient?: unknown) {
    return (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
  }

  async findById(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<SalesOrder | null> {
    const prisma = this.getClient(txClient);
    const row = await prisma.salesOrder.findFirst({
      where: { id, organizationId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        sourceEstimate: true,
        invoices: { orderBy: { createdAt: "desc" } },
      },
    });

    return row ? toDomainSalesOrder(row) : null;
  }

  async findByNumber(
    organizationId: string,
    orderNumber: string,
    txClient?: unknown,
  ): Promise<SalesOrder | null> {
    const prisma = this.getClient(txClient);
    const row = await prisma.salesOrder.findUnique({
      where: {
        organizationId_orderNumber: { organizationId, orderNumber },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        sourceEstimate: true,
        invoices: { orderBy: { createdAt: "desc" } },
      },
    });

    return row ? toDomainSalesOrder(row) : null;
  }

  async listWithFilters(
    organizationId: string,
    filters?: ListSalesOrdersFilters,
  ): Promise<ListSalesOrdersResult> {
    const prisma = getPrisma();
    const where: Prisma.SalesOrderWhereInput = { organizationId };

    if (filters?.status && filters.status !== "ALL") {
      where.status = toPrismaSalesOrderStatus(filters.status);
    }

    if (filters?.query && filters.query.trim().length > 0) {
      const q = filters.query.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { referenceNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters?.from || filters?.to) {
      where.orderDate = {
        ...(filters.from && { gte: filters.from }),
        ...(filters.to && { lte: filters.to }),
      };
    }

    const [rows, allOrgRows] = await Promise.all([
      prisma.salesOrder.findMany({
        where,
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          sourceEstimate: true,
          invoices: true,
        },
        orderBy: { orderDate: "desc" },
      }),
      prisma.salesOrder.findMany({
        where: { organizationId },
        select: {
          id: true,
          status: true,
          total: true,
          invoices: { select: { id: true, total: true } },
        },
      }),
    ]);

    const orders = rows.map(toDomainSalesOrder);

    let totalAmount = 0;
    let confirmedCount = 0;
    let confirmedAmount = 0;
    let fulfilledCount = 0;
    let invoicedCount = 0;

    for (const r of allOrgRows) {
      const amt = Number(r.total);
      totalAmount += amt;

      if (r.status === "CONFIRMED" || r.status === "PARTIALLY_FULFILLED") {
        confirmedCount++;
        confirmedAmount += amt;
      }
      if (r.status === "FULFILLED") {
        fulfilledCount++;
      }
      if (r.invoices && r.invoices.length > 0) {
        invoicedCount++;
      }
    }

    return {
      orders,
      metrics: {
        totalOrders: allOrgRows.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        confirmedCount,
        confirmedAmount: Math.round(confirmedAmount * 100) / 100,
        fulfilledCount,
        invoicedCount,
      },
    };
  }

  async create(
    organizationId: string,
    input: CreateSalesOrderInput,
    txClient?: unknown,
  ): Promise<SalesOrder> {
    const prisma = this.getClient(txClient);

    const totals = calculateSalesOrderTotals({
      items: input.items,
      taxMode: input.taxMode,
      additionalCharges: input.additionalCharges || 0,
      additionalDiscount: input.additionalDiscount || 0,
      additionalDiscountType: input.additionalDiscountType || "fixed",
    });

    const salesOrderId = `so_${crypto.randomUUID()}`;

    const lineItemsData = input.items.map((it, idx) => {
      const qty = it.quantity;
      const price = it.unitPrice;
      const disc = it.discount || 0;
      const rate = it.taxRate || 0;
      const fulfilled = it.fulfilledQuantity || 0;

      const gross = qty * price;
      const discAmt = gross * (disc / 100);
      const taxable = Math.max(0, gross - discAmt);
      const taxAmt = taxable * (rate / 100);
      const lineTotal = taxable + taxAmt;

      return {
        id: `so_item_${crypto.randomUUID()}`,
        productId: it.productId || null,
        item: it.item,
        description: it.description || null,
        hsnSac: it.hsnSac || null,
        unit: it.unit || null,
        quantity: new Prisma.Decimal(qty),
        fulfilledQuantity: new Prisma.Decimal(fulfilled),
        unitPrice: new Prisma.Decimal(price),
        discount: new Prisma.Decimal(disc),
        taxRate: new Prisma.Decimal(rate),
        taxableAmount: new Prisma.Decimal(Math.round(taxable * 100) / 100),
        taxAmount: new Prisma.Decimal(Math.round(taxAmt * 100) / 100),
        lineTotal: new Prisma.Decimal(Math.round(lineTotal * 100) / 100),
        sortOrder: it.sortOrder !== undefined ? it.sortOrder : idx,
      };
    });

    const row = await prisma.salesOrder.create({
      data: {
        id: salesOrderId,
        organizationId,
        orderNumber: input.orderNumber,
        customerId: input.customerId || null,
        customerName: input.customerName,
        customerEmail: input.customerEmail || null,
        customerAddress: input.customerAddress || null,
        customerGstin: input.customerGstin || null,
        customerPlaceOfSupply: input.customerPlaceOfSupply || null,
        orderDate: input.orderDate,
        expectedDeliveryDate: input.expectedDeliveryDate || null,
        referenceNumber: input.referenceNumber || null,
        status: toPrismaSalesOrderStatus(input.status),
        taxMode: input.taxMode,
        currency: input.currency || "INR (₹)",
        subtotal: new Prisma.Decimal(totals.subtotal),
        lineDiscountTotal: new Prisma.Decimal(totals.lineDiscountTotal),
        additionalDiscount: new Prisma.Decimal(totals.effectiveAdditionalDiscount),
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
        sourceEstimate: true,
        invoices: true,
      },
    });

    if (input.sourceEstimateId) {
      const linkResult = await prisma.estimate.updateMany({
        where: { id: input.sourceEstimateId, organizationId },
        data: {
          convertedToSalesOrderId: salesOrderId,
          status: "CONVERTED",
          convertedAt: new Date(),
        },
      });

      if (linkResult.count === 0) {
        throw new Error(
          `Source estimate "${input.sourceEstimateId}" was not found in this organization.`,
        );
      }
    }

    return toDomainSalesOrder(row);
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdateSalesOrderInput,
    txClient?: unknown,
  ): Promise<SalesOrder> {
    const prisma = this.getClient(txClient);

    const existing = await prisma.salesOrder.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!existing) {
      throw new Error(`Sales Order ${id} not found.`);
    }

    const effectiveItems = input.items || existing.items.map((it) => ({
      productId: it.productId,
      item: it.item,
      description: it.description,
      hsnSac: it.hsnSac,
      quantity: Number(it.quantity),
      fulfilledQuantity: Number(it.fulfilledQuantity),
      unitPrice: Number(it.unitPrice),
      discount: Number(it.discount),
      taxRate: Number(it.taxRate),
      sortOrder: it.sortOrder,
    }));

    const taxMode = input.taxMode || (existing.taxMode as "CGST_SGST" | "IGST");
    const totals = calculateSalesOrderTotals({
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
      await prisma.salesOrderItem.deleteMany({
        where: { salesOrderId: id },
      });
    }

    const row = await prisma.salesOrder.update({
      where: { id },
      data: {
        ...(input.orderNumber && { orderNumber: input.orderNumber }),
        ...(input.customerId !== undefined && { customerId: input.customerId }),
        ...(input.customerName && { customerName: input.customerName }),
        ...(input.customerEmail !== undefined && { customerEmail: input.customerEmail }),
        ...(input.customerAddress !== undefined && { customerAddress: input.customerAddress }),
        ...(input.customerGstin !== undefined && { customerGstin: input.customerGstin }),
        ...(input.customerPlaceOfSupply !== undefined && {
          customerPlaceOfSupply: input.customerPlaceOfSupply,
        }),
        ...(input.orderDate && { orderDate: input.orderDate }),
        ...(input.expectedDeliveryDate !== undefined && {
          expectedDeliveryDate: input.expectedDeliveryDate,
        }),
        ...(input.referenceNumber !== undefined && {
          referenceNumber: input.referenceNumber,
        }),
        ...(input.status && { status: toPrismaSalesOrderStatus(input.status) }),
        taxMode,
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
              const rate = it.taxRate || 0;
              const fulfilled = it.fulfilledQuantity || 0;

              const gross = qty * price;
              const discAmt = gross * (disc / 100);
              const taxable = Math.max(0, gross - discAmt);
              const taxAmt = taxable * (rate / 100);
              const lineTotal = taxable + taxAmt;

              return {
                id: `so_item_${crypto.randomUUID()}`,
                productId: it.productId || null,
                item: it.item,
                description: it.description || null,
                hsnSac: it.hsnSac || null,
                unit: it.unit || null,
                quantity: new Prisma.Decimal(qty),
                fulfilledQuantity: new Prisma.Decimal(fulfilled),
                unitPrice: new Prisma.Decimal(price),
                discount: new Prisma.Decimal(disc),
                taxRate: new Prisma.Decimal(rate),
                taxableAmount: new Prisma.Decimal(Math.round(taxable * 100) / 100),
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
        sourceEstimate: true,
        invoices: true,
      },
    });

    return toDomainSalesOrder(row);
  }

  async delete(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<void> {
    const prisma = this.getClient(txClient);
    await prisma.salesOrder.deleteMany({
      where: { id, organizationId },
    });
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: SalesOrderStatus,
    txClient?: unknown,
  ): Promise<SalesOrder> {
    const prisma = this.getClient(txClient);
    const existing = await prisma.salesOrder.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error(`Sales Order ${id} not found.`);
    }

    const row = await prisma.salesOrder.update({
      where: { id },
      data: {
        status: toPrismaSalesOrderStatus(status),
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        sourceEstimate: true,
        invoices: true,
      },
    });

    return toDomainSalesOrder(row);
  }

  async updateItemFulfilment(
    organizationId: string,
    salesOrderId: string,
    itemsToUpdate: Array<{ id: string; fulfilledQuantity: number }>,
    txClient?: unknown,
  ): Promise<SalesOrder> {
    const prisma = this.getClient(txClient);

    const owned = await prisma.salesOrder.findFirst({
      where: { id: salesOrderId, organizationId },
      include: { items: { select: { id: true } } },
    });

    if (!owned) {
      throw new Error(`Sales Order ${salesOrderId} not found.`);
    }

    const ownedItemIds = new Set(owned.items.map((it) => it.id));
    for (const it of itemsToUpdate) {
      if (!ownedItemIds.has(it.id)) {
        throw new Error(
          `Line item "${it.id}" does not belong to sales order "${salesOrderId}".`,
        );
      }
    }

    for (const it of itemsToUpdate) {
      await prisma.salesOrderItem.update({
        where: { id: it.id },
        data: {
          fulfilledQuantity: new Prisma.Decimal(Math.max(0, it.fulfilledQuantity)),
        },
      });
    }

    const fresh = await prisma.salesOrder.findFirst({
      where: { id: salesOrderId, organizationId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
        sourceEstimate: true,
        invoices: true,
      },
    });

    if (!fresh) {
      throw new Error(`Sales Order ${salesOrderId} not found.`);
    }

    // Evaluate overall fulfilment state
    let totalQty = 0;
    let totalFulfilled = 0;
    for (const line of fresh.items) {
      totalQty += Number(line.quantity);
      totalFulfilled += Number(line.fulfilledQuantity);
    }

    let nextStatus = fresh.status;
    if (totalFulfilled >= totalQty && totalQty > 0) {
      nextStatus = "FULFILLED";
    } else if (totalFulfilled > 0) {
      nextStatus = "PARTIALLY_FULFILLED";
    }

    if (nextStatus !== fresh.status) {
      const updated = await prisma.salesOrder.update({
        where: { id: salesOrderId },
        data: { status: nextStatus },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          sourceEstimate: true,
          invoices: true,
        },
      });
      return toDomainSalesOrder(updated);
    }

    return toDomainSalesOrder(fresh);
  }
}

export const salesOrderRepository = new PrismaSalesOrderRepository();
