"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/shared/lib/prisma";
import { resolvePurchaseBillContext } from "../context/purchase-bill-context";
import { purchaseBillRepository } from "../../infrastructure/repositories/prisma-purchase-bill-repository";
import { supplierRepository } from "@/features/suppliers/infrastructure/repositories/prisma-supplier-repository";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import { purchaseOrderRepository } from "@/features/purchase-orders/infrastructure/repositories/prisma-purchase-order-repository";
import { purchaseSettingsRepository } from "@/features/purchase-settings";
import {
  canDeletePurchaseBill,
  canEditPurchaseBill,
  validatePurchaseBillStatusTransition,
} from "../../domain/rules/purchase-bill-lifecycle-rules";
import { validatePurchaseBillDates } from "../../domain/rules/purchase-bill-rules";
import {
  createPurchaseBillSchema,
  updatePurchaseBillSchema,
} from "../validators/purchase-bill-schemas";
import type {
  CreatePurchaseBillDto,
  UpdatePurchaseBillDto,
  PurchaseBillActionResult,
} from "../dto/purchase-bill-dto";
import type {
  PurchaseBill,
  PurchaseBillStatus,
} from "../../domain/entities/purchase-bill";
import type { PurchaseOrder } from "@/features/purchase-orders";
import {
  DuplicateSupplierInvoiceError,
  PurchaseBillLockedError,
  PurchaseBillNotFoundError,
  InvalidPurchaseBillReferenceError,
} from "../../domain/errors/purchase-bill-errors";

/**
 * Verifies that a referenced supplier belongs to the calling organization.
 */
export const assertSupplierInOrganization = async (
  organizationId: string,
  supplierId: string,
): Promise<void> => {
  const supplier = await supplierRepository.findById(organizationId, supplierId);
  if (!supplier) {
    throw new InvalidPurchaseBillReferenceError("Supplier", supplierId);
  }
};

/**
 * Verifies that every referenced product belongs to the calling organization.
 */
export const assertProductsInOrganization = async (
  organizationId: string,
  productIds: ReadonlyArray<string | null | undefined>,
): Promise<void> => {
  const ids = [...new Set(productIds.filter((id): id is string => Boolean(id)))];
  const results = await Promise.all(
    ids.map((id) => productRepository.findById(organizationId, id)),
  );
  results.forEach((product, idx) => {
    if (!product) {
      throw new InvalidPurchaseBillReferenceError("Product", ids[idx]);
    }
  });
};

/**
 * Verifies that a referenced purchase order belongs to the calling
 * organization, is billable (not cancelled), and belongs to the same
 * supplier counterparty as the bill. Returns the order for snapshotting.
 */
export const assertBillablePurchaseOrder = async (
  organizationId: string,
  purchaseOrderId: string,
  supplierId: string | null,
): Promise<PurchaseOrder> => {
  const order = await purchaseOrderRepository.findById(
    organizationId,
    purchaseOrderId,
  );
  if (!order) {
    throw new InvalidPurchaseBillReferenceError(
      "Purchase Order",
      purchaseOrderId,
    );
  }
  if (order.status === "Cancelled") {
    throw new InvalidPurchaseBillReferenceError(
      "Purchase Order (cancelled orders cannot be billed)",
      purchaseOrderId,
    );
  }
  if ((order.supplierId || null) !== (supplierId || null)) {
    throw new InvalidPurchaseBillReferenceError(
      "Purchase Order of this supplier",
      purchaseOrderId,
    );
  }
  return order;
};

/**
 * Rejects a supplier invoice number that is already recorded for the same
 * supplier in the calling organization. An optional bill id excludes the
 * bill being updated from the check.
 */
export const assertSupplierInvoiceUnique = async (
  organizationId: string,
  supplierId: string,
  supplierName: string,
  supplierInvoiceNumber: string,
  excludeBillId?: string,
): Promise<void> => {
  const existing = await purchaseBillRepository.findBySupplierInvoice(
    organizationId,
    supplierId,
    supplierInvoiceNumber,
  );
  if (existing && existing.id !== excludeBillId) {
    throw new DuplicateSupplierInvoiceError(
      supplierName,
      supplierInvoiceNumber,
    );
  }
};

const isDuplicateKeyError = (err: unknown): boolean =>
  (err as { code?: string }).code === "P2002";

/**
 * Creates a new Purchase Bill. The internal bill number is allocated from
 * Purchase Settings (or validated as a custom per-org unique value) and all
 * totals are recomputed on the server.
 */
export const createPurchaseBillAction = async (
  input: CreatePurchaseBillDto,
): Promise<PurchaseBillActionResult<PurchaseBill>> => {
  try {
    const parseResult = createPurchaseBillSchema.safeParse(input);
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

    const { organizationId } = await resolvePurchaseBillContext();
    const data = parseResult.data;

    if (data.supplierId) {
      await assertSupplierInOrganization(organizationId, data.supplierId);
    }
    await assertProductsInOrganization(
      organizationId,
      data.items.map((it) => it.productId),
    );

    let linkedOrder: PurchaseOrder | null = null;
    if (data.purchaseOrderId) {
      linkedOrder = await assertBillablePurchaseOrder(
        organizationId,
        data.purchaseOrderId,
        data.supplierId || null,
      );
    }

    const normalizedSupplierInvoice = data.supplierInvoiceNumber?.trim() || null;
    if (data.supplierId && normalizedSupplierInvoice) {
      await assertSupplierInvoiceUnique(
        organizationId,
        data.supplierId,
        data.supplierName,
        normalizedSupplierInvoice,
      );
    }

    const purchaseSettings = await purchaseSettingsRepository.getSettings(
      organizationId,
    );

    const prisma = getPrisma();
    const bill = await prisma.$transaction(async (tx) => {
      let finalBillNumber = data.billNumber?.trim();
      if (!finalBillNumber) {
        const allocated =
          await purchaseSettingsRepository.allocateNextPurchaseBillNumber(
            organizationId,
            tx,
          );
        finalBillNumber = allocated.allocatedNumber;
      } else {
        const existing = await purchaseBillRepository.findByNumber(
          organizationId,
          finalBillNumber,
          tx,
        );

        if (existing) {
          throw new Error(
            `A purchase bill with number "${finalBillNumber}" already exists in this organization.`,
          );
        }
      }

      return purchaseBillRepository.create(
        organizationId,
        {
          billNumber: finalBillNumber,
          supplierId: data.supplierId || null,
          supplierName: data.supplierName,
          supplierEmail: data.supplierEmail || null,
          supplierAddress: data.supplierAddress || null,
          supplierGstin: data.supplierGstin || null,
          supplierPlaceOfSupply: data.supplierPlaceOfSupply || null,
          supplierInvoiceNumber: normalizedSupplierInvoice,
          supplierInvoiceDate: data.supplierInvoiceDate
            ? new Date(data.supplierInvoiceDate)
            : null,
          purchaseOrderId: data.purchaseOrderId || null,
          purchaseOrderNumber: linkedOrder ? linkedOrder.orderNumber : null,
          billDate: new Date(data.billDate),
          dueDate: new Date(data.dueDate),
          status: (data.status as PurchaseBillStatus) || "Draft",
          taxMode: data.taxMode || "CGST_SGST",
          currency: data.currency || "INR (₹)",
          paymentTerms:
            data.paymentTerms || purchaseSettings.defaultPaymentTerms || null,
          notes:
            data.notes ?? purchaseSettings.defaultPurchaseBillNotes ?? null,
          terms:
            data.terms ?? purchaseSettings.defaultPurchaseBillTerms ?? null,
          additionalCharges: data.additionalCharges || 0,
          additionalChargesLabel: data.additionalChargesLabel || null,
          additionalDiscount: data.additionalDiscount || 0,
          additionalDiscountType: data.additionalDiscountType || "fixed",
          additionalDiscountLabel: data.additionalDiscountLabel || null,
          items: data.items.map((it, idx) => ({
            productId: it.productId || null,
            item: it.item,
            description: it.description || null,
            hsnSac: it.hsnSac || null,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount || 0,
            taxRate: it.taxRate ?? 18,
            sortOrder: idx,
          })),
        },
        tx,
      );
    });

    revalidatePath("/purchase-bills");
    revalidatePath(`/purchase-bills/${bill.id}`);

    return {
      success: true,
      data: bill,
    };
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      const invoiceNumber =
        typeof input.supplierInvoiceNumber === "string" &&
        input.supplierInvoiceNumber.trim()
          ? input.supplierInvoiceNumber.trim()
          : null;
      return {
        success: false,
        error: invoiceNumber
          ? `Supplier "${typeof input.supplierName === "string" ? input.supplierName : "unknown"}" already has a purchase bill for invoice "${invoiceNumber}" in this organization.`
          : "A purchase bill with this number already exists in this organization.",
      };
    }
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

/**
 * Updates an existing Draft Purchase Bill. Non-draft bills are locked.
 */
export const updatePurchaseBillAction = async (
  id: string,
  input: UpdatePurchaseBillDto,
): Promise<PurchaseBillActionResult<PurchaseBill>> => {
  try {
    const parseResult = updatePurchaseBillSchema.safeParse(input);
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

    const { organizationId } = await resolvePurchaseBillContext();
    const existing = await purchaseBillRepository.findById(organizationId, id);
    if (!existing) {
      throw new PurchaseBillNotFoundError(id);
    }

    if (!canEditPurchaseBill(existing)) {
      throw new PurchaseBillLockedError(existing.billNumber, existing.status);
    }

    const data = parseResult.data;

    if (data.supplierId) {
      await assertSupplierInOrganization(organizationId, data.supplierId);
    }
    if (data.items) {
      await assertProductsInOrganization(
        organizationId,
        data.items.map((it) => it.productId),
      );
    }

    const effectiveSupplierId =
      data.supplierId !== undefined ? data.supplierId : existing.supplierId;
    let linkedOrderNumber: string | null | undefined;
    if (data.purchaseOrderId !== undefined) {
      if (data.purchaseOrderId) {
        const linkedOrder = await assertBillablePurchaseOrder(
          organizationId,
          data.purchaseOrderId,
          effectiveSupplierId || null,
        );
        linkedOrderNumber = linkedOrder.orderNumber;
      } else {
        linkedOrderNumber = null;
      }
    }

    const effectiveSupplierInvoice =
      data.supplierInvoiceNumber !== undefined
        ? data.supplierInvoiceNumber?.trim() || null
        : existing.supplierInvoiceNumber;
    const effectiveSupplierName = data.supplierName || existing.supplierName;
    if (effectiveSupplierId && effectiveSupplierInvoice) {
      await assertSupplierInvoiceUnique(
        organizationId,
        effectiveSupplierId,
        effectiveSupplierName,
        effectiveSupplierInvoice,
        id,
      );
    }

    const effectiveBillDate = data.billDate || existing.billDate;
    const effectiveDueDate = data.dueDate || existing.dueDate;
    validatePurchaseBillDates(effectiveBillDate, effectiveDueDate);

    const updated = await purchaseBillRepository.update(organizationId, id, {
      ...(data.supplierName && { supplierName: data.supplierName }),
      ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
      ...(data.supplierEmail !== undefined && {
        supplierEmail: data.supplierEmail,
      }),
      ...(data.supplierAddress !== undefined && {
        supplierAddress: data.supplierAddress,
      }),
      ...(data.supplierGstin !== undefined && {
        supplierGstin: data.supplierGstin,
      }),
      ...(data.supplierPlaceOfSupply !== undefined && {
        supplierPlaceOfSupply: data.supplierPlaceOfSupply,
      }),
      ...(data.supplierInvoiceNumber !== undefined && {
        supplierInvoiceNumber: effectiveSupplierInvoice,
      }),
      ...(data.supplierInvoiceDate !== undefined && {
        supplierInvoiceDate: data.supplierInvoiceDate
          ? new Date(data.supplierInvoiceDate)
          : null,
      }),
      ...(data.purchaseOrderId !== undefined && {
        purchaseOrderId: data.purchaseOrderId,
        purchaseOrderNumber: linkedOrderNumber,
      }),
      ...(data.billDate && { billDate: new Date(data.billDate) }),
      ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      ...(data.taxMode && { taxMode: data.taxMode }),
      ...(data.paymentTerms !== undefined && {
        paymentTerms: data.paymentTerms,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.terms !== undefined && { terms: data.terms }),
      ...(data.additionalCharges !== undefined && {
        additionalCharges: data.additionalCharges,
      }),
      ...(data.additionalChargesLabel !== undefined && {
        additionalChargesLabel: data.additionalChargesLabel,
      }),
      ...(data.additionalDiscount !== undefined && {
        additionalDiscount: data.additionalDiscount,
      }),
      ...(data.additionalDiscountType && {
        additionalDiscountType: data.additionalDiscountType,
      }),
      ...(data.additionalDiscountLabel !== undefined && {
        additionalDiscountLabel: data.additionalDiscountLabel,
      }),
      ...(data.items && {
        items: data.items.map((it, idx) => ({
          productId: it.productId || null,
          item: it.item,
          description: it.description || null,
          hsnSac: it.hsnSac || null,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount || 0,
          taxRate: it.taxRate ?? 18,
          sortOrder: idx,
        })),
      }),
    });

    revalidatePath("/purchase-bills");
    revalidatePath(`/purchase-bills/${id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      return {
        success: false,
        error:
          "This supplier invoice is already recorded on another purchase bill in this organization.",
      };
    }
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

/**
 * Transitions Purchase Bill status (e.g. Draft -> Confirmed, Confirmed -> Cancelled).
 */
export const transitionPurchaseBillStatusAction = async (
  id: string,
  targetStatus: PurchaseBillStatus,
): Promise<PurchaseBillActionResult<PurchaseBill>> => {
  try {
    const { organizationId } = await resolvePurchaseBillContext();
    const existing = await purchaseBillRepository.findById(organizationId, id);
    if (!existing) {
      throw new PurchaseBillNotFoundError(id);
    }

    validatePurchaseBillStatusTransition(existing.status, targetStatus);

    const updated = await purchaseBillRepository.updateStatus(
      organizationId,
      id,
      targetStatus,
    );

    revalidatePath("/purchase-bills");
    revalidatePath(`/purchase-bills/${id}`);

    return {
      success: true,
      data: updated,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};

/**
 * Deletes a Draft Purchase Bill.
 */
export const deletePurchaseBillAction = async (
  id: string,
): Promise<PurchaseBillActionResult<null>> => {
  try {
    const { organizationId } = await resolvePurchaseBillContext();
    const existing = await purchaseBillRepository.findById(organizationId, id);
    if (!existing) {
      throw new PurchaseBillNotFoundError(id);
    }

    if (!canDeletePurchaseBill(existing)) {
      throw new PurchaseBillLockedError(existing.billNumber, existing.status);
    }

    await purchaseBillRepository.delete(organizationId, id);

    revalidatePath("/purchase-bills");

    return {
      success: true,
      data: null,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "An unexpected server error occurred.";
    return {
      success: false,
      error: message,
    };
  }
};
