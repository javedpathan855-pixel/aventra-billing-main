import "server-only";

import { getAuthState } from "@/features/auth";
import {
  InvoiceDomainError,
  UnauthorizedInvoiceAccessError,
} from "../../domain/errors/invoice-errors";

export type InvoiceContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

/**
 * Resolves the authenticated organization context for invoice operations.
 * Enforces server-side authentication and organization ownership checks.
 * Exposes the caller's membership role so mutations can enforce
 * owner/admin-only financial operations server-side (DEF-006).
 */
export const resolveInvoiceContext = async (): Promise<InvoiceContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedInvoiceAccessError();
  }

  if (state.organization === null) {
    throw new InvoiceDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
