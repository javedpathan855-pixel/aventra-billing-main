import { categoryRepository } from "@/features/categories/infrastructure/repositories/prisma-category-repository";
import { unitRepository } from "@/features/units-of-measurement/infrastructure/repositories/prisma-unit-repository";
import { hsnSacRepository } from "@/features/hsn-sac-mapping/infrastructure/repositories/prisma-hsn-sac-repository";
import {
  expectedHsnSacTypeForItemType,
  normalizeHsnSacCode,
} from "@/features/hsn-sac-mapping/domain/entities/hsn-sac-code";
import { STANDARD_CATEGORIES, STANDARD_UNITS } from "../../domain/rules/product-rules";
import type { ProductType } from "../../domain/entities/product";

export type CatalogueReferences = {
  type: ProductType;
  category?: string | null;
  unit?: string | null;
  hsnSac?: string | null;
};

const STANDARD_CATEGORY_NAMES = STANDARD_CATEGORIES as readonly string[];
const STANDARD_UNIT_CODES = STANDARD_UNITS as readonly string[];

/**
 * Validates catalogue references against the canonical masters. Adoption is
 * per-organization: when an organization has not created any categories/units
 * yet, the legacy standard lists still apply; once the master is adopted,
 * values must match active master records. HSN/SAC codes follow the same
 * rule against the global classification master (regex fallback pre-import),
 * with HSN enforced for products and SAC for services.
 */
export const validateCatalogueReferences = async (
  organizationId: string,
  refs: CatalogueReferences,
): Promise<Record<string, string>> => {
  const errors: Record<string, string> = {};

  if (refs.category && refs.category.trim().length > 0) {
    const name = refs.category.trim();
    const { totalCount } = await categoryRepository.list(organizationId, { limit: 1, offset: 0 });
    if (totalCount === 0) {
      if (!STANDARD_CATEGORY_NAMES.includes(name)) {
        errors.category = `Category "${name}" is not a supported category. Seed or create categories first.`;
      }
    } else {
      const match = await categoryRepository.findByName(organizationId, name);
      if (!match) {
        errors.category = `Category "${name}" is not defined. Select an active category.`;
      } else if (match.status !== "ACTIVE") {
        errors.category = `Category "${name}" is inactive. Select an active category.`;
      }
    }
  }

  if (refs.unit && refs.unit.trim().length > 0) {
    const code = refs.unit.trim().toUpperCase();
    const { totalCount } = await unitRepository.list(organizationId, { limit: 1, offset: 0 });
    if (totalCount === 0) {
      if (!STANDARD_UNIT_CODES.includes(code)) {
        errors.unit = `Unit "${refs.unit.trim()}" is not supported. Seed or create units first.`;
      }
    } else {
      const match = await unitRepository.findByCode(organizationId, code);
      if (!match) {
        errors.unit = `Unit "${code}" is not defined. Select an active unit.`;
      } else if (match.status !== "ACTIVE") {
        errors.unit = `Unit "${code}" is inactive. Select an active unit.`;
      }
    }
  }

  if (refs.hsnSac && refs.hsnSac.trim().length > 0) {
    const code = normalizeHsnSacCode(refs.hsnSac);
    const { totalCount } = await hsnSacRepository.list({ limit: 1, offset: 0 });
    if (totalCount > 0) {
      const expectedType = expectedHsnSacTypeForItemType(refs.type);
      const match = await hsnSacRepository.findByCode(expectedType, code);
      if (!match) {
        const otherType = expectedType === "HSN" ? "SAC" : "HSN";
        const other = await hsnSacRepository.findByCode(otherType, code);
        errors.hsnSac = other
          ? `${refs.type === "SERVICE" ? "Services" : "Products"} must use ${expectedType} classifications.`
          : `Code "${code}" is not a valid ${expectedType} code in the classification master.`;
      } else if (!match.isActive) {
        errors.hsnSac = `Classification code "${code}" is inactive and cannot be used for new mappings.`;
      }
    }
  }

  return errors;
};
