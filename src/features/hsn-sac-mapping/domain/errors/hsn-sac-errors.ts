export class HsnSacDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HsnSacDomainError";
  }
}

export class HsnSacNotFoundError extends HsnSacDomainError {
  constructor(type: string, code: string) {
    super(`${type} code "${code}" was not found in the classification master.`);
    this.name = "HsnSacNotFoundError";
  }
}

export class InvalidHsnSacCodeError extends HsnSacDomainError {
  constructor(message = "Classification code must be between 2 and 8 digits.") {
    super(message);
    this.name = "InvalidHsnSacCodeError";
  }
}

export class HsnSacTypeMismatchError extends HsnSacDomainError {
  constructor(itemType: string, expected: string) {
    super(`${itemType === "SERVICE" ? "Services" : "Products"} must use ${expected} classifications.`);
    this.name = "HsnSacTypeMismatchError";
  }
}

export class InactiveHsnSacCodeError extends HsnSacDomainError {
  constructor(code: string) {
    super(`Classification code "${code}" is inactive and cannot be used for new mappings.`);
    this.name = "InactiveHsnSacCodeError";
  }
}

export class HsnSacWorkbookError extends HsnSacDomainError {
  constructor(message: string) {
    super(message);
    this.name = "HsnSacWorkbookError";
  }
}

export class UnauthorizedHsnSacAccessError extends HsnSacDomainError {
  constructor(message = "You are not authorized to access this classification resource.") {
    super(message);
    this.name = "UnauthorizedHsnSacAccessError";
  }
}
