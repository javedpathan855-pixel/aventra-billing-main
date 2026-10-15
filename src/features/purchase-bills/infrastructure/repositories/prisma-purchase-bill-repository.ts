import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type {
  PurchaseBill,
  PurchaseBillStatus,
} from "../../domain/entities/purchase-bill";
import { calculatePurchaseBillTotals } from "../../domain/rules/purchase-bill-rules";
import type {
  IPurchaseBillRepository,
  CreatePurchaseBillInput,
  UpdatePurchaseBillInput,
  ListPurchaseBillsFilters,
  ListPurchaseBillsResult,
} from "../../domain/repositories/purchase-bill-repository";
import {
  toDomainPurchaseBill,
  toPrismaPurchaseBillStatus,
} from "../mappers/prisma-purchase-bill-mapper";
import { DuplicateSupplierInvoiceError } from "../../domain/errors/purchase-bill-errors";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const isUniqueViolation = (err: unknown): boolean =>
  (err as { code?: string }).code === "P2002";

const violationTargetsSupplierInvoice = (err: unknown): boolean => {
  const target = (err as { meta?: { target?: unknown } }).meta?.target;
  const text = Array.isArray(target) ? target.join(" ") : String(target ?? "");
  return text.includes("supplierInvoiceNumber");
};

export class PrismaPurchaseBillRepository implements IPurchaseBillRepository {
  private getClient(txClient?: unknown) {
    return (txClient as ReturnType<typeof getPrisma>) ?? getPrisma();
  }

  async findById(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<PurchaseBill | null> {
    const prisma = this.getClient(txClient);
    const row = await prisma.purchaseBill.findFirst({
      where: { id, organizationId },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return row ? toDomainPurchaseBill(row) : null;
  }

  async findByNumber(
    organizationId: string,
    billNumber: string,
    txClient?: unknown,
  ): Promise<PurchaseBill | null> {
    const prisma = this.getClient(txClient);
    const row = await prisma.purchaseBill.findUnique({
      where: {
        organizationId_billNumber: { organizationId, billNumber },
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return row ? toDomainPurchaseBill(row) : null;
  }

  async findBySupplierInvoice(
    organizationId: string,
    supplierId: string,
    supplierInvoiceNumber: string,
    txClient?: unknown,
  ): Promise<PurchaseBill | null> {
    const prisma = this.getClient(txClient);
    const row = await prisma.purchaseBill.findFirst({
      where: { organizationId, supplierId, supplierInvoiceNumber },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return row ? toDomainPurchaseBill(row) : null;
  }

  async listWithFilters(
    organizationId: string,
    filters?: ListPurchaseBillsFilters,
  ): Promise<ListPurchaseBillsResult> {
    const prisma = getPrisma();
    const where: Prisma.PurchaseBillWhereInput = { organizationId };

    if (filters?.status && filters.status !== "ALL") {
      where.status = toPrismaPurchaseBillStatus(filters.status);
    }

    if (filters?.query && filters.query.trim().length > 0) {
      const q = filters.query.trim();
      where.OR = [
        { billNumber: { contains: q, mode: "insensitive" } },
        { supplierName: { contains: q, mode: "insensitive" } },
        { supplierInvoiceNumber: { contains: q, mode: "insensitive" } },
        { purchaseOrderNumber: { contains: q, mode: "insensitive" } },
      ];
    }

    if (filters?.supplierId) {
      where.supplierId = filters.supplierId;
    }

    if (filters?.purchaseOrderId) {
      where.purchaseOrderId = filters.purchaseOrderId;
    }

    if (filters?.from || filters?.to) {
      where.billDate = {
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
      prisma.purchaseBill.findMany({
        where,
        include: {
          items: { orderBy: { sortOrder: "asc" } },
        },
        orderBy: { billDate: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.purchaseBill.count({ where }),
      prisma.purchaseBill.findMany({
        where: { organizationId },
        select: {
          id: true,
          status: true,
          total: true,
        },
      }),
    ]);

    const bills = rows.map(toDomainPurchaseBill);

    let totalAmount = 0;
    let confirmedCount = 0;
    let confirmedAmount = 0;
    let cancelledCount = 0;

    for (const r of allOrgRows) {
      const amt = Number(r.total);
      totalAmount += amt;

      if (r.status === "CONFIRMED") {
        confirmedCount++;
        confirmedAmount += amt;
      }
      if (r.status === "CANCELLED") {
        cancelledCount++;
      }
    }

    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      bills,
      metrics: {
        totalBills: allOrgRows.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        confirmedCount,
        confirmedAmount: Math.round(confirmedAmount * 100) / 100,
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
    input: CreatePurchaseBillInput,
    txClient?: unknown,
  ): Promise<PurchaseBill> {
    const prisma = this.getClient(txClient);

    const totals = calculatePurchaseBillTotals({
      items: input.items,
      taxMode: input.taxMode,
      additionalCharges: input.additionalCharges || 0,
      additionalDiscount: input.additionalDiscount || 0,
      additionalDiscountType: input.additionalDiscountType || "fixed",
    });

    const purchaseBillId = `pb_${crypto.randomUUID()}`;

    const lineItemsData = input.items.map((it, idx) => {
      const qty = it.quantity;
      const price = it.unitPrice;
      const disc = it.discount || 0;
      const rate = it.taxRate ?? 0;

      const gross = qty * price;
      const discAmt = gross * (disc / 100);
      const taxable = Math.max(0, gross - discAmt);
      const taxAmt = taxable * (rate / 100);
      const lineTotal = taxable + taxAmt;

      return {
        id: `pb_item_${crypto.randomUUID()}`,
        productId: it.productId || null,
        item: it.item,
        description: it.description || null,
        hsnSac: it.hsnSac || null,
        unit: it.unit || null,
        quantity: new Prisma.Decimal(qty),
        unitPrice: new Prisma.Decimal(price),
        discount: new Prisma.Decimal(disc),
        taxRate: new Prisma.Decimal(rate),
        taxableAmount: new Prisma.Decimal(Math.round(taxable * 100) / 100),
        taxAmount: new Prisma.Decimal(Math.round(taxAmt * 100) / 100),
        lineTotal: new Prisma.Decimal(Math.round(lineTotal * 100) / 100),
        sortOrder: it.sortOrder !== undefined ? it.sortOrder : idx,
      };
    });

    const row = await prisma.purchaseBill
      .create({
        data: {
          id: purchaseBillId,
          organizationId,
          billNumber: input.billNumber,
          supplierId: input.supplierId || null,
          supplierName: input.supplierName,
          supplierEmail: input.supplierEmail || null,
          supplierAddress: input.supplierAddress || null,
          supplierGstin: input.supplierGstin || null,
          supplierPlaceOfSupply: input.supplierPlaceOfSupply || null,
          supplierInvoiceNumber: input.supplierInvoiceNumber || null,
          supplierInvoiceDate: input.supplierInvoiceDate || null,
          purchaseOrderId: input.purchaseOrderId || null,
          purchaseOrderNumber: input.purchaseOrderNumber || null,
          billDate: input.billDate,
          dueDate: input.dueDate,
          status: toPrismaPurchaseBillStatus(input.status),
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
      })
      .catch((err: unknown) => {
        if (
          isUniqueViolation(err) &&
          violationTargetsSupplierInvoice(err) &&
          input.supplierInvoiceNumber
        ) {
          throw new DuplicateSupplierInvoiceError(
            input.supplierName,
            input.supplierInvoiceNumber,
          );
        }
        if (isUniqueViolation(err)) {
          throw new Error(
            `A purchase bill with number "${input.billNumber}" already exists in this organization.`,
          );
        }
        throw err;
      });

    return toDomainPurchaseBill(row);
  }

  async update(
    organizationId: string,
    id: string,
    input: UpdatePurchaseBillInput,
    txClient?: unknown,
  ): Promise<PurchaseBill> {
    const prisma = this.getClient(txClient);

    const existing = await prisma.purchaseBill.findFirst({
      where: { id, organizationId },
      include: { items: true },
    });

    if (!existing) {
      throw new Error(`Purchase Bill ${id} not found.`);
    }

    const effectiveItems =
      input.items ||
      existing.items.map((it) => ({
        productId: it.productId,
        item: it.item,
        description: it.description,
        hsnSac: it.hsnSac,
        quantity: Number(it.quantity),
        unitPrice: Number(it.unitPrice),
        discount: Number(it.discount),
        taxRate: Number(it.taxRate),
        sortOrder: it.sortOrder,
      }));

    const taxMode = input.taxMode || (existing.taxMode as "CGST_SGST" | "IGST");
    const totals = calculatePurchaseBillTotals({
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
      await prisma.purchaseBillItem.deleteMany({
        where: { purchaseBillId: id },
      });
    }

    const row = await prisma.purchaseBill.update({
      where: { id },
      data: {
        ...(input.billNumber && { billNumber: input.billNumber }),
        ...(input.supplierId !== undefined && {
          supplierId: input.supplierId,
        }),
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
        ...(input.supplierInvoiceNumber !== undefined && {
          supplierInvoiceNumber: input.supplierInvoiceNumber,
        }),
        ...(input.supplierInvoiceDate !== undefined && {
          supplierInvoiceDate: input.supplierInvoiceDate,
        }),
        ...(input.purchaseOrderId !== undefined && {
          purchaseOrderId: input.purchaseOrderId,
        }),
        ...(input.purchaseOrderNumber !== undefined && {
          purchaseOrderNumber: input.purchaseOrderNumber,
        }),
        ...(input.billDate && { billDate: input.billDate }),
        ...(input.dueDate && { dueDate: input.dueDate }),
        ...(input.status && {
          status: toPrismaPurchaseBillStatus(input.status),
        }),
        taxMode,
        ...(input.paymentTerms !== undefined && {
          paymentTerms: input.paymentTerms,
        }),
        subtotal: new Prisma.Decimal(totals.subtotal),
        lineDiscountTotal: new Prisma.Decimal(totals.lineDiscountTotal),
        additionalDiscount: new Prisma.Decimal(
          totals.effectiveAdditionalDiscount,
        ),
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

              const gross = qty * price;
              const discAmt = gross * (disc / 100);
              const taxable = Math.max(0, gross - discAmt);
              const taxAmt = taxable * (rate / 100);
              const lineTotal = taxable + taxAmt;

              return {
                id: `pb_item_${crypto.randomUUID()}`,
                productId: it.productId || null,
                item: it.item,
                description: it.description || null,
                hsnSac: it.hsnSac || null,
                unit: it.unit || null,
                quantity: new Prisma.Decimal(qty),
                unitPrice: new Prisma.Decimal(price),
                discount: new Prisma.Decimal(disc),
                taxRate: new Prisma.Decimal(rate),
                taxableAmount: new Prisma.Decimal(
                  Math.round(taxable * 100) / 100,
                ),
                taxAmount: new Prisma.Decimal(Math.round(taxAmt * 100) / 100),
                lineTotal: new Prisma.Decimal(
                  Math.round(lineTotal * 100) / 100,
                ),
                sortOrder: it.sortOrder !== undefined ? it.sortOrder : idx,
              };
            }),
          },
        }),
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    }).catch((err: unknown) => {
      if (
        isUniqueViolation(err) &&
        violationTargetsSupplierInvoice(err) &&
        input.supplierInvoiceNumber
      ) {
        throw new DuplicateSupplierInvoiceError(
          input.supplierName || "Unknown supplier",
          input.supplierInvoiceNumber,
        );
      }
      if (isUniqueViolation(err)) {
        throw new Error(
          "A purchase bill with this number already exists in this organization.",
        );
      }
      throw err;
    });

    return toDomainPurchaseBill(row);
  }

  async delete(
    organizationId: string,
    id: string,
    txClient?: unknown,
  ): Promise<void> {
    const prisma = this.getClient(txClient);
    await prisma.purchaseBill.deleteMany({
      where: { id, organizationId },
    });
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: PurchaseBillStatus,
    txClient?: unknown,
  ): Promise<PurchaseBill> {
    const prisma = this.getClient(txClient);
    const existing = await prisma.purchaseBill.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!existing) {
      throw new Error(`Purchase Bill ${id} not found.`);
    }

    const row = await prisma.purchaseBill.update({
      where: { id },
      data: {
        status: toPrismaPurchaseBillStatus(status),
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });

    return toDomainPurchaseBill(row);
  }
}

export const purchaseBillRepository = new PrismaPurchaseBillRepository();
