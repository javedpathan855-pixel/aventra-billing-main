export class UnitDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnitDomainError";
  }
}

export class UnitNotFoundError extends UnitDomainError {
  constructor(id: string) {
    super(`Unit with ID "${id}" was not found.`);
    this.name = "UnitNotFoundError";
  }
}

export class UnitDuplicateError extends UnitDomainError {
  constructor(code: string) {
    super(`A unit with code "${code}" already exists in this organization.`);
    this.name = "UnitDuplicateError";
  }
}

export class UnitInUseError extends UnitDomainError {
  constructor(code: string, itemCount: number) {
    super(
      `Unit "${code}" cannot be deleted because it is used by ${itemCount} catalogue item${itemCount === 1 ? "" : "s"}. Reassign those items first.`,
    );
    this.name = "UnitInUseError";
  }
}

export class InvalidUnitPrecisionError extends UnitDomainError {
  constructor(message = "Unit precision must be between 0 and 3 decimal places.") {
    super(message);
    this.name = "InvalidUnitPrecisionError";
  }
}

export class UnauthorizedUnitAccessError extends UnitDomainError {
  constructor(message = "You are not authorized to access this unit resource.") {
    super(message);
    this.name = "UnauthorizedUnitAccessError";
  }
}

export class ForbiddenUnitActionError extends UnitDomainError {
  constructor(message = "You don't have permission to perform this unit action.") {
    super(message);
    this.name = "ForbiddenUnitActionError";
  }
}
