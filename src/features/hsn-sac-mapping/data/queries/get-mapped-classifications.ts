import "server-only";

import { resolveHsnSacContext } from "../context/hsn-sac-context";
import { hsnSacRepository } from "../../infrastructure/repositories/prisma-hsn-sac-repository";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import { normalizeHsnSacCode } from "../../domain/entities/hsn-sac-code";
import type { MappedClassification } from "../dto/hsn-sac-dto";

/**
 * Groups the organization's catalogue by classification code so the mapping
 * page shows which HSN/SAC codes are actually in use. Bounded to the most
 * recent 500 catalogue items; larger catalogues still report exact per-code
 * totals through the products repository.
 */
export const getMappedClassifications = async (): Promise<MappedClassification[]> => {
  const { organizationId } = await resolveHsnSacContext();

  const { products } = await productRepository.list(organizationId, { limit: 500, offset: 0 });
  const byCode = new Map<string, { itemCount: number; type: "PRODUCT" | "SERVICE" }>();

  for (const p of products) {
    if (!p.hsnSac || p.hsnSac.trim().length === 0) continue;
    const code = normalizeHsnSacCode(p.hsnSac);
    const entry = byCode.get(code) ?? { itemCount: 0, type: p.type };
    entry.itemCount += 1;
    byCode.set(code, entry);
  }

  const mapped: MappedClassification[] = [];
  for (const [code, entry] of byCode) {
    const expectedType = entry.type === "SERVICE" ? "SAC" : "HSN";
    const master = await hsnSacRepository.findByCode(expectedType, code);
    mapped.push({
      code,
      type: expectedType,
      description: master?.description ?? null,
      itemCount: entry.itemCount,
    });
  }

  return mapped.sort((a, b) => b.itemCount - a.itemCount || a.code.localeCompare(b.code));
};
