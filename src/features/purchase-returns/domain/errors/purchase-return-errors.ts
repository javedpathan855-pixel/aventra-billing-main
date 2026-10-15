export class PurchaseReturnDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseReturnDomainError";
  }
}

export class InvalidPurchaseReturnStatusTransitionError extends PurchaseReturnDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(
      `Cannot transition purchase return from "${fromStatus}" to "${toStatus}".`,
    );
    this.name = "InvalidPurchaseReturnStatusTransitionError";
  }
}

export class OverReturnError extends PurchaseReturnDomainError {
  constructor(item: string, attempted: number, remaining: number) {
    super(
      `Return quantity ${attempted} for "${item}" exceeds the remaining returnable quantity ${remaining}.`,
    );
    this.name = "OverReturnError";
  }
}

export class InvalidPurchaseReturnReferenceError extends PurchaseReturnDomainError {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" was not found in this organization.`);
    this.name = "InvalidPurchaseReturnReferenceError";
  }
}

export class PurchaseReturnNotFoundError extends PurchaseReturnDomainError {
  constructor(idOrNumber: string) {
    super(`Purchase Return "${idOrNumber}" was not found.`);
    this.name = "PurchaseReturnNotFoundError";
  }
}

export class PurchaseReturnLockedError extends PurchaseReturnDomainError {
  constructor(returnNumber: string, status: string) {
    super(
      `Purchase Return "${returnNumber}" is currently "${status}" and cannot be modified. Only Draft returns may be deleted.`,
    );
    this.name = "PurchaseReturnLockedError";
  }
}

export class UnauthorizedPurchaseReturnAccessError extends PurchaseReturnDomainError {
  constructor(message = "Unauthorized access to purchase return resource.") {
    super(message);
    this.name = "UnauthorizedPurchaseReturnAccessError";
  }
}
