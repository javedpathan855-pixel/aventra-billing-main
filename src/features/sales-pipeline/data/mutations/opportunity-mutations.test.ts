import { beforeEach, describe, expect, it, vi } from "vitest";
import { createOpportunityAction } from "./create-opportunity";
import { updateOpportunityAction } from "./update-opportunity";
import { updateOpportunityStageAction } from "./update-opportunity-stage";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("../context/sales-pipeline-context", () => ({
  resolveSalesPipelineContext: vi.fn().mockResolvedValue({
    organizationId: "org-test-123",
    userId: "user-test-456",
  }),
}));

const mockFindById = vi.fn();
const mockRepoCreate = vi.fn();
const mockRepoUpdate = vi.fn();
const mockRepoUpdateStage = vi.fn();
vi.mock(
  "../../infrastructure/repositories/prisma-sales-opportunity-repository",
  () => ({
    salesOpportunityRepository: {
      findById: (...args: unknown[]) => mockFindById(...args),
      create: (...args: unknown[]) => mockRepoCreate(...args),
      update: (...args: unknown[]) => mockRepoUpdate(...args),
      updateStage: (...args: unknown[]) => mockRepoUpdateStage(...args),
    },
  }),
);

const mockCustomerFindById = vi.fn();
vi.mock(
  "@/features/customers/infrastructure/repositories/prisma-customer-repository",
  () => ({
    customerRepository: {
      findById: (...args: unknown[]) => mockCustomerFindById(...args),
    },
  }),
);

const openOpp = {
  id: "opp-1",
  organizationId: "org-test-123",
  stage: "NEGOTIATION",
};

describe("opportunity actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCustomerFindById.mockResolvedValue({ id: "cust-1" });
  });

  it("rejects a terminal WON stage on create", async () => {
    const result = await createOpportunityAction({
      title: "Big Deal",
      customerName: "Acme Corp",
      stage: "WON",
      estimatedValue: 100000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Validation failed");
    expect(mockRepoCreate).not.toHaveBeenCalled();
  });

  it("rejects a customer from another organization on create", async () => {
    mockCustomerFindById.mockResolvedValue(null);

    const result = await createOpportunityAction({
      title: "Big Deal",
      customerId: "cust-foreign",
      customerName: "Foreign Corp",
      estimatedValue: 100000,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("does not exist in this organization");
    expect(mockCustomerFindById).toHaveBeenCalledWith(
      "org-test-123",
      "cust-foreign",
    );
    expect(mockRepoCreate).not.toHaveBeenCalled();
  });

  it("rejects a forged LOST -> WON stage change", async () => {
    mockFindById.mockResolvedValue({ ...openOpp, stage: "LOST" });

    const result = await updateOpportunityStageAction("opp-1", {
      stage: "WON",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
    expect(mockRepoUpdateStage).not.toHaveBeenCalled();
  });

  it("allows an open -> WON stage change", async () => {
    mockFindById.mockResolvedValue(openOpp);
    mockRepoUpdateStage.mockResolvedValue({ ...openOpp, stage: "WON" });

    const result = await updateOpportunityStageAction("opp-1", {
      stage: "WON",
    });

    expect(result.success).toBe(true);
    expect(mockRepoUpdateStage).toHaveBeenCalledWith("opp-1", "org-test-123", {
      stage: "WON",
      lossReason: null,
    });
  });

  it("rejects a forged terminal escape through the generic update", async () => {
    mockFindById.mockResolvedValue({ ...openOpp, stage: "WON" });

    const result = await updateOpportunityAction("opp-1", {
      stage: "QUALIFIED",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
    expect(mockRepoUpdate).not.toHaveBeenCalled();
  });

  it("rejects a customer from another organization on update", async () => {
    mockFindById.mockResolvedValue(openOpp);
    mockCustomerFindById.mockResolvedValue(null);

    const result = await updateOpportunityAction("opp-1", {
      customerId: "cust-foreign",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("does not exist in this organization");
    expect(mockRepoUpdate).not.toHaveBeenCalled();
  });
});
