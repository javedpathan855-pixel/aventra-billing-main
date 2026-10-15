import "server-only";

import { getAuthState } from "@/features/auth";
import {
  DebitNoteDomainError,
  UnauthorizedDebitNoteAccessError,
} from "../../domain/errors/debit-note-errors";

export type DebitNoteContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

/**
 * Resolves the authenticated organization context for debit note operations.
 * Enforces server-side authentication and organization ownership checks.
 * Exposes the caller's membership role so issuance (a financial mutation)
 * can require owner/admin server-side.
 */
export const resolveDebitNoteContext = async (): Promise<DebitNoteContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedDebitNoteAccessError();
  }

  if (state.organization === null) {
    throw new DebitNoteDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
