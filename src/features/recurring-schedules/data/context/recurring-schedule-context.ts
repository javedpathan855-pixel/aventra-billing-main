import "server-only";

import { getAuthState } from "@/features/auth";
import {
  RecurringScheduleDomainError,
  UnauthorizedRecurringAccessError,
} from "../../domain/errors/recurring-errors";

export type RecurringScheduleContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

/**
 * Resolves the authenticated organization context for recurring schedule
 * operations. Enforces server-side authentication and organization checks.
 * Exposes the caller's membership role so schedule activation, manual runs,
 * and destructive operations can require owner/admin server-side.
 */
export const resolveRecurringScheduleContext = async (): Promise<RecurringScheduleContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedRecurringAccessError();
  }

  if (state.organization === null) {
    throw new RecurringScheduleDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
