import "server-only";

import { resolveSalesReturnContext } from "../context/sales-return-context";
import { salesReturnRepository } from "../../infrastructure/repositories/prisma-sales-return-repository";
import type { SalesReturn } from "../../domain/entities/sales-return";
import type { SalesReturnFilter } from "../../domain/repositories/sales-return-repository";

export const getSalesReturns = async (
  filter?: SalesReturnFilter,
): Promise<SalesReturn[]> => {
  const { organizationId } = await resolveSalesReturnContext();
  return salesReturnRepository.findMany(organizationId, filter);
};
