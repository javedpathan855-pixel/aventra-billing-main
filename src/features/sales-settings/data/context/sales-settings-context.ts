import "server-only";

import { getAuthState } from "@/features/auth";
import {
  SalesSettingsDomainError,
  UnauthorizedSalesSettingsAccessError,
} from "../../domain/errors/sales-settings-errors";

export type SalesSettingsContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolveSalesSettingsContext = async (): Promise<SalesSettingsContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedSalesSettingsAccessError();
  }

  if (state.organization === null) {
    throw new SalesSettingsDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
