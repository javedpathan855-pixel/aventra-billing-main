import "server-only";

import { getAuthState } from "@/features/auth";
import {
  PaymentDomainError,
  UnauthorizedPaymentAccessError,
} from "../../domain/errors/payment-errors";

export type PaymentContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

/**
 * Resolves the authenticated organization context for payment operations.
 * Enforces server-side authentication and organization ownership checks.
 * Exposes the caller's membership role so recording and reversing cash —
 * financial mutations — can require owner/admin server-side.
 */
export const resolvePaymentContext = async (): Promise<PaymentContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedPaymentAccessError();
  }

  if (state.organization === null) {
    throw new PaymentDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
