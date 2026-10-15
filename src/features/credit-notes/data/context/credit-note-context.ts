import "server-only";

import { getAuthState } from "@/features/auth";
import {
  CreditNoteDomainError,
  UnauthorizedCreditNoteAccessError,
} from "../../domain/errors/credit-note-errors";

export type CreditNoteContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

/**
 * Resolves the authenticated organization context for credit note operations.
 * Enforces server-side authentication and organization ownership checks.
 * Exposes the caller's membership role so issuance (a financial mutation)
 * can require owner/admin server-side (DEF-006).
 */
export const resolveCreditNoteContext = async (): Promise<CreditNoteContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedCreditNoteAccessError();
  }

  if (state.organization === null) {
    throw new CreditNoteDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
