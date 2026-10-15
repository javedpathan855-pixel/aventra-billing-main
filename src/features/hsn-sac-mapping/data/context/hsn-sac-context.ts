import "server-only";

import { getAuthState } from "@/features/auth";
import {
  HsnSacDomainError,
  UnauthorizedHsnSacAccessError,
} from "../../domain/errors/hsn-sac-errors";

export type HsnSacContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

/**
 * Classification master data is global, but every read still resolves the
 * authenticated organization context so catalogue-usage queries stay scoped
 * and anonymous access is impossible.
 */
export const resolveHsnSacContext = async (): Promise<HsnSacContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedHsnSacAccessError();
  }

  if (state.organization === null) {
    throw new HsnSacDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
