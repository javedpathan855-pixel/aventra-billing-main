"use server";

import { revalidatePath } from "next/cache";
import { resolveSupplierContext } from "../context/supplier-context";
import { supplierRepository } from "../../infrastructure/repositories/prisma-supplier-repository";
import { updateSupplierSchema } from "../validators/supplier-schemas";
import { toSupplierDto } from "../mappers/supplier-mappers";
import {
  SupplierDuplicateError,
  SupplierNotFoundError,
  SupplierValidationError,
} from "../../domain/errors/supplier-errors";
import {
  derivePanFromGstin,
  isGstinRequired,
  isValidGstinFormat,
  isValidPanFormat,
} from "../../domain/rules/supplier-rules";
import type { SupplierActionResult, UpdateSupplierInput, SupplierDto } from "../dto/supplier-dto";

const normalizeTaxId = (value?: string | null): string | null => {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, "").toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
};

export const updateSupplierAction = async (
  id: string,
  input: UpdateSupplierInput,
): Promise<SupplierActionResult<SupplierDto>> => {
  try {
    const parseResult = updateSupplierSchema.safeParse(input);
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
    const existing = await supplierRepository.findById(organizationId, id);
    if (!existing) {
      throw new SupplierNotFoundError(id);
    }

    const data = parseResult.data;

    // Cross-field tax rules apply to the merged record, not just the patch:
    // an edit that omits gstTreatment must not strip a still-required GSTIN,
    // and tax identifiers are normalized to canonical uppercase.
    const effectiveTreatment = data.gstTreatment ?? existing.gstTreatment;
    const rawGstin = data.gstin !== undefined ? data.gstin : existing.gstin;
    const normalizedGstin = normalizeTaxId(rawGstin);
    const rawPan = data.pan !== undefined ? data.pan : existing.pan;
    const normalizedPan = normalizeTaxId(rawPan);

    if (isGstinRequired(effectiveTreatment) && !normalizedGstin) {
      throw new SupplierValidationError("GSTIN is required for registered businesses.", {
        gstin: "GSTIN is required for registered businesses.",
      });
    }
    if (normalizedGstin && !isValidGstinFormat(normalizedGstin)) {
      throw new SupplierValidationError("GSTIN must be a valid 15-character format.", {
        gstin: "GSTIN must be a valid 15-character format (e.g., 27AABCS1234F1Z9).",
      });
    }
    if (normalizedPan && !isValidPanFormat(normalizedPan)) {
      throw new SupplierValidationError("PAN must be a valid 10-character code.", {
        pan: "PAN must be a valid 10-character code (e.g., AABCS1234F).",
      });
    }
    if (normalizedGstin && normalizedPan) {
      const derived = derivePanFromGstin(normalizedGstin);
      if (derived && derived !== normalizedPan) {
        throw new SupplierValidationError("PAN must match the PAN embedded in the GSTIN.", {
          pan: "PAN must match the PAN embedded in the GSTIN.",
        });
      }
    }
    if (normalizedGstin && normalizedGstin !== existing.gstin) {
      const conflicting = await supplierRepository.findByGstin(organizationId, normalizedGstin);
      if (conflicting && conflicting.id !== id) {
        throw new SupplierDuplicateError("GSTIN", normalizedGstin);
      }
    }

    const addressTouched =
      data.billingAddress !== undefined ||
      data.shippingAddress !== undefined ||
      data.sameAsBillingAddress !== undefined;
    const effectiveSameAsBilling =
      data.sameAsBillingAddress ?? existing.sameAsBillingAddress;
    const effectiveBilling = data.billingAddress ?? existing.billingAddress;
    const effectiveShipping =
      data.shippingAddress ??
      (effectiveSameAsBilling ? { ...effectiveBilling } : existing.shippingAddress);

    const updated = await supplierRepository.update(organizationId, id, {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.alternatePhone !== undefined && { alternatePhone: data.alternatePhone || null }),
      ...(data.billingAddress !== undefined && { billingAddress: data.billingAddress }),
      ...(addressTouched && { shippingAddress: effectiveShipping }),
      ...(data.sameAsBillingAddress !== undefined && {
        sameAsBillingAddress: data.sameAsBillingAddress,
      }),
      ...(data.gstTreatment !== undefined && { gstTreatment: data.gstTreatment }),
      ...(data.gstin !== undefined && { gstin: normalizedGstin }),
      ...(data.pan !== undefined && { pan: normalizedPan }),
      ...(data.currency !== undefined && { currency: data.currency }),
      ...(data.paymentTerms !== undefined && {
        paymentTerms: data.paymentTerms?.trim() ? data.paymentTerms.trim() : null,
      }),
      ...(data.internalNotes !== undefined && { internalNotes: data.internalNotes }),
    });
    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${id}`);

    return {
      success: true,
      data: toSupplierDto(updated),
    };
  } catch (err: unknown) {
    if (err instanceof SupplierValidationError) {
      return {
        success: false,
        error: err.message,
        fieldErrors: err.fieldErrors,
      };
    }
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
