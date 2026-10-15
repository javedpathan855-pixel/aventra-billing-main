import "server-only";

import { resolveSalesOrderContext } from "../context/sales-order-context";
import { salesOrderRepository } from "../../infrastructure/repositories/prisma-sales-order-repository";
import type {
  ListSalesOrdersFilters,
  ListSalesOrdersResult,
} from "../../domain/repositories/sales-order-repository";

export const getSalesOrders = async (
  filters?: ListSalesOrdersFilters,
): Promise<ListSalesOrdersResult> => {
  const { organizationId } = await resolveSalesOrderContext();
  return salesOrderRepository.listWithFilters(organizationId, filters);
};
