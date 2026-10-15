import "server-only";

import { getAuthState } from "@/features/auth";
import {
  PurchaseReportDomainError,
  UnauthorizedPurchaseReportAccessError,
} from "../../domain/errors/purchase-report-errors";

export type PurchaseReportContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolvePurchaseReportContext =
  async (): Promise<PurchaseReportContext> => {
    const state = await getAuthState();

    if (state.status !== "authenticated") {
      throw new UnauthorizedPurchaseReportAccessError("Authentication required.");
    }

    if (state.organization === null) {
      throw new PurchaseReportDomainError(
        "Active organization context is missing.",
      );
    }

    return {
      organizationId: state.organization.id,
      userId: state.user.id,
      memberRole: state.organization.role,
    };
  };
