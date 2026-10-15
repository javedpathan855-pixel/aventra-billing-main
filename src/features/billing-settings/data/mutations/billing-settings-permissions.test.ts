import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  allocateDocumentNumberAction,
  updateBillingSettingsAction,
} from "./billing-settings-mutations";
import { resolveBillingSettingsContext } from "../context/billing-settings-context";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

vi.mock("../context/billing-settings-context", () => ({
  resolveBillingSettingsContext: vi.fn(),
}));

const mockSaveSettings = vi.fn();
const mockAllocate = vi.fn();
vi.mock("../../infrastructure/repositories/prisma-billing-settings-repository", () => ({
  billingSettingsRepository: {
    saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
    allocateNextNumber: (...args: unknown[]) => mockAllocate(...args),
  },
}));

/**
 * DEF-006 regression tests: document-numbering and financial settings are
 * owner/admin-only, enforced server-side.
 */
describe("billing settings authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies settings updates to a plain member", async () => {
    vi.mocked(resolveBillingSettingsContext).mockResolvedValue({
      organizationId: "org-1",
      userId: "user-member",
      memberRole: "member",
    });

    const res = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "INV-",
      nextNumber: 5,
      padding: 4,
    });

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toContain("don't have permission to modify billing settings");
    expect(mockSaveSettings).not.toHaveBeenCalled();
  });

  it("denies sequence allocation to a plain member", async () => {
    vi.mocked(resolveBillingSettingsContext).mockResolvedValue({
      organizationId: "org-1",
      userId: "user-member",
      memberRole: "member",
    });

    const res = await allocateDocumentNumberAction("INVOICE");

    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.error).toContain("don't have permission to allocate document numbers");
    expect(mockAllocate).not.toHaveBeenCalled();
  });

  it("allows an admin to update settings", async () => {
    vi.mocked(resolveBillingSettingsContext).mockResolvedValue({
      organizationId: "org-1",
      userId: "user-admin",
      memberRole: "admin",
    });
    mockSaveSettings.mockResolvedValue({
      id: "set-1",
      organizationId: "org-1",
      documentType: "INVOICE",
      prefix: "INV-",
      suffix: null,
      nextNumber: 5,
      padding: 4,
      defaultNotes: null,
      defaultTerms: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await updateBillingSettingsAction({
      documentType: "INVOICE",
      prefix: "INV-",
      nextNumber: 5,
      padding: 4,
    });

    expect(res.success).toBe(true);
  });
});
