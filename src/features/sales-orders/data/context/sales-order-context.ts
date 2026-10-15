import "server-only";

import { getAuthState } from "@/features/auth";
import {
  SalesOrderDomainError,
  UnauthorizedSalesOrderAccessError,
} from "../../domain/errors/sales-order-errors";

export type SalesOrderContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolveSalesOrderContext = async (): Promise<SalesOrderContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedSalesOrderAccessError("Authentication required.");
  }

  if (state.organization === null) {
    throw new SalesOrderDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
