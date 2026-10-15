import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST, GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("@/features/auth", () => ({
  getAuthState: vi.fn(),
  isOrganizationAdmin: (role: string | null | undefined) =>
    role === "owner" || role === "admin",
}));

const TEST_SECRET = "cron-test-secret-that-is-long-enough-12345";
const requestWithAuth = (auth: string | null): Request =>
  new Request("http://localhost/api/cron/recurring-invoices", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });

describe("recurring invoices cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = TEST_SECRET;
  });

  it("rejects unauthenticated triggers without revealing anything", async () => {
    for (const auth of [null, "Basic abc", "Bearer wrong-secret-that-is-long-enough!!"]) {
      const res = await POST(requestWithAuth(auth));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ ok: false });
    }
  });

  it("rejects GET with method-not-allowed", async () => {
    const res = await GET();
    expect(res.status).toBe(405);
  });

  it("fails closed when no secret is configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(requestWithAuth(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(401);
    process.env.CRON_SECRET = TEST_SECRET;
  });
});

const TEST_DATABASE_URL = process.env.AVENTRA_TEST_DATABASE_URL;
if (TEST_DATABASE_URL) {
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

describe.skipIf(!TEST_DATABASE_URL)("recurring invoices cron route (database)", () => {
  it("processes due schedules and returns counts only", async () => {
    process.env.CRON_SECRET = TEST_SECRET;
    const res = await POST(requestWithAuth(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    for (const key of [
      "schedulesChecked",
      "occurrencesProcessed",
      "succeeded",
      "failed",
      "skipped",
    ]) {
      expect(typeof body[key]).toBe("number");
    }
    expect(body).not.toHaveProperty("invoice");
  });
});
