"use server";

import { revalidatePath } from "next/cache";
import { resolveCustomerContext } from "../context/customer-context";
import { customerRepository } from "../../infrastructure/repositories/prisma-customer-repository";
import { updateCustomerSchema } from "../validators/customer-schemas";
import { toCustomerDto } from "../mappers/customer-mappers";
import { CustomerNotFoundError } from "../../domain/errors/customer-errors";
import {
  derivePanFromGstin,
  isGstinRequired,
  isValidGstinFormat,
  isValidPanFormat,
} from "../../domain/rules/customer-rules";
import type { CustomerActionResult, UpdateCustomerInput, CustomerDto } from "../dto/customer-dto";

export const updateCustomerAction = async (
  id: string,
  input: UpdateCustomerInput,
): Promise<CustomerActionResult<CustomerDto>> => {
  try {
    const parseResult = updateCustomerSchema.safeParse(input);
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

    const { organizationId } = await resolveCustomerContext();
    const existing = await customerRepository.findById(organizationId, id);
    if (!existing) {
      throw new CustomerNotFoundError(id);
    }

    const data = parseResult.data;

    // DEF-015: cross-field rules apply to the merged record, not just the
    // patch — an edit that omits gstTreatment must not strip a still-required
    // GSTIN, and tax identifiers are normalized to canonical uppercase.
    const effectiveTreatment = data.gstTreatment ?? existing.gstTreatment;
    const rawGstin = data.gstin !== undefined ? data.gstin : existing.gstin;
    const normalizedGstin =
      rawGstin && rawGstin.trim().length > 0
        ? rawGstin.replace(/\s+/g, "").toUpperCase()
        : null;
    if (isGstinRequired(effectiveTreatment) && !normalizedGstin) {
      return {
        success: false,
        error: "GSTIN is required for registered businesses.",
        fieldErrors: { gstin: "GSTIN is required for registered businesses." },
      };
    }
    const normalizedPan =
      (data.pan !== undefined ? data.pan : existing.pan) &&
      ((data.pan !== undefined ? data.pan : existing.pan) as string).trim().length > 0
        ? ((data.pan !== undefined ? data.pan : existing.pan) as string)
            .replace(/\s+/g, "")
            .toUpperCase()
        : null;
    // Full tax-identifier validation on the merged record (DEF-015): an edit
    // cannot store a malformed GSTIN/PAN or mismatch PAN vs GSTIN, even when
    // the sparse patch omits the cross-field counterpart.
    if (normalizedGstin && !isValidGstinFormat(normalizedGstin)) {
      return {
        success: false,
        error: "GSTIN must be a valid 15-character format (e.g., 27AABCG9912D1Z9).",
        fieldErrors: { gstin: "GSTIN must be a valid 15-character format (e.g., 27AABCG9912D1Z9)." },
      };
    }
    if (normalizedPan && !isValidPanFormat(normalizedPan)) {
      return {
        success: false,
        error: "PAN must be a valid 10-character code (e.g., AABCG9912D).",
        fieldErrors: { pan: "PAN must be a valid 10-character code (e.g., AABCG9912D)." },
      };
    }
    if (normalizedGstin && normalizedPan) {
      const derived = derivePanFromGstin(normalizedGstin);
      if (derived && derived !== normalizedPan) {
        return {
          success: false,
          error: "PAN must match the PAN embedded in the GSTIN.",
          fieldErrors: { pan: "PAN must match the PAN embedded in the GSTIN." },
        };
      }
    }

    const finalShippingAddress =
      data.sameAsBillingAddress === true
        ? data.billingAddress
          ? { ...data.billingAddress }
          : existing.billingAddress
        : data.shippingAddress !== undefined
          ? data.shippingAddress ?? existing.shippingAddress
          : existing.shippingAddress;

    const updated = await customerRepository.update(organizationId, id, {
      name: data.name,
      customerType: data.customerType,
      gstTreatment: data.gstTreatment,
      status: data.status,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      alternatePhone: data.alternatePhone,
      billingAddress: data.billingAddress,
      shippingAddress: finalShippingAddress,
      sameAsBillingAddress: data.sameAsBillingAddress,
      gstin: data.gstin !== undefined ? normalizedGstin : undefined,
      pan: data.pan !== undefined ? normalizedPan : undefined,
      currency: data.currency,
      placeOfSupply: data.placeOfSupply,
      paymentTerms: data.paymentTerms,
      creditLimit: data.creditLimit,
      defaultDiscount: data.defaultDiscount,
      defaultTaxPreference: data.defaultTaxPreference,
      priceList: data.priceList,
      internalNotes: data.internalNotes,
      tags: data.tags,
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${id}`);

    return {
      success: true,
      data: toCustomerDto(updated),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
