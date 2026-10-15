export class SupplierDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupplierDomainError";
  }
}

export class SupplierNotFoundError extends SupplierDomainError {
  constructor(id?: string) {
    super(id ? `Supplier with ID '${id}' was not found.` : "Supplier not found.");
    this.name = "SupplierNotFoundError";
  }
}

export class SupplierValidationError extends SupplierDomainError {
  readonly fieldErrors: Record<string, string>;

  constructor(message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = "SupplierValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class SupplierDuplicateError extends SupplierDomainError {
  constructor(field: string, value: string) {
    super(`A supplier with ${field} '${value}' already exists in this organization.`);
    this.name = "SupplierDuplicateError";
  }
}

export class InvalidSupplierStatusTransitionError extends SupplierDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition supplier from status '${fromStatus}' to '${toStatus}'.`);
    this.name = "InvalidSupplierStatusTransitionError";
  }
}

export class UnauthorizedSupplierAccessError extends SupplierDomainError {
  constructor() {
    super("Authentication is required to perform supplier operations.");
    this.name = "UnauthorizedSupplierAccessError";
  }
}

export class ForbiddenSupplierActionError extends SupplierDomainError {
  constructor() {
    super("You do not have permission to modify supplier records in this organization.");
    this.name = "ForbiddenSupplierActionError";
  }
}
