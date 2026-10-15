import "server-only";

import { getAuthState } from "@/features/auth";
import { getPrisma } from "@/shared/lib/prisma";

export type SupplierTaxContext = {
  state?: string;
  gstNumber?: string;
  organizationName?: string;
};

/**
 * Resolves the authenticated supplier organization's GST registration state and profile.
 * Single source of truth for invoice Place of Supply inter/intra-state tax determination.
 *
 * Accepts an optional organization ID for server-side system flows (e.g. the
 * recurring scheduler) that operate without a user session. When omitted, the
 * organization comes from the authenticated session as before.
 */
export const getSupplierTaxContext = async (
  organizationIdOverride?: string,
): Promise<SupplierTaxContext> => {
  if (!organizationIdOverride) {
    const authState = await getAuthState();
    if (authState.status !== "authenticated" || !authState.organization) {
      return {
        state: "27-Maharashtra",
      };
    }

    const organizationId = authState.organization.id;
    const prisma = getPrisma();

    const [address, taxProfile] = await Promise.all([
      prisma.organizationAddress.findUnique({
        where: { organizationId },
        select: { state: true },
      }),
      prisma.organizationTaxProfile.findUnique({
        where: { organizationId },
        select: { gstNumber: true },
      }),
    ]);

    return {
      state: address?.state || "27-Maharashtra",
      gstNumber: taxProfile?.gstNumber || undefined,
      organizationName: authState.organization.name,
    };
  }

  const prisma = getPrisma();

  const [address, taxProfile, organization] = await Promise.all([
    prisma.organizationAddress.findUnique({
      where: { organizationId: organizationIdOverride },
      select: { state: true },
    }),
    prisma.organizationTaxProfile.findUnique({
      where: { organizationId: organizationIdOverride },
      select: { gstNumber: true },
    }),
    prisma.organization.findUnique({
      where: { id: organizationIdOverride },
      select: { name: true },
    }),
  ]);

  return {
    state: address?.state || "27-Maharashtra",
    gstNumber: taxProfile?.gstNumber || undefined,
    organizationName: organization?.name,
  };
};
