import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type {
  SalesReturn,
  SalesReturnStatus,
  ReturnableInvoice,
  ReturnableInvoiceItem,
} from "../../domain/entities/sales-return";
import type {
  ISalesReturnRepository,
  SalesReturnFilter,
  CreateSalesReturnInput,
  UpdateSalesReturnStatusInput,
} from "../../domain/repositories/sales-return-repository";
import {
  assertValidReturnStatusTransition,
  assertReturnableQuantity,
  assertReceivableQuantity,
  calculateRemainingReturnableQuantity,
  calculateReturnTotals,
  calculateReturnLineTotals,
} from "../../domain/rules/sales-return-rules";
import {
  SalesReturnNotFoundError,
  SalesReturnDomainError,
} from "../../domain/errors/sales-return-errors";
import { toDomainSalesReturn } from "../mappers/prisma-sales-return-mapper";
import { salesSettingsRepository } from "@/features/sales-settings";
import { billingSettingsRepository } from "@/features/billing-settings";

export class PrismaSalesReturnRepository implements ISalesReturnRepository {
  async findMany(
    organizationId: string,
    filter?: SalesReturnFilter,
  ): Promise<SalesReturn[]> {
    const prisma = getPrisma();
    const where: Prisma.SalesReturnWhereInput = {
      organizationId,
      ...(filter?.status && { status: filter.status }),
      ...(filter?.customerId && { customerId: filter.customerId }),
      ...(filter?.invoiceId && { invoiceId: filter.invoiceId }),
      ...(filter?.salesOrderId && { salesOrderId: filter.salesOrderId }),
      ...(filter?.startDate || filter?.endDate
        ? {
            returnDate: {
              ...(filter.startDate && { gte: filter.startDate }),
              ...(filter.endDate && { lte: filter.endDate }),
            },
          }
        : {}),
      ...(filter?.search
        ? {
            OR: [
              { returnNumber: { contains: filter.search, mode: "insensitive" } },
              { customerName: { contains: filter.search, mode: "insensitive" } },
              { reason: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const rows = await prisma.salesReturn.findMany({
      where,
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        invoice: {
          select: { invoiceNumber: true },
        },
        salesOrder: {
          select: { orderNumber: true },
        },
        creditNote: {
          select: { creditNoteNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map(toDomainSalesReturn);
  }

  async findById(id: string, organizationId: string): Promise<SalesReturn | null> {
    const prisma = getPrisma();
    const row = await prisma.salesReturn.findFirst({
      where: { id, organizationId },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        invoice: {
          select: { invoiceNumber: true },
        },
        salesOrder: {
          select: { orderNumber: true },
        },
        creditNote: {
          select: { creditNoteNumber: true },
        },
      },
    });

    return row ? toDomainSalesReturn(row) : null;
  }

  async create(
    organizationId: string,
    input: CreateSalesReturnInput,
  ): Promise<SalesReturn> {
    const prisma = getPrisma();

    return prisma.$transaction(async (tx) => {
      // 1. If linked to an invoice, validate items against authoritative remaining returnable quantities
      if (input.invoiceId) {
        const inv = await tx.invoice.findFirst({
          where: { id: input.invoiceId, organizationId },
          include: { items: true },
        });

        if (!inv) {
          throw new SalesReturnDomainError(
            `Referenced invoice was not found in this organization.`,
          );
        }

        for (const itemInput of input.items) {
          if (itemInput.invoiceItemId) {
            const invItem = inv.items.find(
              (ii) => ii.id === itemInput.invoiceItemId,
            );
            if (!invItem) {
              throw new SalesReturnDomainError(
                `Invoice item '${itemInput.item}' is not part of the referenced invoice.`,
              );
            }

            // Sum already returned quantities on non-cancelled returns
            const existingReturnedAgg = await tx.salesReturnItem.aggregate({
              _sum: { returnQuantity: true },
              where: {
                invoiceItemId: itemInput.invoiceItemId,
                salesReturn: {
                  organizationId,
                  status: { not: "CANCELLED" },
                },
              },
            });

            const prevReturned = Number(
              existingReturnedAgg._sum.returnQuantity ?? 0,
            );
            const remaining = calculateRemainingReturnableQuantity(
              Number(invItem.quantity),
              prevReturned,
            );

            assertReturnableQuantity(
              itemInput.item,
              itemInput.returnQuantity,
              remaining,
            );
          }
        }
      }

      // 2. If linked to a sales order, verify it belongs to this organization
      if (input.salesOrderId) {
        const so = await tx.salesOrder.findFirst({
          where: { id: input.salesOrderId, organizationId },
          select: { id: true },
        });

        if (!so) {
          throw new SalesReturnDomainError(
            `Referenced sales order was not found in this organization.`,
          );
        }
      }

      // 3. Calculate authoritative totals
      const totals = calculateReturnTotals(input.items);

      // 4. Allocate return sequence number atomically
      const { allocatedNumber } =
        await salesSettingsRepository.allocateNextSalesReturnNumber(
          organizationId,
          tx,
        );

      const returnId = `sr_${crypto.randomUUID()}`;

      const created = await tx.salesReturn.create({
        data: {
          id: returnId,
          organizationId,
          returnNumber: allocatedNumber,
          customerId: input.customerId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerAddress: input.customerAddress,
          customerGstin: input.customerGstin,
          customerPlaceOfSupply: input.customerPlaceOfSupply,
          invoiceId: input.invoiceId,
          salesOrderId: input.salesOrderId,
          returnDate: input.returnDate,
          reason: input.reason,
          status: "DRAFT",
          taxMode: input.taxMode || "CGST_SGST",
          currency: input.currency || "INR (₹)",
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          totalAmount: totals.totalAmount,
          notes: input.notes,
          items: {
            create: input.items.map((it, idx) => {
              const lineTotals = calculateReturnLineTotals({
                quantity: it.returnQuantity,
                unitPrice: it.unitPrice,
                discount: it.discount,
                taxRate: it.taxRate,
              });

              return {
                id: `sri_${crypto.randomUUID()}`,
                productId: it.productId,
                invoiceItemId: it.invoiceItemId,
                item: it.item,
                description: it.description,
                hsnSac: it.hsnSac,
                soldQuantity: it.soldQuantity,
                returnQuantity: it.returnQuantity,
                receivedQuantity: it.receivedQuantity ?? 0,
                unitPrice: it.unitPrice,
                discount: it.discount ?? 0,
                taxRate: it.taxRate ?? 18,
                taxAmount: lineTotals.taxAmount,
                lineTotal: lineTotals.lineTotal,
                disposition: it.disposition || "RESTOCK",
                reason: it.reason,
                sortOrder: it.sortOrder ?? idx,
              };
            }),
          },
        },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
          invoice: {
            select: { invoiceNumber: true },
          },
          salesOrder: {
            select: { orderNumber: true },
          },
          creditNote: {
            select: { creditNoteNumber: true },
          },
        },
      });

      return toDomainSalesReturn(created);
    });
  }

  async updateStatus(
    id: string,
    organizationId: string,
    input: UpdateSalesReturnStatusInput,
  ): Promise<SalesReturn> {
    const prisma = getPrisma();

    return prisma.$transaction(async (tx) => {
      const existing = await tx.salesReturn.findFirst({
        where: { id, organizationId },
        include: { items: true },
      });

      if (!existing) {
        throw new SalesReturnNotFoundError(id);
      }

      assertValidReturnStatusTransition(
        existing.status as SalesReturnStatus,
        input.status as SalesReturnStatus,
      );

      // Update receivedQuantity and disposition on items if provided
      if (input.receivedQuantities || input.dispositions) {
        for (const it of existing.items) {
          const recQty = input.receivedQuantities?.[it.id];
          const disp = input.dispositions?.[it.id];
          if (recQty !== undefined) {
            assertReceivableQuantity(
              it.item,
              recQty,
              Number(it.returnQuantity),
            );
          }
          if (recQty !== undefined || disp !== undefined) {
            await tx.salesReturnItem.update({
              where: { id: it.id },
              data: {
                ...(recQty !== undefined && { receivedQuantity: recQty }),
                ...(disp !== undefined && { disposition: disp }),
              },
            });
          }
        }
      }

      let generatedCreditNoteId: string | null = existing.creditNoteId;

      // When completing, if credit note creation is requested and not yet created
      if (
        input.status === "COMPLETED" &&
        input.createCreditNote &&
        !existing.creditNoteId &&
        existing.invoiceId
      ) {
        const inv = await tx.invoice.findFirst({
          where: { id: existing.invoiceId, organizationId },
          include: { items: true },
        });

        if (inv) {
          // Allocate Credit Note Number
          const { allocatedNumber: cnNumber } =
            await billingSettingsRepository.allocateNextNumber(
              organizationId,
              "CREDIT_NOTE",
              tx,
            );

          const cnId = `cn_${crypto.randomUUID()}`;

          // Calculate CGST, SGST, IGST split based on taxMode
          const isInterState = existing.taxMode === "IGST";
          const totalTax = Number(existing.taxAmount);
          const cgst = isInterState ? 0 : Number((totalTax / 2).toFixed(2));
          const sgst = isInterState ? 0 : Number((totalTax - cgst).toFixed(2));
          const igst = isInterState ? totalTax : 0;

          await tx.creditNote.create({
            data: {
              id: cnId,
              organizationId,
              creditNoteNumber: cnNumber,
              invoiceId: existing.invoiceId,
              customerId: existing.customerId,
              customerName: existing.customerName,
              customerEmail: existing.customerEmail,
              customerAddress: existing.customerAddress,
              customerGstin: existing.customerGstin,
              customerPlaceOfSupply: existing.customerPlaceOfSupply,
              issueDate: new Date(),
              status: "ISSUED",
              reason: `Sales Return Adjustment - ${existing.returnNumber}: ${existing.reason}`,
              taxMode: existing.taxMode,
              currency: existing.currency,
              subtotal: existing.subtotal,
              lineDiscountTotal: 0,
              taxableAmount: existing.subtotal,
              cgst,
              sgst,
              igst,
              totalTax: existing.taxAmount,
              total: existing.totalAmount,
              notes: `Credit Note issued for approved Sales Return ${existing.returnNumber}.`,
              items: {
                create: existing.items.map((it, idx) => ({
                  id: `cni_${crypto.randomUUID()}`,
                  invoiceItemId: it.invoiceItemId,
                  productId: it.productId,
                  item: it.item,
                  description: it.description,
                  hsnSac: it.hsnSac,
                  quantity: it.returnQuantity,
                  unitPrice: it.unitPrice,
                  discount: it.discount,
                  taxRate: it.taxRate,
                  taxableAmount: Number(
                    (
                      Number(it.returnQuantity) *
                      Number(it.unitPrice) *
                      (1 - Number(it.discount) / 100)
                    ).toFixed(2),
                  ),
                  taxAmount: it.taxAmount,
                  lineTotal: it.lineTotal,
                  sortOrder: idx,
                })),
              },
            },
          });

          generatedCreditNoteId = cnId;
        }
      }

      const updated = await tx.salesReturn.update({
        where: { id },
        data: {
          status: input.status,
          ...(generatedCreditNoteId && { creditNoteId: generatedCreditNoteId }),
        },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
          invoice: {
            select: { invoiceNumber: true },
          },
          salesOrder: {
            select: { orderNumber: true },
          },
          creditNote: {
            select: { creditNoteNumber: true },
          },
        },
      });

      return toDomainSalesReturn(updated);
    });
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const prisma = getPrisma();
    const existing = await prisma.salesReturn.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new SalesReturnNotFoundError(id);
    }

    if (existing.status !== "DRAFT") {
      throw new SalesReturnDomainError(
        `Cannot delete sales return in '${existing.status}' status. Only DRAFT returns can be deleted.`,
      );
    }

    await prisma.salesReturn.delete({
      where: { id },
    });

    return true;
  }

  async getReturnableInvoices(
    organizationId: string,
  ): Promise<ReturnableInvoice[]> {
    const prisma = getPrisma();
    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId,
        status: { notIn: ["DRAFT", "CANCELLED"] },
      },
      include: {
        items: {
          include: {
            product: { select: { unit: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { issueDate: "desc" },
    });

    const result: ReturnableInvoice[] = [];

    for (const inv of invoices) {
      const returnableItems: ReturnableInvoiceItem[] = [];

      for (const item of inv.items) {
        const returnedAgg = await prisma.salesReturnItem.aggregate({
          _sum: { returnQuantity: true },
          where: {
            invoiceItemId: item.id,
            salesReturn: {
              organizationId,
              status: { not: "CANCELLED" },
            },
          },
        });

        const prevReturned = Number(
          returnedAgg._sum.returnQuantity ?? 0,
        );
        const remaining = calculateRemainingReturnableQuantity(
          Number(item.quantity),
          prevReturned,
        );

        returnableItems.push({
          id: item.id,
          productId: item.productId,
          item: item.item,
          description: item.description,
          hsnSac: item.hsnSac,
          soldQuantity: Number(item.quantity),
          previouslyReturnedQuantity: prevReturned,
          remainingReturnableQuantity: remaining,
          unitPrice: Number(item.unitPrice),
          discount: Number(item.discount),
          taxRate: Number(item.taxRate),
          unit: item.product?.unit || "PCS",
        });
      }

      // Include invoice if at least one item has remaining returnable quantity > 0
      const hasRemaining = returnableItems.some(
        (it) => it.remainingReturnableQuantity > 0,
      );

      if (hasRemaining) {
        result.push({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.issueDate,
          customerId: inv.customerId,
          customerName: inv.customerName,
          customerEmail: inv.customerEmail,
          customerAddress: inv.customerAddress,
          customerGstin: inv.customerGstin,
          customerPlaceOfSupply: inv.customerPlaceOfSupply,
          taxMode: inv.taxMode,
          currency: inv.currency,
          items: returnableItems,
        });
      }
    }

    return result;
  }

  async getReturnableInvoiceById(
    invoiceId: string,
    organizationId: string,
  ): Promise<ReturnableInvoice | null> {
    const prisma = getPrisma();
    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        items: {
          include: {
            product: { select: { unit: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!inv) return null;

    const returnableItems: ReturnableInvoiceItem[] = [];

    for (const item of inv.items) {
      const returnedAgg = await prisma.salesReturnItem.aggregate({
        _sum: { returnQuantity: true },
        where: {
          invoiceItemId: item.id,
          salesReturn: {
            organizationId,
            status: { not: "CANCELLED" },
          },
        },
      });

      const prevReturned = Number(
        returnedAgg._sum.returnQuantity ?? 0,
      );
      const remaining = calculateRemainingReturnableQuantity(
        Number(item.quantity),
        prevReturned,
      );

      returnableItems.push({
        id: item.id,
        productId: item.productId,
        item: item.item,
        description: item.description,
        hsnSac: item.hsnSac,
        soldQuantity: Number(item.quantity),
        previouslyReturnedQuantity: prevReturned,
        remainingReturnableQuantity: remaining,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount),
        taxRate: Number(item.taxRate),
        unit: item.product?.unit || "PCS",
      });
    }

    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.issueDate,
      customerId: inv.customerId,
      customerName: inv.customerName,
      customerEmail: inv.customerEmail,
      customerAddress: inv.customerAddress,
      customerGstin: inv.customerGstin,
      customerPlaceOfSupply: inv.customerPlaceOfSupply,
      taxMode: inv.taxMode,
      currency: inv.currency,
      items: returnableItems,
    };
  }
}

export const salesReturnRepository = new PrismaSalesReturnRepository();
