import "server-only";

import { getAuthState } from "@/features/auth";
import {
  PurchaseOrderDomainError,
  UnauthorizedPurchaseOrderAccessError,
} from "../../domain/errors/purchase-order-errors";

export type PurchaseOrderContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolvePurchaseOrderContext =
  async (): Promise<PurchaseOrderContext> => {
    const state = await getAuthState();

    if (state.status !== "authenticated") {
      throw new UnauthorizedPurchaseOrderAccessError("Authentication required.");
    }

    if (state.organization === null) {
      throw new PurchaseOrderDomainError(
        "Active organization context is missing.",
      );
    }

    return {
      organizationId: state.organization.id,
      userId: state.user.id,
      memberRole: state.organization.role,
    };
  };
