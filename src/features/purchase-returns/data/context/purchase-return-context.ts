import "server-only";

import { getAuthState } from "@/features/auth";
import {
  PurchaseReturnDomainError,
  UnauthorizedPurchaseReturnAccessError,
} from "../../domain/errors/purchase-return-errors";

export type PurchaseReturnContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolvePurchaseReturnContext =
  async (): Promise<PurchaseReturnContext> => {
    const state = await getAuthState();

    if (state.status !== "authenticated") {
      throw new UnauthorizedPurchaseReturnAccessError("Authentication required.");
    }

    if (state.organization === null) {
      throw new PurchaseReturnDomainError(
        "Active organization context is missing.",
      );
    }

    return {
      organizationId: state.organization.id,
      userId: state.user.id,
      memberRole: state.organization.role,
    };
  };
