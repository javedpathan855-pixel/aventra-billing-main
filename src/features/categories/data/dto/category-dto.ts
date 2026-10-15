import type { CategoryStatus } from "../../domain/entities/category";

export type CategoryDto = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  status: CategoryStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateCategoryInput = {
  name: string;
  description?: string | null;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput> & {
  status?: CategoryStatus;
};

export type CategoryFilterInput = {
  query?: string;
  status?: CategoryStatus | "ALL";
  page?: number;
  pageSize?: number;
};

export type CategoryActionResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string>;
};
