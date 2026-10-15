"use server";

import { revalidatePath } from "next/cache";
import { resolvePricingContext } from "../context/pricing-context";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import { updatePricesSchema } from "../validators/pricing-schemas";
import { toPricingEntryDto } from "../mappers/pricing-mappers";
import { validateMasterPrice } from "../../domain/rules/pricing-rules";
import { ProductNotFoundError } from "@/features/products/domain/errors/product-errors";
import type {
  PricingActionResult,
  PricingEntryDto,
  UpdatePricesInput,
} from "../dto/pricing-dto";

/**
 * Updates master selling/purchase prices for one catalogue item. Only future
 * selections observe the new defaults — persisted document lines are
 * snapshots and are never rewritten here.
 */
export const updateProductPricesAction = async (
  productId: string,
  input: UpdatePricesInput,
): Promise<PricingActionResult<PricingEntryDto>> => {
  try {
    const parseResult = updatePricesSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      return { success: false, error: "Validation failed. Please review the highlighted fields.", fieldErrors };
    }

    const { organizationId } = await resolvePricingContext();
    const data = parseResult.data;

    const existing = await productRepository.findById(organizationId, productId);
    if (!existing) {
      throw new ProductNotFoundError(productId);
    }

    const saved = await productRepository.update(organizationId, productId, {
      sellingPrice: validateMasterPrice(data.sellingPrice),
      purchasePrice: data.purchasePrice === undefined || data.purchasePrice === null
        ? null
        : validateMasterPrice(data.purchasePrice),
      updatedAt: new Date(),
    });

    revalidatePath("/pricing");
    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    revalidatePath("/services");
    revalidatePath(`/services/${productId}`);

    return {
      success: true,
      data: toPricingEntryDto({
        productId: saved.id,
        organizationId: saved.organizationId,
        name: saved.name,
        type: saved.type,
        status: saved.status,
        category: saved.category,
        unit: saved.unit,
        sellingPrice: saved.sellingPrice,
        purchasePrice: saved.purchasePrice,
        currency: saved.currency,
        taxRate: saved.taxRate,
        updatedAt: saved.updatedAt,
      }),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
