import "server-only";

import { getAuthState } from "@/features/auth";
import {
  CategoryDomainError,
  UnauthorizedCategoryAccessError,
} from "../../domain/errors/category-errors";

export type CategoryContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolveCategoryContext = async (): Promise<CategoryContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new UnauthorizedCategoryAccessError();
  }

  if (state.organization === null) {
    throw new CategoryDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
