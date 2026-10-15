import { describe, expect, it, vi, beforeEach } from "vitest";
import { registerOrganization } from "./register-organization";

vi.mock("server-only", () => ({}));

const mockFindUserIdByEmail = vi.fn();
const mockIsSlugTaken = vi.fn();
const mockFindMemberRole = vi.fn();
vi.mock("../queries/auth-lookups", () => ({
  findUserIdByEmail: (...args: unknown[]) => mockFindUserIdByEmail(...args),
  isOrganizationSlugTaken: (...args: unknown[]) => mockIsSlugTaken(...args),
  findMemberRole: (...args: unknown[]) => mockFindMemberRole(...args),
}));

const mockSignUpEmail = vi.fn();
const mockCreateOrganization = vi.fn();
const mockSendVerificationOTP = vi.fn();
vi.mock("../../infrastructure/auth/auth", () => ({
  auth: {
    api: {
      signUpEmail: (...args: unknown[]) => mockSignUpEmail(...args),
      createOrganization: (...args: unknown[]) => mockCreateOrganization(...args),
      sendVerificationOTP: (...args: unknown[]) => mockSendVerificationOTP(...args),
    },
  },
}));

vi.mock("@/shared/lib/prisma", () => ({
  getPrisma: () => ({
    user: { delete: vi.fn() },
    organization: { findUnique: vi.fn().mockResolvedValue(null) },
  }),
}));

const newInput = {
  adminName: "Asha Owner",
  organizationName: "Acme Corp",
  organizationEmail: "owner@acme.example",
  password: "Sup3rSecretPassword!",
};

/**
 * DEF-017 regression tests: registration responses must not let
 * unauthenticated callers discover which emails are already registered.
 */
describe("registration enumeration safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsSlugTaken.mockResolvedValue(false);
  });

  it("returns the same success shape for an already-registered email without creating duplicates", async () => {
    mockFindUserIdByEmail.mockResolvedValue("user-existing-1");

    const res = await registerOrganization(newInput);

    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.organizationEmail).toBe("owner@acme.example");
    expect(res.data.otpDelivery).toBe("sent");
    // No duplicate user, organization, or email may be created/sent.
    expect(mockSignUpEmail).not.toHaveBeenCalled();
    expect(mockCreateOrganization).not.toHaveBeenCalled();
    expect(mockSendVerificationOTP).not.toHaveBeenCalled();
  });

  it("registers a genuinely new email end to end", async () => {
    mockFindUserIdByEmail
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("user-new-1");
    mockSignUpEmail.mockResolvedValue({});
    mockCreateOrganization.mockResolvedValue({ id: "org-new-1" });
    mockFindMemberRole.mockResolvedValue("owner");
    mockSendVerificationOTP.mockResolvedValue({});

    const res = await registerOrganization(newInput);

    expect(res.ok).toBe(true);
    expect(mockSignUpEmail).toHaveBeenCalled();
    expect(mockCreateOrganization).toHaveBeenCalled();
  });
});
