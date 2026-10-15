import { describe, expect, it } from "vitest";
import { normalizeCategoryName, getCategoryInitials } from "./entities/category";
import { validateCategoryName, DEFAULT_CATEGORIES } from "./rules/category-rules";
import { CategoryDomainError } from "./errors/category-errors";

describe("category domain rules", () => {
  it("normalizes names by trimming and collapsing whitespace", () => {
    expect(normalizeCategoryName("  Office   Supplies ")).toBe("Office Supplies");
  });

  it("accepts valid names and rejects short or long names", () => {
    expect(validateCategoryName("Hardware")).toBe("Hardware");
    expect(() => validateCategoryName("A")).toThrow(CategoryDomainError);
    expect(() => validateCategoryName("x".repeat(101))).toThrow(CategoryDomainError);
  });

  it("derives initials for badges", () => {
    expect(getCategoryInitials("Hardware")).toBe("HA");
    expect(getCategoryInitials("Office Supplies")).toBe("OS");
  });

  it("ships the legacy standard categories as seed data", () => {
    const names = DEFAULT_CATEGORIES.map((c) => c.name);
    expect(names).toEqual([
      "General",
      "Hardware",
      "Software",
      "Consulting",
      "Maintenance",
      "Subscription",
      "Logistics",
      "Office Supplies",
    ]);
  });
});
