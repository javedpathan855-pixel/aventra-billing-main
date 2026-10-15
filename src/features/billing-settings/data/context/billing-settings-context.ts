import "server-only";

import { getAuthState } from "@/features/auth";
import {
  BillingSettingsDomainError,
  UnauthorizedSettingsAccessError,
} from "../../domain/errors/billing-settings-errors";

export type BillingSettingsContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

/**
 * Resolves the authenticated organization context for billing settings operations.
 * Enforces server-side authentication and organization ownership checks.
 * Exposes the caller's membership role so numbering/financial settings
 * mutations can require owner/admin server-side (DEF-006).
 */
export const resolveBillingSettingsContext = async (): Promise<BillingSettingsContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedSettingsAccessError();
  }

  if (state.organization === null) {
    throw new BillingSettingsDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
