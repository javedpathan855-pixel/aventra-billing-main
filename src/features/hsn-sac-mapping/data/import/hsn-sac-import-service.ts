import type {
  IHsnSacRepository,
} from "../../domain/repositories/hsn-sac-repository";
import {
  parseWorkbookSheet,
  resolveSheetType,
  type SheetParseOutcome,
  type WorkbookSheetInput,
} from "../../domain/rules/hsn-sac-rules";

export type HsnSacSheetImportReport = SheetParseOutcome & {
  skipped?: boolean;
  skipReason?: string;
  applied: number;
};

export type HsnSacImportOutcome = {
  sourceFile: string;
  dryRun: boolean;
  sheets: HsnSacSheetImportReport[];
  totalRows: number;
  totalAccepted: number;
  totalRejected: number;
  totalDuplicates: number;
  totalApplied: number;
};

export type RunHsnSacImportInput = {
  sourceFile: string;
  sheets: WorkbookSheetInput[];
  repository: IHsnSacRepository;
  /** When true, parse and report without writing any records. */
  dryRun?: boolean;
};

/**
 * Deterministic classification import orchestration. Pure except for the
 * injected repository: repeatable (stable code-based ids, upsert semantics),
 * additive (existing records keep their active flag; descriptions refresh),
 * and safe to dry-run. No presentation, auth, or transport concerns here —
 * the operator script supplies the repository and the workbook sheets.
 */
export const runHsnSacImport = async (
  input: RunHsnSacImportInput,
): Promise<HsnSacImportOutcome> => {
  const dryRun = input.dryRun ?? true;
  const sheets: HsnSacSheetImportReport[] = [];

  for (const sheet of input.sheets) {
    const type = resolveSheetType(sheet.sheetName);
    if (!type) {
      sheets.push({
        type: "HSN",
        sheetName: sheet.sheetName,
        totalRows: sheet.rows.length,
        accepted: [],
        rejected: [],
        duplicates: [],
        normalizedCount: 0,
        skipped: true,
        skipReason: `Unknown sheet "${sheet.sheetName}" — expected HSN_MSTR or SAC_MSTR.`,
        applied: 0,
      });
      continue;
    }

    const parsed = parseWorkbookSheet(type, sheet);
    let applied = 0;

    if (!parsed.headerError && !dryRun) {
      for (const row of parsed.accepted) {
        await input.repository.upsert({
          type,
          code: row.code,
          description: row.description,
          sourceFile: input.sourceFile,
          sourceSheet: sheet.sheetName,
        });
        applied += 1;
      }
    }

    sheets.push({ ...parsed, applied });
  }

  return {
    sourceFile: input.sourceFile,
    dryRun,
    sheets,
    totalRows: sheets.reduce((sum, s) => sum + s.totalRows, 0),
    totalAccepted: sheets.reduce((sum, s) => sum + s.accepted.length, 0),
    totalRejected: sheets.reduce((sum, s) => sum + s.rejected.length, 0),
    totalDuplicates: sheets.reduce((sum, s) => sum + s.duplicates.length, 0),
    totalApplied: sheets.reduce((sum, s) => sum + s.applied, 0),
  };
};
