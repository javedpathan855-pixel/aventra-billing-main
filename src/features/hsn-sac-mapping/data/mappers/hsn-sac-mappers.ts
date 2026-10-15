import type { HsnSacCode } from "../../domain/entities/hsn-sac-code";
import type { HsnSacCodeDto } from "../dto/hsn-sac-dto";

const toIso = (d: Date): string => (d instanceof Date ? d.toISOString() : String(d));

export const toHsnSacDto = (c: HsnSacCode): HsnSacCodeDto => ({
  id: c.id,
  type: c.type,
  code: c.code,
  description: c.description,
  isActive: c.isActive,
  sourceFile: c.sourceFile ?? null,
  sourceSheet: c.sourceSheet ?? null,
  importedAt: toIso(c.importedAt),
  createdAt: toIso(c.createdAt),
  updatedAt: toIso(c.updatedAt),
});
