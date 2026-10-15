import "server-only";

import { getAuthState } from "@/features/auth";
import {
  ProductDomainError,
  UnauthorizedProductAccessError,
} from "../../domain/errors/product-errors";

export type ProductContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

/**
 * Resolves the authenticated organization context for product/service operations.
 * Enforces server-side authentication and organization ownership checks.
 * Exposes the caller's membership role so destructive operations can require
 * owner/admin server-side (DEF-006).
 */
export const resolveProductContext = async (): Promise<ProductContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedProductAccessError();
  }

  if (state.organization === null) {
    throw new ProductDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
