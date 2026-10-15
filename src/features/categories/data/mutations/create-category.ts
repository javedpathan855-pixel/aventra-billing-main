"use server";

import { revalidatePath } from "next/cache";
import { resolveCategoryContext } from "../context/category-context";
import { categoryRepository } from "../../infrastructure/repositories/prisma-category-repository";
import { createCategorySchema } from "../validators/category-schemas";
import { toCategoryDto } from "../mappers/category-mappers";
import { validateCategoryName } from "../../domain/rules/category-rules";
import { CategoryDuplicateError } from "../../domain/errors/category-errors";
import type { CategoryActionResult, CategoryDto, CreateCategoryInput } from "../dto/category-dto";

export const createCategoryAction = async (
  input: CreateCategoryInput,
): Promise<CategoryActionResult<CategoryDto>> => {
  try {
    const parseResult = createCategorySchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      return { success: false, error: "Validation failed. Please review the highlighted fields.", fieldErrors };
    }

    const { organizationId } = await resolveCategoryContext();
    const data = parseResult.data;
    const name = validateCategoryName(data.name);

    const existing = await categoryRepository.findByName(organizationId, name);
    if (existing) {
      throw new CategoryDuplicateError(name);
    }

    const saved = await categoryRepository.create({
      id: `cat_${crypto.randomUUID()}`,
      organizationId,
      name,
      description: data.description ?? null,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath("/categories");
    revalidatePath("/products");
    revalidatePath("/services");

    return { success: true, data: toCategoryDto(saved) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
