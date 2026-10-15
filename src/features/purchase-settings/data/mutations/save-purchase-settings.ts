"use server";

import { revalidatePath } from "next/cache";
import { isOrganizationAdmin } from "@/features/auth";
import { resolvePurchaseSettingsContext } from "../context/purchase-settings-context";
import { purchaseSettingsRepository } from "../../infrastructure/repositories/prisma-purchase-settings-repository";
import { updatePurchaseSettingsSchema } from "../validators/purchase-settings-schemas";
import type {
  SavePurchaseSettingsInputDto,
  PurchaseSettingsActionResult,
} from "../dto/purchase-settings-dto";
import type { PurchaseSettings } from "../../domain/entities/purchase-settings";
import { UnauthorizedPurchaseSettingsAccessError } from "../../domain/errors/purchase-settings-errors";

export const savePurchaseSettingsAction = async (
  input: SavePurchaseSettingsInputDto,
): Promise<PurchaseSettingsActionResult<PurchaseSettings>> => {
  try {
    const { organizationId, memberRole } =
      await resolvePurchaseSettingsContext();

    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedPurchaseSettingsAccessError(
        "Only organization owners or admins can update purchase settings.",
      );
    }

    const parseResult = updatePurchaseSettingsSchema.safeParse(input);
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
    const saved = await purchaseSettingsRepository.saveSettings(
      organizationId,
      data,
    );

    revalidatePath("/settings/purchases");
    revalidatePath("/purchase-orders");
    revalidatePath("/purchase-orders/new");
    revalidatePath("/purchase-bills");
    revalidatePath("/purchase-bills/new");
    revalidatePath("/purchase-returns");
    revalidatePath("/purchase-returns/new");

    return {
      success: true,
      data: saved,
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
