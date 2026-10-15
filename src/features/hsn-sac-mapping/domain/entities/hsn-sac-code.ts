export type HsnSacType = "HSN" | "SAC";

export type HsnSacCode = {
  id: string;
  type: HsnSacType;
  code: string;
  description: string;
  isActive: boolean;
  sourceFile?: string | null;
  sourceSheet?: string | null;
  importedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type HsnSacListFilter = {
  type?: HsnSacType | "ALL";
  query?: string;
  limit?: number;
  offset?: number;
};

export const normalizeHsnSacCode = (code: string): string =>
  code.replace(/\s+/g, "").trim();

export const hsnSacRecordId = (type: HsnSacType, code: string): string =>
  `${type}:${code}`;

/** Products use HSN classifications; services use SAC classifications. */
export const expectedHsnSacTypeForItemType = (itemType: "PRODUCT" | "SERVICE"): HsnSacType =>
  itemType === "SERVICE" ? "SAC" : "HSN";
