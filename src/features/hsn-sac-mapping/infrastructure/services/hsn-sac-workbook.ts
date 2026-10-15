import * as XLSX from "xlsx";
import { readFile } from "node:fs/promises";
import type { WorkbookSheetInput } from "../../domain/rules/hsn-sac-rules";

/**
 * Technical workbook reader: turns the supplied .xlsx bytes into plain row
 * matrices for the pure domain parser. The workbook is treated as untrusted
 * data — macros, formulas, and embedded content are never executed; only
 * cached cell values are read (anything that is not text or a number is
 * rejected downstream as a malformed row).
 */
export const readClassificationWorkbook = (buffer: Uint8Array): WorkbookSheetInput[] => {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: null,
      raw: true,
      blankrows: false,
    });
    const [headerRow, ...dataRows] = matrix;
    return {
      sheetName,
      headers: (headerRow ?? []) as unknown[],
      rows: (dataRows ?? []) as unknown[][],
    };
  });
};

export const loadClassificationWorkbook = async (filePath: string): Promise<WorkbookSheetInput[]> => {
  const buffer = await readFile(filePath);
  return readClassificationWorkbook(new Uint8Array(buffer));
};
