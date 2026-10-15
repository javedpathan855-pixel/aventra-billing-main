/**
 * HSN/SAC classification importer (operator script).
 *
 * Reads the supplied HSN_SAC.xlsx workbook and loads HSN_MSTR / SAC_MSTR into
 * the global hsn_sac_code master through the feature's deterministic import
 * service (upsert by stable type:code ids, repeatable, additive-only).
 *
 * Usage:
 *   npm run import:hsn-sac -- --file <path-to-HSN_SAC.xlsx> [--dry-run]
 *   npm run import:hsn-sac -- --file <path> --apply --database-url <isolated-db-url> --yes
 *
 * Safety:
 * - Dry-run is the default and writes nothing (no database connection needed).
 * - --apply requires an explicit --database-url AND --yes. Point it at an
 *   isolated database only — never production or the development database.
 * - Only counts and short rejection samples are printed; the full workbook is
 *   never dumped to logs.
 *
 * Run with: npx tsx scripts/import-hsn-sac.ts [args]
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { hsnSacRecordId } from "@/features/hsn-sac-mapping/domain/entities/hsn-sac-code";
import type {
  HsnSacUpsertRecord,
  IHsnSacRepository,
} from "@/features/hsn-sac-mapping/domain/repositories/hsn-sac-repository";
import { runHsnSacImport } from "@/features/hsn-sac-mapping/data/import/hsn-sac-import-service";
import { loadClassificationWorkbook } from "@/features/hsn-sac-mapping/infrastructure/services/hsn-sac-workbook";

type Args = {
  file?: string;
  apply: boolean;
  databaseUrl?: string;
  yes: boolean;
};

const parseArgs = (argv: string[]): Args => {
  const args: Args = { apply: false, yes: false };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--file" && argv[i + 1]) {
      args.file = argv[i + 1];
      i += 1;
    } else if (token === "--apply") {
      args.apply = true;
    } else if (token === "--dry-run") {
      args.apply = false;
    } else if (token === "--database-url" && argv[i + 1]) {
      args.databaseUrl = argv[i + 1];
      i += 1;
    } else if (token === "--yes") {
      args.yes = true;
    }
  }
  return args;
};

const maskDatabaseUrl = (url: string): string => {
  const match = url.match(/^(postgres(?:ql)?:\/\/[^@]+@[^/]+\/[^?]+)/);
  if (!match || !match[1]) return "<unrecognized-url-shape>";
  return match[1].replace(/\/\/[^@]+@/, "//***@");
};

/** Script-local repository: the server-only persistence chain cannot run outside Next. */
const createScriptRepository = (client: PrismaClient): IHsnSacRepository => ({
  findByCode: async () => null,
  list: async () => ({ codes: [], totalCount: 0 }),
  countByType: async () => 0,
  getImportStatus: async () => ({ hsnCount: 0, sacCount: 0 }),
  upsert: async (record: HsnSacUpsertRecord) => {
    const row = await client.hsnSacCode.upsert({
      where: { type_code: { type: record.type, code: record.code } },
      create: {
        id: hsnSacRecordId(record.type, record.code),
        type: record.type,
        code: record.code,
        description: record.description,
        isActive: true,
        sourceFile: record.sourceFile ?? null,
        sourceSheet: record.sourceSheet ?? null,
        importedAt: new Date(),
      },
      update: {
        description: record.description,
        sourceFile: record.sourceFile ?? null,
        sourceSheet: record.sourceSheet ?? null,
        importedAt: new Date(),
      },
    });
    return {
      id: row.id,
      type: row.type as "HSN" | "SAC",
      code: row.code,
      description: row.description,
      isActive: row.isActive,
      sourceFile: row.sourceFile,
      sourceSheet: row.sourceSheet,
      importedAt: row.importedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },
});

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));

  if (!args.file) {
    console.error("Missing required --file <path-to-HSN_SAC.xlsx>.");
    process.exit(2);
  }

  if (args.apply && (!args.databaseUrl || !args.yes)) {
    console.error("--apply requires both --database-url <isolated-db-url> and --yes.");
    process.exit(2);
  }

  const sheets = await loadClassificationWorkbook(args.file);
  console.log(`Workbook sheets: ${sheets.map((s) => `${s.sheetName} (${s.rows.length} rows)`).join(", ")}`);

  if (!args.apply) {
    const outcome = await runHsnSacImport({
      sourceFile: args.file.split(/[\\/]/).pop() ?? args.file,
      sheets,
      repository: createScriptRepository(null as unknown as PrismaClient),
      dryRun: true,
    });
    printOutcome(outcome);
    return;
  }

  const databaseUrl = args.databaseUrl as string;
  console.log(`Applying to isolated database: ${maskDatabaseUrl(databaseUrl)}`);
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const client = new PrismaClient({ adapter });
  try {
    const outcome = await runHsnSacImport({
      sourceFile: args.file.split(/[\\/]/).pop() ?? args.file,
      sheets,
      repository: createScriptRepository(client),
      dryRun: false,
    });
    printOutcome(outcome);
    const [hsnCount, sacCount] = await Promise.all([
      client.hsnSacCode.count({ where: { type: "HSN" } }),
      client.hsnSacCode.count({ where: { type: "SAC" } }),
    ]);
    console.log(`Database now holds: HSN=${hsnCount} SAC=${sacCount}`);
  } finally {
    await client.$disconnect();
  }
};

const printOutcome = (outcome: {
  sourceFile: string;
  dryRun: boolean;
  sheets: {
    sheetName: string;
    headerError?: string;
    skipped?: boolean;
    skipReason?: string;
    totalRows: number;
    accepted: unknown[];
    rejected: { rowNumber: number; rawCode: string; reason: string }[];
    duplicates: { rowNumber: number; code: string }[];
    normalizedCount: number;
    applied: number;
  }[];
  totalRows: number;
  totalAccepted: number;
  totalRejected: number;
  totalDuplicates: number;
  totalApplied: number;
}): void => {
  console.log(`Mode: ${outcome.dryRun ? "DRY-RUN (no writes)" : "APPLY"}`);
  console.log(`Source: ${outcome.sourceFile}`);
  for (const sheet of outcome.sheets) {
    console.log(`- ${sheet.sheetName}: rows=${sheet.totalRows} accepted=${sheet.accepted.length} rejected=${sheet.rejected.length} duplicates=${sheet.duplicates.length} normalized=${sheet.normalizedCount} applied=${sheet.applied}`);
    if (sheet.headerError) console.log(`  headerError: ${sheet.headerError}`);
    if (sheet.skipReason) console.log(`  skipped: ${sheet.skipReason}`);
    for (const r of sheet.rejected.slice(0, 10)) {
      console.log(`  rejected row ${r.rowNumber} (${r.rawCode || "<blank>"}): ${r.reason}`);
    }
    for (const d of sheet.duplicates.slice(0, 10)) {
      console.log(`  duplicate row ${d.rowNumber}: ${d.code}`);
    }
  }
  console.log(
    `Totals: rows=${outcome.totalRows} accepted=${outcome.totalAccepted} rejected=${outcome.totalRejected} duplicates=${outcome.totalDuplicates} applied=${outcome.totalApplied}`,
  );
};

main().catch((err: unknown) => {
  console.error(`Import failed: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
});
