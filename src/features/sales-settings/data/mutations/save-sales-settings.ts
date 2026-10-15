"use server";

import { revalidatePath } from "next/cache";
import { isOrganizationAdmin } from "@/features/auth";
import { resolveSalesSettingsContext } from "../context/sales-settings-context";
import { salesSettingsRepository } from "../../infrastructure/repositories/prisma-sales-settings-repository";
import { updateSalesSettingsSchema } from "../validators/sales-settings-schemas";
import type {
  SaveSalesSettingsInputDto,
  SalesSettingsActionResult,
} from "../dto/sales-settings-dto";
import type { SalesSettings } from "../../domain/entities/sales-settings";
import { UnauthorizedSalesSettingsAccessError } from "../../domain/errors/sales-settings-errors";

export const saveSalesSettingsAction = async (
  input: SaveSalesSettingsInputDto,
): Promise<SalesSettingsActionResult<SalesSettings>> => {
  try {
    const { organizationId, memberRole } = await resolveSalesSettingsContext();

    if (!isOrganizationAdmin(memberRole)) {
      throw new UnauthorizedSalesSettingsAccessError(
        "Only organization owners or admins can update sales settings.",
      );
    }

    const parseResult = updateSalesSettingsSchema.safeParse(input);
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
    const saved = await salesSettingsRepository.saveSettings(
      organizationId,
      data,
    );

    revalidatePath("/settings/sales");
    revalidatePath("/estimates");
    revalidatePath("/estimates/new");
    revalidatePath("/sales-orders");
    revalidatePath("/sales-orders/new");
    revalidatePath("/delivery-challans");
    revalidatePath("/delivery-challans/new");
    revalidatePath("/sales-returns");
    revalidatePath("/sales-returns/new");

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
