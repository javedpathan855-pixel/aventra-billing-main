import { z } from "zod";
import {
  CATEGORY_DESCRIPTION_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  CATEGORY_NAME_MIN_LENGTH,
} from "../../domain/rules/category-rules";

const categoryStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(CATEGORY_NAME_MIN_LENGTH, "Category name must be at least 2 characters.")
    .max(CATEGORY_NAME_MAX_LENGTH, "Category name cannot exceed 100 characters."),
  description: z
    .string()
    .trim()
    .max(CATEGORY_DESCRIPTION_MAX_LENGTH, "Description cannot exceed 500 characters.")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(CATEGORY_NAME_MIN_LENGTH, "Category name must be at least 2 characters.")
    .max(CATEGORY_NAME_MAX_LENGTH, "Category name cannot exceed 100 characters.")
    .optional(),
  description: z
    .string()
    .trim()
    .max(CATEGORY_DESCRIPTION_MAX_LENGTH, "Description cannot exceed 500 characters.")
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
  status: categoryStatusSchema.optional(),
});

export const categoryFilterSchema = z.object({
  query: z.string().trim().optional(),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
