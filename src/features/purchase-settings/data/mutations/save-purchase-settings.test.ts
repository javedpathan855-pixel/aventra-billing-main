import { beforeEach, describe, expect, it, vi } from "vitest";
import { savePurchaseSettingsAction } from "./save-purchase-settings";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

let mockMemberRole = "owner";
vi.mock("../context/purchase-settings-context", () => ({
  resolvePurchaseSettingsContext: vi.fn().mockImplementation(async () => ({
    organizationId: "org-test-123",
    userId: "user-test-456",
    memberRole: mockMemberRole,
  })),
}));

vi.mock("@/features/auth", () => ({
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

const mockSaveSettings = vi.fn();
vi.mock(
  "../../infrastructure/repositories/prisma-purchase-settings-repository",
  () => ({
    purchaseSettingsRepository: {
      saveSettings: (...args: unknown[]) => mockSaveSettings(...args),
    },
  }),
);

describe("save-purchase-settings mutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemberRole = "owner";
  });

  it("saves valid purchase settings for the calling organization", async () => {
    mockSaveSettings.mockResolvedValue({
      id: "pset-1",
      organizationId: "org-test-123",
      purchaseOrderPrefix: "PO-",
      purchaseOrderSuffix: null,
      purchaseOrderNextNumber: 5,
      purchaseOrderPadding: 4,
      defaultDeliveryDays: 15,
      defaultPaymentTerms: "Net 30 days",
      defaultPurchaseOrderNotes: null,
      defaultPurchaseOrderTerms: null,
    });

    const result = await savePurchaseSettingsAction({
      purchaseOrderPrefix: "PO-",
      purchaseOrderNextNumber: 5,
      purchaseOrderPadding: 4,
      defaultDeliveryDays: 15,
    });

    expect(result.success).toBe(true);
    expect(mockSaveSettings).toHaveBeenCalledWith(
      "org-test-123",
      expect.objectContaining({
        purchaseOrderPrefix: "PO-",
        purchaseOrderNextNumber: 5,
      }),
    );
  });

  it("rejects invalid numbering configuration", async () => {
    const result = await savePurchaseSettingsAction({
      purchaseOrderPrefix: "",
      purchaseOrderNextNumber: 0,
    });

    expect(result.success).toBe(false);
    expect(mockSaveSettings).not.toHaveBeenCalled();
  });

  it("rejects settings updates from non-admin members", async () => {
    mockMemberRole = "member";

    const result = await savePurchaseSettingsAction({
      purchaseOrderPrefix: "PO-",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Only organization owners or admins");
    expect(mockSaveSettings).not.toHaveBeenCalled();
  });
});
