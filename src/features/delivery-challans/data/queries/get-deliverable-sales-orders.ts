import "server-only";

import { resolveDeliveryChallanContext } from "../context/delivery-challan-context";
import { deliveryChallanRepository } from "../../infrastructure/repositories/prisma-delivery-challan-repository";
import type { DeliverableSalesOrder } from "../../domain/entities/delivery-challan";

export const getDeliverableSalesOrders = async (): Promise<DeliverableSalesOrder[]> => {
  const { organizationId } = await resolveDeliveryChallanContext();
  return deliveryChallanRepository.getDeliverableSalesOrders(organizationId);
};

export const getDeliverableSalesOrderById = async (
  salesOrderId: string,
): Promise<DeliverableSalesOrder | null> => {
  const { organizationId } = await resolveDeliveryChallanContext();
  return deliveryChallanRepository.getDeliverableSalesOrderById(salesOrderId, organizationId);
};
