import type { HsnSacType } from "../../domain/entities/hsn-sac-code";

export type HsnSacCodeDto = {
  id: string;
  type: HsnSacType;
  code: string;
  description: string;
  isActive: boolean;
  sourceFile?: string | null;
  sourceSheet?: string | null;
  importedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type HsnSacFilterInput = {
  query?: string;
  type?: HsnSacType | "ALL";
  page?: number;
  pageSize?: number;
};

export type MappedClassification = {
  code: string;
  type: HsnSacType;
  description?: string | null;
  itemCount: number;
};
