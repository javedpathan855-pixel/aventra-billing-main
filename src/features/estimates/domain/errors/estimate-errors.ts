export class EstimateDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EstimateDomainError";
  }
}

export class EstimateNotFoundError extends EstimateDomainError {
  constructor(id: string) {
    super(`Estimate with identifier "${id}" was not found.`);
    this.name = "EstimateNotFoundError";
  }
}

export class DuplicateEstimateNumberError extends EstimateDomainError {
  constructor(estimateNumber: string) {
    super(`An estimate with number "${estimateNumber}" already exists.`);
    this.name = "DuplicateEstimateNumberError";
  }
}

export class InvalidEstimateStatusTransitionError extends EstimateDomainError {
  constructor(currentStatus: string, targetStatus: string) {
    super(
      `Cannot transition estimate from status "${currentStatus}" to "${targetStatus}".`,
    );
    this.name = "InvalidEstimateStatusTransitionError";
  }
}

export class EstimateImmutableError extends EstimateDomainError {
  constructor(message = "This estimate has been converted to an invoice or cancelled and cannot be modified.") {
    super(message);
    this.name = "EstimateImmutableError";
  }
}

export class UnauthorizedEstimateAccessError extends EstimateDomainError {
  constructor(message = "Unauthorized estimate operation.") {
    super(message);
    this.name = "UnauthorizedEstimateAccessError";
  }
}

export class InvalidCustomerReferenceError extends EstimateDomainError {
  constructor(customerId: string) {
    super(`Selected customer "${customerId}" does not exist in this organization.`);
    this.name = "InvalidCustomerReferenceError";
  }
}

export class InvalidProductReferenceError extends EstimateDomainError {
  constructor(productId: string) {
    super(`Selected product "${productId}" does not exist in this organization.`);
    this.name = "InvalidProductReferenceError";
  }
}
