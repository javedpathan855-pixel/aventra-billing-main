"use server";

import { revalidatePath } from "next/cache";
import { getPrisma } from "@/shared/lib/prisma";
import { resolvePurchaseReturnContext } from "../context/purchase-return-context";
import { purchaseReturnRepository } from "../../infrastructure/repositories/prisma-purchase-return-repository";
import { supplierRepository } from "@/features/suppliers/infrastructure/repositories/prisma-supplier-repository";
import { productRepository } from "@/features/products/infrastructure/repositories/prisma-product-repository";
import { purchaseBillRepository } from "@/features/purchase-bills/infrastructure/repositories/prisma-purchase-bill-repository";
import { purchaseOrderRepository } from "@/features/purchase-orders/infrastructure/repositories/prisma-purchase-order-repository";
import { purchaseSettingsRepository } from "@/features/purchase-settings";
import {
  assertReturnableQuantity,
  assertValidPurchaseReturnStatusTransition,
  calculateRemainingReturnableQuantity,
  canDeletePurchaseReturn,
} from "../../domain/rules/purchase-return-rules";
import {
  createPurchaseReturnSchema,
  updatePurchaseReturnStatusSchema,
} from "../validators/purchase-return-schemas";
import type {
  CreatePurchaseReturnInputDto,
  UpdatePurchaseReturnStatusInputDto,
  PurchaseReturnActionResult,
} from "../dto/purchase-return-dto";
import type {
  PurchaseReturn,
  PurchaseReturnStatus,
} from "../../domain/entities/purchase-return";
import type { PurchaseBill } from "@/features/purchase-bills";
import type { PurchaseOrder } from "@/features/purchase-orders";
import {
  PurchaseReturnLockedError,
  PurchaseReturnNotFoundError,
  InvalidPurchaseReturnReferenceError,
} from "../../domain/errors/purchase-return-errors";

type PurchaseOrderLink = Pick<PurchaseOrder, "id" | "orderNumber">;

/**
 * Verifies that a referenced supplier belongs to the calling organization.
 */
export const assertSupplierInOrganization = async (
  organizationId: string,
  supplierId: string,
): Promise<void> => {
  const supplier = await supplierRepository.findById(organizationId, supplierId);
  if (!supplier) {
    throw new InvalidPurchaseReturnReferenceError("Supplier", supplierId);
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
      throw new InvalidPurchaseReturnReferenceError("Product", ids[idx]);
    }
  });
};

/**
 * Verifies that a referenced purchase bill belongs to the calling
 * organization, is posted (Confirmed), and belongs to the same supplier
 * counterparty as the return. Returns the bill for snapshotting.
 */
export const assertReturnablePurchaseBill = async (
  organizationId: string,
  purchaseBillId: string,
  supplierId: string | null,
): Promise<PurchaseBill> => {
  const bill = await purchaseBillRepository.findById(
    organizationId,
    purchaseBillId,
  );
  if (!bill) {
    throw new InvalidPurchaseReturnReferenceError(
      "Purchase Bill",
      purchaseBillId,
    );
  }
  if (bill.status !== "Confirmed") {
    throw new InvalidPurchaseReturnReferenceError(
      `Purchase Bill (only Confirmed bills can be returned)`,
      purchaseBillId,
    );
  }
  if ((bill.supplierId || null) !== (supplierId || null)) {
    throw new InvalidPurchaseReturnReferenceError(
      "Purchase Bill of this supplier",
      purchaseBillId,
    );
  }
  return bill;
};

/**
 * Verifies that a referenced purchase order belongs to the calling
 * organization. Returns the order for snapshotting.
 */
export const assertPurchaseOrderInOrganization = async (
  organizationId: string,
  purchaseOrderId: string,
): Promise<PurchaseOrderLink> => {
  const order = await purchaseOrderRepository.findById(
    organizationId,
    purchaseOrderId,
  );
  if (!order) {
    throw new InvalidPurchaseReturnReferenceError(
      "Purchase Order",
      purchaseOrderId,
    );
  }
  return order;
};

/**
 * Creates a new Purchase Return. The return number is allocated from Purchase
 * Settings (or validated as a custom per-org unique value), remaining
 * quantities are enforced against authoritative in-transaction state, and all
 * totals are recomputed on the server.
 */
export const createPurchaseReturnAction = async (
  input: CreatePurchaseReturnInputDto,
): Promise<PurchaseReturnActionResult<PurchaseReturn>> => {
  try {
    const parseResult = createPurchaseReturnSchema.safeParse(input);
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

    const { organizationId } = await resolvePurchaseReturnContext();
    const data = parseResult.data;

    if (data.supplierId) {
      await assertSupplierInOrganization(organizationId, data.supplierId);
    }
    await assertProductsInOrganization(
      organizationId,
      data.items.map((it) => it.productId),
    );

    let linkedBill: PurchaseBill | null = null;
    if (data.purchaseBillId) {
      linkedBill = await assertReturnablePurchaseBill(
        organizationId,
        data.purchaseBillId,
        data.supplierId || null,
      );
    }
    let linkedOrder: PurchaseOrderLink | null = null;
    if (data.purchaseOrderId) {
      linkedOrder = await assertPurchaseOrderInOrganization(
        organizationId,
        data.purchaseOrderId,
      );
    }

    const purchaseSettings = await purchaseSettingsRepository.getSettings(
      organizationId,
    );

    const prisma = getPrisma();
    const purchaseReturn = await prisma.$transaction(async (tx) => {
      let finalReturnNumber = data.returnNumber?.trim();
      if (!finalReturnNumber) {
        const allocated =
          await purchaseSettingsRepository.allocateNextPurchaseReturnNumber(
            organizationId,
            tx,
          );
        finalReturnNumber = allocated.allocatedNumber;
      } else {
        const existing = await purchaseReturnRepository.findByNumber(
          organizationId,
          finalReturnNumber,
          tx,
        );

        if (existing) {
          throw new Error(
            `A purchase return with number "${finalReturnNumber}" already exists in this organization.`,
          );
        }
      }

      // Enforce remaining quantities against authoritative in-transaction
      // state: a pre-check outside the transaction cannot serialize
      // concurrent returns against the same bill lines.
      const billLineById = new Map(
        (linkedBill?.items || []).map((line) => [line.id, line]),
      );
      for (const item of data.items) {
        if (!item.purchaseBillItemId) {
          continue;
        }
        const billLine = billLineById.get(item.purchaseBillItemId);
        if (!billLine) {
          throw new InvalidPurchaseReturnReferenceError(
            "Purchase Bill line",
            item.purchaseBillItemId,
          );
        }
        const previouslyReturned =
          await purchaseReturnRepository.sumReturnedForBillItem(
            organizationId,
            item.purchaseBillItemId,
            tx,
          );
        const remaining = calculateRemainingReturnableQuantity(
          billLine.quantity,
          previouslyReturned,
        );
        assertReturnableQuantity(item.item, item.returnQuantity, remaining);
      }

      return purchaseReturnRepository.create(
        organizationId,
        {
          returnNumber: finalReturnNumber,
          supplierId: data.supplierId || null,
          supplierName: data.supplierName,
          supplierEmail: data.supplierEmail || null,
          supplierAddress: data.supplierAddress || null,
          supplierGstin: data.supplierGstin || null,
          supplierPlaceOfSupply: data.supplierPlaceOfSupply || null,
          purchaseBillId: data.purchaseBillId || null,
          purchaseBillNumber: linkedBill ? linkedBill.billNumber : null,
          purchaseOrderId: data.purchaseOrderId || null,
          purchaseOrderNumber: linkedOrder ? linkedOrder.orderNumber : null,
          returnDate: new Date(data.returnDate),
          reason: data.reason,
          taxMode: data.taxMode || "CGST_SGST",
          currency: data.currency || "INR (₹)",
          notes:
            data.notes ?? purchaseSettings.defaultPurchaseReturnNotes ?? null,
          terms:
            data.terms ?? purchaseSettings.defaultPurchaseReturnTerms ?? null,
          items: data.items.map((it, idx) => ({
            productId: it.productId || null,
            purchaseBillItemId: it.purchaseBillItemId || null,
            item: it.item,
            description: it.description || null,
            hsnSac: it.hsnSac || null,
            billedQuantity: it.billedQuantity,
            returnQuantity: it.returnQuantity,
            unitPrice: it.unitPrice,
            discount: it.discount || 0,
            taxRate: it.taxRate ?? 18,
            disposition: it.disposition || "RESTOCK",
            reason: it.reason || null,
            sortOrder: it.sortOrder ?? idx,
          })),
        },
        tx,
      );
    });

    revalidatePath("/purchase-returns");
    revalidatePath(`/purchase-returns/${purchaseReturn.id}`);
    if (data.purchaseBillId) {
      revalidatePath("/purchase-bills");
      revalidatePath(`/purchase-bills/${data.purchaseBillId}`);
    }

    return {
      success: true,
      data: purchaseReturn,
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
 * Transitions Purchase Return status (Draft -> Approved, Approved ->
 * Completed, either -> Cancelled).
 */
export const updatePurchaseReturnStatusAction = async (
  id: string,
  input: UpdatePurchaseReturnStatusInputDto,
): Promise<PurchaseReturnActionResult<PurchaseReturn>> => {
  try {
    const parseResult = updatePurchaseReturnStatusSchema.safeParse(input);
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

    const { organizationId } = await resolvePurchaseReturnContext();
    const existing = await purchaseReturnRepository.findById(
      organizationId,
      id,
    );
    if (!existing) {
      throw new PurchaseReturnNotFoundError(id);
    }

    assertValidPurchaseReturnStatusTransition(
      existing.status,
      parseResult.data.status as PurchaseReturnStatus,
    );

    const updated = await purchaseReturnRepository.updateStatus(
      organizationId,
      id,
      { status: parseResult.data.status as PurchaseReturnStatus },
    );

    revalidatePath("/purchase-returns");
    revalidatePath(`/purchase-returns/${id}`);
    if (updated.purchaseBillId) {
      revalidatePath("/purchase-bills");
      revalidatePath(`/purchase-bills/${updated.purchaseBillId}`);
    }

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
 * Deletes a Draft Purchase Return.
 */
export const deletePurchaseReturnAction = async (
  id: string,
): Promise<PurchaseReturnActionResult<null>> => {
  try {
    const { organizationId } = await resolvePurchaseReturnContext();
    const existing = await purchaseReturnRepository.findById(
      organizationId,
      id,
    );
    if (!existing) {
      throw new PurchaseReturnNotFoundError(id);
    }

    if (!canDeletePurchaseReturn(existing.status)) {
      throw new PurchaseReturnLockedError(
        existing.returnNumber,
        existing.status,
      );
    }

    await purchaseReturnRepository.delete(organizationId, id);

    revalidatePath("/purchase-returns");

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
