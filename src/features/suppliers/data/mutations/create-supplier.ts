"use server";

import { revalidatePath } from "next/cache";
import { resolveSupplierContext } from "../context/supplier-context";
import { supplierRepository } from "../../infrastructure/repositories/prisma-supplier-repository";
import { createSupplierSchema } from "../validators/supplier-schemas";
import { toSupplierDto } from "../mappers/supplier-mappers";
import { SupplierDuplicateError } from "../../domain/errors/supplier-errors";
import type { SupplierActionResult, CreateSupplierInput, SupplierDto } from "../dto/supplier-dto";
import type { Supplier } from "../../domain/entities/supplier";

const normalizeTaxId = (value?: string | null): string | null => {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, "").toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
};

export const createSupplierAction = async (
  input: CreateSupplierInput,
): Promise<SupplierActionResult<SupplierDto>> => {
  try {
    const parseResult = createSupplierSchema.safeParse(input);
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

    const { organizationId } = await resolveSupplierContext();
    const data = parseResult.data;

    const gstin = normalizeTaxId(data.gstin);
    if (gstin) {
      const conflicting = await supplierRepository.findByGstin(organizationId, gstin);
      if (conflicting) {
        throw new SupplierDuplicateError("GSTIN", gstin);
      }
    }

    const finalShippingAddress = data.sameAsBillingAddress
      ? { ...data.billingAddress }
      : data.shippingAddress ?? { ...data.billingAddress };

    const newSupplier: Supplier = {
      id: `sup_${crypto.randomUUID()}`,
      organizationId,
      name: data.name,
      status: data.status,
      contactPerson: data.contactPerson ?? null,
      email: data.email || null,
      phone: data.phone || null,
      alternatePhone: data.alternatePhone || null,
      billingAddress: data.billingAddress,
      shippingAddress: finalShippingAddress,
      sameAsBillingAddress: data.sameAsBillingAddress,
      gstTreatment: data.gstTreatment,
      gstin,
      pan: normalizeTaxId(data.pan),
      currency: data.currency,
      paymentTerms: data.paymentTerms?.trim() ? data.paymentTerms.trim() : null,
      internalNotes: data.internalNotes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saved = await supplierRepository.create(newSupplier);
    revalidatePath("/suppliers");

    return {
      success: true,
      data: toSupplierDto(saved),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
