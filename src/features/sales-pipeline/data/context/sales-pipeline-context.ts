import "server-only";

import { getAuthState } from "@/features/auth";
import { SalesPipelineDomainError } from "../../domain/errors/sales-pipeline-errors";

export type SalesPipelineContext = {
  organizationId: string;
  userId: string;
  memberRole: string;
};

export const resolveSalesPipelineContext = async (): Promise<SalesPipelineContext> => {
  const state = await getAuthState();

  if (state.status !== "authenticated") {
    throw new SalesPipelineDomainError("Authentication required.");
  }

  if (state.organization === null) {
    throw new SalesPipelineDomainError("Active organization context is missing.");
  }

  return {
    organizationId: state.organization.id,
    userId: state.user.id,
    memberRole: state.organization.role,
  };
};
