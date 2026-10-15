import "server-only";

import { getAuthState } from "@/features/auth";
import { PricingDomainError, UnauthorizedPricingAccessError } from "../../domain/rules/pricing-rules";

export type PricingContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolvePricingContext = async (): Promise<PricingContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedPricingAccessError();
  }

  if (state.organization === null) {
    throw new PricingDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
