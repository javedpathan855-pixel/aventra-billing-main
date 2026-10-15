import { CategoryDomainError } from "../errors/category-errors";
import { normalizeCategoryName } from "../entities/category";

export const CATEGORY_NAME_MIN_LENGTH = 2;

export const CATEGORY_NAME_MAX_LENGTH = 100;

export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500;

export const validateCategoryName = (name: string): string => {
  const normalized = normalizeCategoryName(name);
  if (normalized.length < CATEGORY_NAME_MIN_LENGTH) {
    throw new CategoryDomainError("Category name must be at least 2 characters.");
  }
  if (normalized.length > CATEGORY_NAME_MAX_LENGTH) {
    throw new CategoryDomainError("Category name cannot exceed 100 characters.");
  }
  return normalized;
};

/**
 * Standard catalogue categories shipped as seed data. These mirror the legacy
 * free-text options so organizations adopting the master keep working values.
 */
export const DEFAULT_CATEGORIES: readonly { name: string; description: string }[] = [
  { name: "General", description: "Default catch-all category for uncategorized items." },
  { name: "Hardware", description: "Physical goods, devices, and equipment." },
  { name: "Software", description: "Licenses, applications, and digital products." },
  { name: "Consulting", description: "Advisory and professional services." },
  { name: "Maintenance", description: "Support, repair, and upkeep services." },
  { name: "Subscription", description: "Recurring plans and memberships." },
  { name: "Logistics", description: "Transport, delivery, and warehousing services." },
  { name: "Office Supplies", description: "Consumables and day-to-day office goods." },
];
