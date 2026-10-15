import "server-only";

import { getAuthState } from "@/features/auth";
import {
  SupplierPaymentDomainError,
  UnauthorizedSupplierPaymentAccessError,
} from "../../domain/errors/supplier-payment-errors";

export type SupplierPaymentContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolveSupplierPaymentContext =
  async (): Promise<SupplierPaymentContext> => {
    const state = await getAuthState();

    if (state.status !== "authenticated") {
      throw new UnauthorizedSupplierPaymentAccessError(
        "Authentication required.",
      );
    }

    if (state.organization === null) {
      throw new SupplierPaymentDomainError(
        "Active organization context is missing.",
      );
    }

    return {
      organizationId: state.organization.id,
      userId: state.user.id,
      memberRole: state.organization.role,
    };
  };
