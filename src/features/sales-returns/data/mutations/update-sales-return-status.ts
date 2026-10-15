"use server";

import { revalidatePath } from "next/cache";
import { resolveSalesReturnContext } from "../context/sales-return-context";
import { salesReturnRepository } from "../../infrastructure/repositories/prisma-sales-return-repository";
import { updateSalesReturnStatusSchema } from "../validators/sales-return-schemas";
import type {
  UpdateSalesReturnStatusInputDto,
  SalesReturnActionResult,
} from "../dto/sales-return-dto";
import type { SalesReturn } from "../../domain/entities/sales-return";

export const updateSalesReturnStatusAction = async (
  id: string,
  input: UpdateSalesReturnStatusInputDto,
): Promise<SalesReturnActionResult<SalesReturn>> => {
  try {
    const { organizationId } = await resolveSalesReturnContext();

    const parseResult = updateSalesReturnStatusSchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        const pathKey = issue.path.join(".");
        fieldErrors[pathKey] = issue.message;
      }
      return {
        success: false,
        error: "Validation failed.",
        fieldErrors,
      };
    }

    const data = parseResult.data;

    const updated = await salesReturnRepository.updateStatus(id, organizationId, {
      status: data.status,
      receivedQuantities: data.receivedQuantities,
      dispositions: data.dispositions,
      createCreditNote: data.createCreditNote,
    });

    revalidatePath("/sales-returns");
    revalidatePath(`/sales-returns/${id}`);
    if (updated.invoiceId) {
      revalidatePath(`/invoices/${updated.invoiceId}`);
      revalidatePath("/invoices");
    }
    if (updated.creditNoteId) {
      revalidatePath("/credit-notes");
      revalidatePath(`/credit-notes/${updated.creditNoteId}`);
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
