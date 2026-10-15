import { z } from "zod";
import {
  MAX_UNIT_PRECISION,
  UNIT_CODE_MAX_LENGTH,
  UNIT_DESCRIPTION_MAX_LENGTH,
  UNIT_NAME_MAX_LENGTH,
  UNIT_NAME_MIN_LENGTH,
} from "../../domain/rules/unit-rules";

const unitStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

const unitCodeField = z
  .string()
  .trim()
  .min(1, "Unit code is required.")
  .max(UNIT_CODE_MAX_LENGTH, "Unit code cannot exceed 12 characters.")
  .transform((val) => val.toUpperCase().replace(/\s+/g, ""))
  .refine((val) => /^[A-Z0-9]+$/.test(val), {
    message: "Unit code may only contain letters and digits.",
  });

export const createUnitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(UNIT_NAME_MIN_LENGTH, "Unit name must be at least 2 characters.")
    .max(UNIT_NAME_MAX_LENGTH, "Unit name cannot exceed 100 characters."),
  code: unitCodeField,
  description: z
    .string()
    .trim()
    .max(UNIT_DESCRIPTION_MAX_LENGTH, "Description cannot exceed 500 characters.")
    .optional()
    .nullable()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : null)),
  precision: z.coerce.number().int().min(0).max(MAX_UNIT_PRECISION).default(3),
});

export const updateUnitSchema = z.object({
  name: z
    .string()
    .trim()
    .min(UNIT_NAME_MIN_LENGTH, "Unit name must be at least 2 characters.")
    .max(UNIT_NAME_MAX_LENGTH, "Unit name cannot exceed 100 characters.")
    .optional(),
  code: unitCodeField.optional(),
  description: z
    .string()
    .trim()
    .max(UNIT_DESCRIPTION_MAX_LENGTH, "Description cannot exceed 500 characters.")
    .optional()
    .nullable()
    .transform((val) => (val === undefined ? undefined : val && val.trim().length > 0 ? val.trim() : null)),
  precision: z.coerce.number().int().min(0).max(MAX_UNIT_PRECISION).optional(),
  status: unitStatusSchema.optional(),
});

export const unitFilterSchema = z.object({
  query: z.string().trim().optional(),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});
