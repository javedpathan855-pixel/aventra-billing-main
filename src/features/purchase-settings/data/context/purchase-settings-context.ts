import "server-only";

import { getAuthState } from "@/features/auth";
import {
  PurchaseSettingsDomainError,
  UnauthorizedPurchaseSettingsAccessError,
} from "../../domain/errors/purchase-settings-errors";

export type PurchaseSettingsContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolvePurchaseSettingsContext =
  async (): Promise<PurchaseSettingsContext> => {
    const state = await getAuthState();

    if (state.status !== "authenticated") {
      throw new UnauthorizedPurchaseSettingsAccessError(
        "Authentication required.",
      );
    }

    if (state.organization === null) {
      throw new PurchaseSettingsDomainError(
        "Active organization context is missing.",
      );
    }

    return {
      organizationId: state.organization.id,
      userId: state.user.id,
      memberRole: state.organization.role,
    };
  };
