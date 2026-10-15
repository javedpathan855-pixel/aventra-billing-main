export type CategoryStatus = "ACTIVE" | "INACTIVE";

export type Category = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  status: CategoryStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryListFilter = {
  status?: CategoryStatus | "ALL";
  query?: string;
  limit?: number;
  offset?: number;
};

export const normalizeCategoryName = (name: string): string =>
  name.trim().replace(/\s+/g, " ");

export const getCategoryInitials = (name: string): string => {
  const parts = normalizeCategoryName(name).split(" ").filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
  return `${parts[0]?.slice(0, 1) ?? ""}${parts[parts.length - 1]?.slice(0, 1) ?? ""}`.toUpperCase();
};
