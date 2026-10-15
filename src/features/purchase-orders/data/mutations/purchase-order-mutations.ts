"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/shared/lib/prisma";
import { resolvePurchaseOrderContext } from "../context/purchase-order-context";
import { purchaseOrderRepository } from "../../infrastructure/repositories/prisma-purchase-order-repository";
import { supplierRepository } from "@/features/suppliers/infrastructure/repositories/prisma-supplier-repository";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import { purchaseSettingsRepository } from "@/features/purchase-settings";
import {
  canDeletePurchaseOrder,
  canEditPurchaseOrder,
  canRecordReceiving,
  validatePurchaseOrderStatusTransition,
} from "../../domain/rules/purchase-order-lifecycle-rules";
import {
  createPurchaseOrderSchema,
  updatePurchaseOrderSchema,
  recordReceivingSchema,
} from "../validators/purchase-order-schemas";
import type {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  RecordReceivingDto,
  PurchaseOrderActionResult,
} from "../dto/purchase-order-dto";
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
} from "../../domain/entities/purchase-order";
import {
  PurchaseOrderLockedError,
  PurchaseOrderNotFoundError,
  InvalidPurchaseOrderReferenceError,
  OverReceivingError,
} from "../../domain/errors/purchase-order-errors";

/**
 * Verifies that a referenced supplier belongs to the calling organization.
 */
export const assertSupplierInOrganization = async (
  organizationId: string,
  supplierId: string,
): Promise<void> => {
  const supplier = await supplierRepository.findById(organizationId, supplierId);
  if (!supplier) {
    throw new InvalidPurchaseOrderReferenceError("Supplier", supplierId);
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
      throw new InvalidPurchaseOrderReferenceError("Product", ids[idx]);
    }
  });
};

/**
 * Creates a new Purchase Order. Number allocation is guaranteed unique and
 * organization-scoped via Purchase Settings. Server recomputes all totals.
 */
export const createPurchaseOrderAction = async (
  input: CreatePurchaseOrderDto,
): Promise<PurchaseOrderActionResult<PurchaseOrder>> => {
  try {
    const parseResult = createPurchaseOrderSchema.safeParse(input);
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

    const { organizationId } = await resolvePurchaseOrderContext();
    const data = parseResult.data;

    if (data.supplierId) {
      await assertSupplierInOrganization(organizationId, data.supplierId);
    }
    await assertProductsInOrganization(
      organizationId,
      data.items.map((it) => it.productId),
    );

    const purchaseSettings = await purchaseSettingsRepository.getSettings(
      organizationId,
    );

    const prisma = getPrisma();
    const order = await prisma.$transaction(async (tx) => {
      let finalOrderNumber = data.orderNumber?.trim();
      if (!finalOrderNumber) {
        const allocated =
          await purchaseSettingsRepository.allocateNextPurchaseOrderNumber(
            organizationId,
            tx,
          );
        finalOrderNumber = allocated.allocatedNumber;
      } else {
        const existing = await purchaseOrderRepository.findByNumber(
          organizationId,
          finalOrderNumber,
          tx,
        );

        if (existing) {
          throw new Error(
            `A purchase order with number "${finalOrderNumber}" already exists in this organization.`,
          );
        }
      }

      return purchaseOrderRepository.create(
        organizationId,
        {
          orderNumber: finalOrderNumber,
          supplierId: data.supplierId || null,
          supplierName: data.supplierName,
          supplierEmail: data.supplierEmail || null,
          supplierAddress: data.supplierAddress || null,
          supplierGstin: data.supplierGstin || null,
          supplierPlaceOfSupply: data.supplierPlaceOfSupply || null,
          orderDate: new Date(data.orderDate),
          expectedDeliveryDate: data.expectedDeliveryDate
            ? new Date(data.expectedDeliveryDate)
            : null,
          referenceNumber: data.referenceNumber || null,
          status: (data.status as PurchaseOrderStatus) || "Draft",
          taxMode: data.taxMode || "CGST_SGST",
          currency: data.currency || "INR (₹)",
          paymentTerms:
            data.paymentTerms || purchaseSettings.defaultPaymentTerms || null,
          notes:
            data.notes ?? purchaseSettings.defaultPurchaseOrderNotes ?? null,
          terms:
            data.terms ?? purchaseSettings.defaultPurchaseOrderTerms ?? null,
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
            receivedQuantity: 0,
            unitPrice: it.unitPrice,
            discount: it.discount || 0,
            taxRate: it.taxRate ?? 18,
            sortOrder: idx,
          })),
        },
        tx,
      );
    });

    revalidatePath("/purchase-orders");
    revalidatePath(`/purchase-orders/${order.id}`);

    return {
      success: true,
      data: order,
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
 * Updates an existing Draft Purchase Order. Non-draft orders are locked.
 */
export const updatePurchaseOrderAction = async (
  id: string,
  input: UpdatePurchaseOrderDto,
): Promise<PurchaseOrderActionResult<PurchaseOrder>> => {
  try {
    const parseResult = updatePurchaseOrderSchema.safeParse(input);
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

    const { organizationId } = await resolvePurchaseOrderContext();
    const existing = await purchaseOrderRepository.findById(organizationId, id);
    if (!existing) {
      throw new PurchaseOrderNotFoundError(id);
    }

    if (!canEditPurchaseOrder(existing)) {
      throw new PurchaseOrderLockedError(existing.orderNumber, existing.status);
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
    const updated = await purchaseOrderRepository.update(organizationId, id, {
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
      ...(data.orderDate && { orderDate: new Date(data.orderDate) }),
      ...(data.expectedDeliveryDate !== undefined && {
        expectedDeliveryDate: data.expectedDeliveryDate
          ? new Date(data.expectedDeliveryDate)
          : null,
      }),
      ...(data.referenceNumber !== undefined && {
        referenceNumber: data.referenceNumber,
      }),
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

    revalidatePath("/purchase-orders");
    revalidatePath(`/purchase-orders/${id}`);

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
 * Transitions Purchase Order status (e.g. Draft -> Confirmed, Confirmed -> Cancelled).
 */
export const transitionPurchaseOrderStatusAction = async (
  id: string,
  targetStatus: PurchaseOrderStatus,
): Promise<PurchaseOrderActionResult<PurchaseOrder>> => {
  try {
    const { organizationId } = await resolvePurchaseOrderContext();
    const existing = await purchaseOrderRepository.findById(organizationId, id);
    if (!existing) {
      throw new PurchaseOrderNotFoundError(id);
    }

    validatePurchaseOrderStatusTransition(existing.status, targetStatus);

    const updated = await purchaseOrderRepository.updateStatus(
      organizationId,
      id,
      targetStatus,
    );

    revalidatePath("/purchase-orders");
    revalidatePath(`/purchase-orders/${id}`);

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
 * Deletes a Draft Purchase Order.
 */
export const deletePurchaseOrderAction = async (
  id: string,
): Promise<PurchaseOrderActionResult<null>> => {
  try {
    const { organizationId } = await resolvePurchaseOrderContext();
    const existing = await purchaseOrderRepository.findById(organizationId, id);
    if (!existing) {
      throw new PurchaseOrderNotFoundError(id);
    }

    if (!canDeletePurchaseOrder(existing)) {
      throw new PurchaseOrderLockedError(existing.orderNumber, existing.status);
    }

    await purchaseOrderRepository.delete(organizationId, id);

    revalidatePath("/purchase-orders");

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

/**
 * Records goods receipt of line items up to the ordered quantity. Receiving
 * progress drives PartiallyReceived/Received status; creation or approval
 * alone never marks an order received.
 */
export const recordReceivingAction = async (
  purchaseOrderId: string,
  input: RecordReceivingDto,
): Promise<PurchaseOrderActionResult<PurchaseOrder>> => {
  try {
    const parseResult = recordReceivingSchema.safeParse(input);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Validation failed on receiving input.",
      };
    }

    const { organizationId } = await resolvePurchaseOrderContext();
    const existing = await purchaseOrderRepository.findById(
      organizationId,
      purchaseOrderId,
    );
    if (!existing) {
      throw new PurchaseOrderNotFoundError(purchaseOrderId);
    }

    if (!canRecordReceiving(existing)) {
      throw new Error(
        `Receiving cannot be recorded for orders in "${existing.status}" status.`,
      );
    }

    // Validate quantities
    const itemMap = new Map(existing.items.map((it) => [it.id, it]));
    for (const updateItem of parseResult.data.items) {
      const line = itemMap.get(updateItem.id);
      if (!line) {
        throw new Error(`Line item "${updateItem.id}" not found on order.`);
      }
      if (updateItem.receivedQuantity > line.quantity) {
        throw new OverReceivingError(
          line.item,
          line.quantity,
          updateItem.receivedQuantity,
        );
      }
    }

    const updated = await purchaseOrderRepository.updateItemReceiving(
      organizationId,
      purchaseOrderId,
      parseResult.data.items,
    );

    revalidatePath("/purchase-orders");
    revalidatePath(`/purchase-orders/${purchaseOrderId}`);

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
