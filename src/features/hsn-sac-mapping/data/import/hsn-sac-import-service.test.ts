import { describe, expect, it, vi } from "vitest";
import { runHsnSacImport } from "./hsn-sac-import-service";

const buildRepository = () => {
  const store = new Map<string, { type: string; code: string; description: string }>();
  return {
    store,
    upsert: vi.fn(async (record: { type: string; code: string; description: string }) => {
      const existing = store.get(`${record.type}:${record.code}`);
      store.set(`${record.type}:${record.code}`, { ...record });
      return { id: `${record.type}:${record.code}`, ...record, isActive: !existing ? true : true };
    }),
  };
};

const sheets = [
  {
    sheetName: "HSN_MSTR",
    headers: ["HSN_CD", "HSN_Description"],
    rows: [
      ["01", "LIVE ANIMALS"],
      ["0101", "HORSES"],
      ["01", "DUPLICATE"],
      ["BAD", "MALFORMED"],
    ],
  },
  {
    sheetName: "SAC_MSTR",
    headers: ["SAC_CD", "SAC_Description"],
    rows: [
      [99, "All Services"],
      [9954, "Construction services"],
    ],
  },
  {
    sheetName: "EXTRA",
    headers: ["A", "B"],
    rows: [["x", "y"]],
  },
];

describe("hsn-sac import service", () => {
  it("dry-runs without writing records", async () => {
    const repository = buildRepository();

    const outcome = await runHsnSacImport({
      sourceFile: "HSN_SAC.xlsx",
      sheets,
      repository: repository as never,
      dryRun: true,
    });

    expect(outcome.dryRun).toBe(true);
    expect(outcome.totalRows).toBe(7);
    expect(outcome.totalAccepted).toBe(4);
    expect(outcome.totalRejected).toBe(1);
    expect(outcome.totalDuplicates).toBe(1);
    expect(outcome.totalApplied).toBe(0);
    expect(repository.upsert).not.toHaveBeenCalled();
    expect(outcome.sheets[2]?.skipped).toBe(true);
  });

  it("applies accepted rows and is repeatable without duplicating", async () => {
    const repository = buildRepository();

    const first = await runHsnSacImport({
      sourceFile: "HSN_SAC.xlsx",
      sheets,
      repository: repository as never,
      dryRun: false,
    });
    expect(first.totalApplied).toBe(4);
    expect(repository.store.size).toBe(4);
    expect(repository.store.get("HSN:01")).toMatchObject({ description: "LIVE ANIMALS" });

    const second = await runHsnSacImport({
      sourceFile: "HSN_SAC.xlsx",
      sheets,
      repository: repository as never,
      dryRun: false,
    });
    expect(second.totalApplied).toBe(4);
    expect(repository.store.size).toBe(4);
  });

  it("fails sheets with unexpected headers without touching other sheets", async () => {
    const repository = buildRepository();

    const outcome = await runHsnSacImport({
      sourceFile: "HSN_SAC.xlsx",
      sheets: [
        { sheetName: "HSN_MSTR", headers: ["WRONG", "HEADERS"], rows: [["01", "X"]] },
        sheets[1]!,
      ],
      repository: repository as never,
      dryRun: false,
    });

    expect(outcome.sheets[0]?.headerError).toContain("HSN_CD");
    expect(outcome.totalApplied).toBe(2);
  });
});
