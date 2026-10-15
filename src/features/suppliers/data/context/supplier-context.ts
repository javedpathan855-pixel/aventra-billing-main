import "server-only";

import { getAuthState } from "@/features/auth";
import {
  SupplierDomainError,
  UnauthorizedSupplierAccessError,
} from "../../domain/errors/supplier-errors";

export type SupplierContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

/**
 * Resolves the authenticated organization context for supplier operations.
 * Enforces server-side authentication and organization ownership checks.
 * Exposes the caller's membership role so destructive operations can require
 * owner/admin server-side (DEF-006).
 */
export const resolveSupplierContext = async (): Promise<SupplierContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedSupplierAccessError();
  }

  if (state.organization === null) {
    throw new SupplierDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
