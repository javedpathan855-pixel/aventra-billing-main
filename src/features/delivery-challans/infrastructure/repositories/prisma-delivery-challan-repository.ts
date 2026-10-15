import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/shared/lib/prisma";
import type {
  DeliveryChallan,
  DeliveryChallanStatus,
  DeliverableSalesOrder,
  DeliverableSalesOrderItem,
} from "../../domain/entities/delivery-challan";
import type {
  IDeliveryChallanRepository,
  DeliveryChallanFilter,
  CreateDeliveryChallanInput,
  UpdateDeliveryChallanStatusInput,
} from "../../domain/repositories/delivery-challan-repository";
import {
  assertValidStatusTransition,
  assertDeliverableQuantity,
  calculateRemainingDeliverableQuantity,
  deriveSalesOrderFulfilmentStatus,
} from "../../domain/rules/delivery-challan-rules";
import {
  ChallanNotFoundError,
  DeliveryChallanDomainError,
} from "../../domain/errors/delivery-challan-errors";
import { toDomainDeliveryChallan } from "../mappers/prisma-delivery-challan-mapper";
import { salesSettingsRepository } from "@/features/sales-settings";

export class PrismaDeliveryChallanRepository implements IDeliveryChallanRepository {
  async findMany(
    organizationId: string,
    filter?: DeliveryChallanFilter,
  ): Promise<DeliveryChallan[]> {
    const prisma = getPrisma();
    const where: Prisma.DeliveryChallanWhereInput = {
      organizationId,
      ...(filter?.status && { status: filter.status }),
      ...(filter?.customerId && { customerId: filter.customerId }),
      ...(filter?.salesOrderId && { salesOrderId: filter.salesOrderId }),
      ...(filter?.startDate || filter?.endDate
        ? {
            challanDate: {
              ...(filter.startDate && { gte: filter.startDate }),
              ...(filter.endDate && { lte: filter.endDate }),
            },
          }
        : {}),
      ...(filter?.search
        ? {
            OR: [
              { challanNumber: { contains: filter.search, mode: "insensitive" } },
              { customerName: { contains: filter.search, mode: "insensitive" } },
              { trackingNumber: { contains: filter.search, mode: "insensitive" } },
              { transporterName: { contains: filter.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const rows = await prisma.deliveryChallan.findMany({
      where,
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        salesOrder: {
          select: { orderNumber: true },
        },
        invoice: {
          select: { invoiceNumber: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return rows.map(toDomainDeliveryChallan);
  }

  async findById(
    id: string,
    organizationId: string,
  ): Promise<DeliveryChallan | null> {
    const prisma = getPrisma();
    const row = await prisma.deliveryChallan.findFirst({
      where: { id, organizationId },
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
        },
        salesOrder: {
          select: { orderNumber: true },
        },
        invoice: {
          select: { invoiceNumber: true },
        },
      },
    });

    return row ? toDomainDeliveryChallan(row) : null;
  }

  async create(
    organizationId: string,
    input: CreateDeliveryChallanInput,
  ): Promise<DeliveryChallan> {
    const prisma = getPrisma();

    return prisma.$transaction(async (tx) => {
      // 1. If linked to a sales order, validate items against authoritative remaining deliverable quantities
      if (input.salesOrderId) {
        const order = await tx.salesOrder.findFirst({
          where: { id: input.salesOrderId, organizationId },
          include: { items: true },
        });

        if (!order) {
          throw new DeliveryChallanDomainError(
            `Referenced Sales Order was not found in this organization.`,
          );
        }

        for (const itemInput of input.items) {
          if (itemInput.salesOrderItemId) {
            const orderItem = order.items.find(
              (oi) => oi.id === itemInput.salesOrderItemId,
            );
            if (!orderItem) {
              throw new DeliveryChallanDomainError(
                `Sales order item '${itemInput.item}' is not part of the referenced order.`,
              );
            }

            // Sum already delivered quantities from non-cancelled challans
            const existingDeliveredAgg = await tx.deliveryChallanItem.aggregate({
              _sum: { deliveredQuantity: true },
              where: {
                salesOrderItemId: itemInput.salesOrderItemId,
                challan: {
                  organizationId,
                  status: { not: "CANCELLED" },
                },
              },
            });

            const prevDelivered = Number(
              existingDeliveredAgg._sum.deliveredQuantity ?? 0,
            );
            const remaining = calculateRemainingDeliverableQuantity(
              Number(orderItem.quantity),
              prevDelivered,
            );

            assertDeliverableQuantity(
              itemInput.item,
              itemInput.deliveredQuantity,
              remaining,
            );
          }
        }
      }

      // 2. If linked to an invoice, verify it belongs to this organization
      if (input.invoiceId) {
        const inv = await tx.invoice.findFirst({
          where: { id: input.invoiceId, organizationId },
          select: { id: true },
        });

        if (!inv) {
          throw new DeliveryChallanDomainError(
            `Referenced invoice was not found in this organization.`,
          );
        }
      }

      // 3. Allocate next sequence number atomically
      const { allocatedNumber } =
        await salesSettingsRepository.allocateNextDeliveryChallanNumber(
          organizationId,
          tx,
        );

      const challanId = `dc_${crypto.randomUUID()}`;

      const created = await tx.deliveryChallan.create({
        data: {
          id: challanId,
          organizationId,
          challanNumber: allocatedNumber,
          customerId: input.customerId,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerAddress: input.customerAddress,
          customerGstin: input.customerGstin,
          salesOrderId: input.salesOrderId,
          invoiceId: input.invoiceId,
          challanDate: input.challanDate,
          dispatchDate: input.dispatchDate,
          deliveryDate: input.deliveryDate,
          status: "DRAFT",
          deliveryAddress: input.deliveryAddress,
          transporterName: input.transporterName,
          vehicleNumber: input.vehicleNumber,
          trackingNumber: input.trackingNumber,
          transportMode: input.transportMode,
          deliveryReason: input.deliveryReason || "Supply against Sales Order",
          recipientName: input.recipientName,
          recipientPhone: input.recipientPhone,
          notes: input.notes,
          terms: input.terms,
          items: {
            create: input.items.map((item, idx) => ({
              id: `dci_${crypto.randomUUID()}`,
              salesOrderItemId: item.salesOrderItemId,
              productId: item.productId,
              item: item.item,
              description: item.description,
              hsnSac: item.hsnSac,
              unit: item.unit || "PCS",
              orderedQuantity: item.orderedQuantity,
              deliveredQuantity: item.deliveredQuantity,
              sortOrder: item.sortOrder ?? idx,
            })),
          },
        },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
          salesOrder: {
            select: { orderNumber: true },
          },
          invoice: {
            select: { invoiceNumber: true },
          },
        },
      });

      return toDomainDeliveryChallan(created);
    });
  }

  async updateStatus(
    id: string,
    organizationId: string,
    input: UpdateDeliveryChallanStatusInput,
  ): Promise<DeliveryChallan> {
    const prisma = getPrisma();

    return prisma.$transaction(async (tx) => {
      const existing = await tx.deliveryChallan.findFirst({
        where: { id, organizationId },
        include: { items: true },
      });

      if (!existing) {
        throw new ChallanNotFoundError(id);
      }

      assertValidStatusTransition(
        existing.status as DeliveryChallanStatus,
        input.status as DeliveryChallanStatus,
      );

      const updated = await tx.deliveryChallan.update({
        where: { id },
        data: {
          status: input.status,
          ...(input.dispatchDate !== undefined && {
            dispatchDate: input.dispatchDate,
          }),
          ...(input.deliveryDate !== undefined && {
            deliveryDate: input.deliveryDate,
          }),
          ...(input.recipientName !== undefined && {
            recipientName: input.recipientName,
          }),
          ...(input.recipientPhone !== undefined && {
            recipientPhone: input.recipientPhone,
          }),
          ...(input.transporterName !== undefined && {
            transporterName: input.transporterName,
          }),
          ...(input.vehicleNumber !== undefined && {
            vehicleNumber: input.vehicleNumber,
          }),
          ...(input.trackingNumber !== undefined && {
            trackingNumber: input.trackingNumber,
          }),
          ...(input.notes !== undefined && { notes: input.notes }),
        },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
          salesOrder: {
            select: { orderNumber: true },
          },
          invoice: {
            select: { invoiceNumber: true },
          },
        },
      });

      // Synchronize Sales Order fulfilment status if attached
      if (existing.salesOrderId) {
        const order = await tx.salesOrder.findFirst({
          where: { id: existing.salesOrderId, organizationId },
          include: { items: true },
        });

        if (order && order.status !== "CANCELLED" && order.status !== "DRAFT") {
          const linesSummary = [];

          for (const orderItem of order.items) {
            const deliveredAgg = await tx.deliveryChallanItem.aggregate({
              _sum: { deliveredQuantity: true },
              where: {
                salesOrderItemId: orderItem.id,
                challan: {
                  organizationId,
                  status: { in: ["DISPATCHED", "DELIVERED"] },
                },
              },
            });

            linesSummary.push({
              orderedQuantity: Number(orderItem.quantity),
              cumulativeDeliveredQuantity: Number(
                deliveredAgg._sum.deliveredQuantity ?? 0,
              ),
            });
          }

          const newSoStatus = deriveSalesOrderFulfilmentStatus(linesSummary);
          if (newSoStatus !== order.status) {
            await tx.salesOrder.update({
              where: { id: existing.salesOrderId },
              data: { status: newSoStatus },
            });
          }
        }
      }

      return toDomainDeliveryChallan(updated);
    });
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const prisma = getPrisma();
    const existing = await prisma.deliveryChallan.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new ChallanNotFoundError(id);
    }

    if (existing.status !== "DRAFT") {
      throw new DeliveryChallanDomainError(
        `Cannot delete delivery challan in '${existing.status}' status. Only DRAFT challans can be deleted.`,
      );
    }

    await prisma.deliveryChallan.delete({
      where: { id },
    });

    return true;
  }

  async getDeliverableSalesOrders(
    organizationId: string,
  ): Promise<DeliverableSalesOrder[]> {
    const prisma = getPrisma();
    const orders = await prisma.salesOrder.findMany({
      where: {
        organizationId,
        status: { in: ["CONFIRMED", "PARTIALLY_FULFILLED"] },
      },
      include: {
        items: {
          include: {
            product: { select: { unit: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: { orderDate: "desc" },
    });

    const result: DeliverableSalesOrder[] = [];

    for (const order of orders) {
      const deliverableItems: DeliverableSalesOrderItem[] = [];

      for (const item of order.items) {
        const deliveredAgg = await prisma.deliveryChallanItem.aggregate({
          _sum: { deliveredQuantity: true },
          where: {
            salesOrderItemId: item.id,
            challan: {
              organizationId,
              status: { not: "CANCELLED" },
            },
          },
        });

        const prevDelivered = Number(
          deliveredAgg._sum.deliveredQuantity ?? 0,
        );
        const remaining = calculateRemainingDeliverableQuantity(
          Number(item.quantity),
          prevDelivered,
        );

        deliverableItems.push({
          id: item.id,
          item: item.item,
          description: item.description,
          hsnSac: item.hsnSac,
          unit: item.product?.unit || "PCS",
          orderedQuantity: Number(item.quantity),
          previouslyDeliveredQuantity: prevDelivered,
          remainingDeliverableQuantity: remaining,
          productId: item.productId,
        });
      }

      // Include if there's any deliverable quantity remaining
      const hasRemaining = deliverableItems.some(
        (it) => it.remainingDeliverableQuantity > 0,
      );

      if (hasRemaining) {
        result.push({
          id: order.id,
          orderNumber: order.orderNumber,
          orderDate: order.orderDate,
          customerId: order.customerId,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerAddress: order.customerAddress,
          customerGstin: order.customerGstin,
          status: order.status,
          items: deliverableItems,
        });
      }
    }

    return result;
  }

  async getDeliverableSalesOrderById(
    salesOrderId: string,
    organizationId: string,
  ): Promise<DeliverableSalesOrder | null> {
    const prisma = getPrisma();
    const order = await prisma.salesOrder.findFirst({
      where: { id: salesOrderId, organizationId },
      include: {
        items: {
          include: {
            product: { select: { unit: true } },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!order) return null;

    const deliverableItems: DeliverableSalesOrderItem[] = [];

    for (const item of order.items) {
      const deliveredAgg = await prisma.deliveryChallanItem.aggregate({
        _sum: { deliveredQuantity: true },
        where: {
          salesOrderItemId: item.id,
          challan: {
            organizationId,
            status: { not: "CANCELLED" },
          },
        },
      });

      const prevDelivered = Number(
        deliveredAgg._sum.deliveredQuantity ?? 0,
      );
      const remaining = calculateRemainingDeliverableQuantity(
        Number(item.quantity),
        prevDelivered,
      );

      deliverableItems.push({
        id: item.id,
        item: item.item,
        description: item.description,
        hsnSac: item.hsnSac,
        unit: item.product?.unit || "PCS",
        orderedQuantity: Number(item.quantity),
        previouslyDeliveredQuantity: prevDelivered,
        remainingDeliverableQuantity: remaining,
        productId: item.productId,
      });
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      orderDate: order.orderDate,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerAddress: order.customerAddress,
      customerGstin: order.customerGstin,
      status: order.status,
      items: deliverableItems,
    };
  }
}

export const deliveryChallanRepository = new PrismaDeliveryChallanRepository();
