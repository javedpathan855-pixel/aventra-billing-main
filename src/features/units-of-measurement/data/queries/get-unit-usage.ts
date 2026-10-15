import "server-only";

import { resolveUnitContext } from "../context/unit-context";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";

/**
 * Counts catalogue items using a unit code. Used for usage display and
 * delete protection. Reads through the products feature's repository contract
 * (established cross-feature server pattern), never through presentation.
 */
export const countUnitUsage = async (unitCode: string): Promise<number> => {
  const { organizationId } = await resolveUnitContext();
  const result = await productRepository.list(organizationId, {
    unit: unitCode,
    limit: 1,
    offset: 0,
  });
  return result.totalCount;
};

export const countUnitsUsage = async (
  unitCodes: string[],
): Promise<Record<string, number>> => {
  const entries = await Promise.all(
    unitCodes.map(async (code) => [code, await countUnitUsage(code)] as const),
  );
  return Object.fromEntries(entries);
};
