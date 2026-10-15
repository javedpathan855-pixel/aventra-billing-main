import type { HsnSacCode, HsnSacListFilter, HsnSacType } from "../entities/hsn-sac-code";

export type HsnSacUpsertRecord = {
  type: HsnSacType;
  code: string;
  description: string;
  sourceFile?: string | null;
  sourceSheet?: string | null;
};

export type HsnSacListResult = {
  codes: HsnSacCode[];
  totalCount: number;
};

export type HsnSacImportStatus = {
  hsnCount: number;
  sacCount: number;
  sourceFile?: string | null;
  lastImportedAt?: string | null;
};

export type IHsnSacRepository = {
  findByCode(type: HsnSacType, code: string): Promise<HsnSacCode | null>;
  list(filter?: HsnSacListFilter): Promise<HsnSacListResult>;
  countByType(type: HsnSacType): Promise<number>;
  getImportStatus(): Promise<HsnSacImportStatus>;
  upsert(record: HsnSacUpsertRecord): Promise<HsnSacCode>;
};
