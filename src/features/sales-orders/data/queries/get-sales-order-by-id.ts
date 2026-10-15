import "server-only";

import { resolveSalesOrderContext } from "../context/sales-order-context";
import { salesOrderRepository } from "../../infrastructure/repositories/prisma-sales-order-repository";
import type { SalesOrder } from "../../domain/entities/sales-order";

export const getSalesOrderById = async (
  id: string,
): Promise<SalesOrder | null> => {
  const { organizationId } = await resolveSalesOrderContext();
  return salesOrderRepository.findById(organizationId, id);
};

export const getSalesOrderByNumber = async (
  orderNumber: string,
): Promise<SalesOrder | null> => {
  const { organizationId } = await resolveSalesOrderContext();
  return salesOrderRepository.findByNumber(organizationId, orderNumber);
};
