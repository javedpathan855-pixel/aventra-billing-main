import { z } from "zod";

export const hsnSacFilterSchema = z.object({
  query: z.string().trim().optional(),
  type: z.enum(["ALL", "HSN", "SAC"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const hsnSacCodeLookupSchema = z.object({
  type: z.enum(["HSN", "SAC"]),
  code: z.string().trim().min(1).max(20),
});
