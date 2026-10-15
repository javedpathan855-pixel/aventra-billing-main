export class CategoryDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryDomainError";
  }
}

export class CategoryNotFoundError extends CategoryDomainError {
  constructor(id: string) {
    super(`Category with ID "${id}" was not found.`);
    this.name = "CategoryNotFoundError";
  }
}

export class CategoryDuplicateError extends CategoryDomainError {
  constructor(name: string) {
    super(`A category named "${name}" already exists in this organization.`);
    this.name = "CategoryDuplicateError";
  }
}

export class CategoryInUseError extends CategoryDomainError {
  constructor(name: string, itemCount: number) {
    super(
      `Category "${name}" cannot be deleted because it is used by ${itemCount} catalogue item${itemCount === 1 ? "" : "s"}. Reassign those items first.`,
    );
    this.name = "CategoryInUseError";
  }
}

export class UnauthorizedCategoryAccessError extends CategoryDomainError {
  constructor(message = "You are not authorized to access this category resource.") {
    super(message);
    this.name = "UnauthorizedCategoryAccessError";
  }
}

export class ForbiddenCategoryActionError extends CategoryDomainError {
  constructor(message = "You don't have permission to perform this category action.") {
    super(message);
    this.name = "ForbiddenCategoryActionError";
  }
}
