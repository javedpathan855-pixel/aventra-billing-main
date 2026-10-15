"use server";

import { revalidatePath } from "next/cache";
import { resolveCategoryContext } from "../context/category-context";
import { categoryRepository } from "../../infrastructure/repositories/prisma-category-repository";
import { updateCategorySchema } from "../validators/category-schemas";
import { toCategoryDto } from "../mappers/category-mappers";
import { validateCategoryName } from "../../domain/rules/category-rules";
import { CategoryDuplicateError, CategoryNotFoundError } from "../../domain/errors/category-errors";
import type { Category } from "../../domain/entities/category";
import type { CategoryActionResult, CategoryDto, UpdateCategoryInput } from "../dto/category-dto";

export const updateCategoryAction = async (
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryActionResult<CategoryDto>> => {
  try {
    const parseResult = updateCategorySchema.safeParse(input);
    if (!parseResult.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parseResult.error.issues) {
        fieldErrors[issue.path.join(".")] = issue.message;
      }
      return { success: false, error: "Validation failed. Please review the highlighted fields.", fieldErrors };
    }

    const { organizationId } = await resolveCategoryContext();
    const data = parseResult.data;

    const existing = await categoryRepository.findById(organizationId, id);
    if (!existing) {
      throw new CategoryNotFoundError(id);
    }

    const patch: Partial<Category> = {};
    if (data.name !== undefined) {
      const name = validateCategoryName(data.name);
      if (name.toLowerCase() !== existing.name.toLowerCase()) {
        const duplicate = await categoryRepository.findByName(organizationId, name);
        if (duplicate && duplicate.id !== id) {
          throw new CategoryDuplicateError(name);
        }
      }
      patch.name = name;
    }
    if (data.description !== undefined) patch.description = data.description ?? null;
    if (data.status !== undefined) patch.status = data.status;
    patch.updatedAt = new Date();

    const saved = await categoryRepository.update(organizationId, id, patch);

    revalidatePath("/categories");
    revalidatePath(`/categories/${id}`);
    revalidatePath("/products");
    revalidatePath("/services");

    return { success: true, data: toCategoryDto(saved) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected server error occurred.";
    return { success: false, error: message };
  }
};
