import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { readClassificationWorkbook } from "./hsn-sac-workbook";

const buildFixtureBuffer = (): Uint8Array => {
  const workbook = XLSX.utils.book_new();
  const hsn = XLSX.utils.aoa_to_sheet([
    ["HSN_CD", "HSN_Description"],
    ["01", "LIVE ANIMALS"],
    ["2307 00", "SPACED CODE"],
    ["0101", "HORSES"],
  ]);
  const sac = XLSX.utils.aoa_to_sheet([
    ["SAC_CD", "SAC_Description"],
    [99, "All Services"],
    [9954, "Construction services"],
  ]);
  XLSX.utils.book_append_sheet(workbook, hsn, "HSN_MSTR");
  XLSX.utils.book_append_sheet(workbook, sac, "SAC_MSTR");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

describe("hsn-sac workbook reader", () => {
  it("reads sheets as header-plus-row matrices without executing content", () => {
    const sheets = readClassificationWorkbook(buildFixtureBuffer());

    expect(sheets.map((s) => s.sheetName)).toEqual(["HSN_MSTR", "SAC_MSTR"]);

    const hsn = sheets[0];
    expect(hsn?.headers).toEqual(["HSN_CD", "HSN_Description"]);
    expect(hsn?.rows).toEqual([
      ["01", "LIVE ANIMALS"],
      ["2307 00", "SPACED CODE"],
      ["0101", "HORSES"],
    ]);

    const sac = sheets[1];
    expect(sac?.headers).toEqual(["SAC_CD", "SAC_Description"]);
    // Numeric cells arrive as numbers; the domain parser stringifies them.
    expect(sac?.rows).toEqual([
      [99, "All Services"],
      [9954, "Construction services"],
    ]);
  });
});
