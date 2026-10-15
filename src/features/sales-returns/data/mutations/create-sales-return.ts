"use server";

import { revalidatePath } from "next/cache";
import { resolveSalesReturnContext } from "../context/sales-return-context";
import { salesReturnRepository } from "../../infrastructure/repositories/prisma-sales-return-repository";
import { createSalesReturnSchema } from "../validators/sales-return-schemas";
import type {
  CreateSalesReturnInputDto,
  SalesReturnActionResult,
} from "../dto/sales-return-dto";
import type { SalesReturn } from "../../domain/entities/sales-return";

export const createSalesReturnAction = async (
  input: CreateSalesReturnInputDto,
): Promise<SalesReturnActionResult<SalesReturn>> => {
  try {
    const { organizationId } = await resolveSalesReturnContext();

    const parseResult = createSalesReturnSchema.safeParse(input);
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

    const data = parseResult.data;

    const created = await salesReturnRepository.create(organizationId, {
      customerId: data.customerId || null,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      customerAddress: data.customerAddress || null,
      customerGstin: data.customerGstin || null,
      customerPlaceOfSupply: data.customerPlaceOfSupply || null,
      invoiceId: data.invoiceId || null,
      salesOrderId: data.salesOrderId || null,
      returnDate: new Date(data.returnDate),
      reason: data.reason,
      taxMode: data.taxMode,
      currency: data.currency,
      notes: data.notes || null,
      items: data.items.map((it) => ({
        productId: it.productId || null,
        invoiceItemId: it.invoiceItemId || null,
        item: it.item,
        description: it.description || null,
        hsnSac: it.hsnSac || null,
        soldQuantity: it.soldQuantity,
        returnQuantity: it.returnQuantity,
        receivedQuantity: it.receivedQuantity,
        unitPrice: it.unitPrice,
        discount: it.discount,
        taxRate: it.taxRate,
        disposition: it.disposition,
        reason: it.reason || null,
        sortOrder: it.sortOrder,
      })),
    });

    revalidatePath("/sales-returns");
    if (data.invoiceId) {
      revalidatePath(`/invoices/${data.invoiceId}`);
      revalidatePath("/invoices");
    }

    return {
      success: true,
      data: created,
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
