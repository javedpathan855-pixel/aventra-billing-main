import "server-only";

import { getAuthState } from "@/features/auth";
import {
  PurchaseBillDomainError,
  UnauthorizedPurchaseBillAccessError,
} from "../../domain/errors/purchase-bill-errors";

export type PurchaseBillContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolvePurchaseBillContext =
  async (): Promise<PurchaseBillContext> => {
    const state = await getAuthState();

    if (state.status !== "authenticated") {
      throw new UnauthorizedPurchaseBillAccessError("Authentication required.");
    }

    if (state.organization === null) {
      throw new PurchaseBillDomainError(
        "Active organization context is missing.",
      );
    }

    return {
      organizationId: state.organization.id,
      userId: state.user.id,
      memberRole: state.organization.role,
    };
  };
