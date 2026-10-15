import "server-only";

import { getAuthState } from "@/features/auth";
import {
  DeliveryChallanDomainError,
  UnauthorizedChallanAccessError,
} from "../../domain/errors/delivery-challan-errors";

export type DeliveryChallanContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolveDeliveryChallanContext = async (): Promise<DeliveryChallanContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedChallanAccessError("Authentication required.");
  }

  if (state.organization === null) {
    throw new DeliveryChallanDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
