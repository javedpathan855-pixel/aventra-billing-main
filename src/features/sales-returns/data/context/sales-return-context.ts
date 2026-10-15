import "server-only";

import { getAuthState } from "@/features/auth";
import {
  SalesReturnDomainError,
  UnauthorizedReturnAccessError,
} from "../../domain/errors/sales-return-errors";

export type SalesReturnContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolveSalesReturnContext = async (): Promise<SalesReturnContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedReturnAccessError("Authentication required.");
  }

  if (state.organization === null) {
    throw new SalesReturnDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
