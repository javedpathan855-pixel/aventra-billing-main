import "server-only";

import { resolveSalesReturnContext } from "../context/sales-return-context";
import { salesReturnRepository } from "../../infrastructure/repositories/prisma-sales-return-repository";
import type { SalesReturn } from "../../domain/entities/sales-return";

export const getSalesReturnById = async (
  id: string,
): Promise<SalesReturn | null> => {
  const { organizationId } = await resolveSalesReturnContext();
  return salesReturnRepository.findById(id, organizationId);
};
