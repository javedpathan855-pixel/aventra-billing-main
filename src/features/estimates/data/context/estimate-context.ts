import "server-only";

import { getAuthState } from "@/features/auth";
import {
  EstimateDomainError,
  UnauthorizedEstimateAccessError,
} from "../../domain/errors/estimate-errors";

export type EstimateContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolveEstimateContext = async (): Promise<EstimateContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedEstimateAccessError("Authentication required.");
  }

  if (state.organization === null) {
    throw new EstimateDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
