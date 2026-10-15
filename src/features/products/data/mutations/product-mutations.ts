"use server";

import { revalidatePath } from "next/cache";
import { isOrganizationAdmin } from "@/features/auth";
import { normalizeHsnSacCode } from "@/features/hsn-sac-mapping/domain/entities/hsn-sac-code";
import { resolveProductContext } from "../context/product-context";
import { productRepository } from "../../infrastructure/repositories/prisma-product-repository";
import { createProductSchema, updateProductSchema } from "../validators/product-schemas";
import { validateCatalogueReferences } from "../validators/catalogue-reference-validation";
import { toProductDto } from "../mappers/product-mappers";
import type {
  ProductActionResult,
  CreateProductInput,
  UpdateProductInput,
  ProductDto,
} from "../dto/product-dto";
import type { Product } from "../../domain/entities/product";

export const createProductAction = async (
  input: CreateProductInput,
): Promise<ProductActionResult<ProductDto>> => {
  try {
    const parseResult = createProductSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const pathKey = issue.path.join(".");
        fieldErrors[pathKey] = issue.message;
      }
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors,
      };
    }

    const { organizationId } = await resolveProductContext();
    const data = parseResult.data;

    const referenceErrors = await validateCatalogueReferences(organizationId, {
      type: data.type,
      category: data.category,
      unit: data.unit,
      hsnSac: data.hsnSac,
    });
    if (Object.keys(referenceErrors).length > 0) {
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors: referenceErrors,
      };
    }

    const newProduct: Product = {
      id: `prod_${crypto.randomUUID()}`,
      organizationId,
      name: data.name,
      type: data.type,
      sku: data.sku ?? null,
      category: data.category ?? null,
      status: data.status,
      description: data.description ?? null,
      sellingPrice: data.sellingPrice,
      purchasePrice: data.purchasePrice ?? null,
      currency: data.currency,
      unit: data.unit,
      hsnSac: data.hsnSac ? normalizeHsnSacCode(data.hsnSac) : null,
      taxRate: data.taxRate,
      taxPreference: data.taxPreference,
      // Services must not track inventory
      trackInventory: data.type === "PRODUCT" ? data.trackInventory : false,
      reorderPoint: data.type === "PRODUCT" ? (data.reorderPoint ?? null) : null,
      internalNotes: data.internalNotes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await productRepository.create(newProduct);

    revalidatePath("/products");
    revalidatePath("/services");
    revalidatePath("/invoices/new");

    return {
      success: true,
      data: toProductDto(saved),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const updateProductAction = async (
  id: string,
  input: UpdateProductInput,
): Promise<ProductActionResult<ProductDto>> => {
  try {
    const parseResult = updateProductSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const pathKey = issue.path.join(".");
        fieldErrors[pathKey] = issue.message;
      }
      return {
        success: false,
        error: "Validation failed. Please review the highlighted fields.",
        fieldErrors,
      };
    }

    const { organizationId } = await resolveProductContext();
    const data = parseResult.data;

    if (
      data.type !== undefined ||
      data.category !== undefined ||
      data.unit !== undefined ||
      data.hsnSac !== undefined
    ) {
      // Re-validate carried-over references when the item type changes,
      // otherwise validate only the patched references.
      let refs: { type: "PRODUCT" | "SERVICE"; category?: string | null; unit?: string | null; hsnSac?: string | null };
      if (data.type !== undefined) {
        const existing = await productRepository.findById(organizationId, id);
        if (!existing) {
          return { success: false, error: `Product with ID "${id}" was not found.` };
        }
        refs = {
          type: data.type,
          category: data.category !== undefined ? data.category : existing.category,
          unit: data.unit !== undefined ? data.unit : existing.unit,
          hsnSac: data.hsnSac !== undefined ? data.hsnSac : existing.hsnSac,
        };
      } else {
        let effectiveType: "PRODUCT" | "SERVICE" = "PRODUCT";
        if (data.hsnSac !== undefined && data.hsnSac !== null) {
          const existing = await productRepository.findById(organizationId, id);
          if (!existing) {
            return { success: false, error: `Product with ID "${id}" was not found.` };
          }
          effectiveType = existing.type;
        }
        refs = { type: effectiveType, category: data.category, unit: data.unit, hsnSac: data.hsnSac };
      }
      const referenceErrors = await validateCatalogueReferences(organizationId, refs);
      if (Object.keys(referenceErrors).length > 0) {
        return {
          success: false,
          error: "Validation failed. Please review the highlighted fields.",
          fieldErrors: referenceErrors,
        };
      }
    }

    const patch: Partial<Product> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.type !== undefined) patch.type = data.type;
    if (data.sku !== undefined) patch.sku = data.sku ?? null;
    if (data.category !== undefined) patch.category = data.category ?? null;
    if (data.status !== undefined) patch.status = data.status;
    if (data.description !== undefined) patch.description = data.description ?? null;
    if (data.sellingPrice !== undefined) patch.sellingPrice = data.sellingPrice;
    if (data.purchasePrice !== undefined) patch.purchasePrice = data.purchasePrice ?? null;
    if (data.currency !== undefined) patch.currency = data.currency;
    if (data.unit !== undefined) patch.unit = data.unit;
    if (data.hsnSac !== undefined) {
      patch.hsnSac = data.hsnSac && data.hsnSac.trim().length > 0 ? normalizeHsnSacCode(data.hsnSac) : null;
    }
    if (data.taxRate !== undefined) patch.taxRate = data.taxRate;
    if (data.taxPreference !== undefined) patch.taxPreference = data.taxPreference;
    if (data.trackInventory !== undefined) {
      patch.trackInventory = data.type === "SERVICE" ? false : data.trackInventory;
    }
    if (data.reorderPoint !== undefined) {
      patch.reorderPoint = data.type === "SERVICE" ? null : (data.reorderPoint ?? null);
    }
    if (data.internalNotes !== undefined) patch.internalNotes = data.internalNotes ?? null;
    patch.updatedAt = new Date();

    const saved = await productRepository.update(organizationId, id, patch);

    revalidatePath("/products");
    revalidatePath(`/products/${id}`);
    revalidatePath("/services");
    revalidatePath(`/services/${id}`);
    revalidatePath("/invoices/new");

    return {
      success: true,
      data: toProductDto(saved),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

export const deleteProductAction = async (
  id: string,
): Promise<ProductActionResult<void>> => {
  try {
    const { organizationId, memberRole } = await resolveProductContext();
    // DEF-006: deleting catalogue items removes shared reference data — owner/admin only.
    if (!isOrganizationAdmin(memberRole)) {
      return {
        success: false,
        error: "You don't have permission to delete catalogue items.",
      };
    }
    await productRepository.delete(organizationId, id);

    revalidatePath("/products");
    revalidatePath("/services");
    revalidatePath("/invoices/new");

    return {
      success: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
