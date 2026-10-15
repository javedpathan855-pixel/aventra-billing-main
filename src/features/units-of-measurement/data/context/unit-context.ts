import "server-only";

import { getAuthState } from "@/features/auth";
import {
  UnauthorizedUnitAccessError,
  UnitDomainError,
} from "../../domain/errors/unit-errors";

export type UnitContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolveUnitContext = async (): Promise<UnitContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedUnitAccessError();
  }

  if (state.organization === null) {
    throw new UnitDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
