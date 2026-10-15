export class SalesReturnDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesReturnDomainError";
  }
}

export class InvalidReturnStatusTransitionError extends SalesReturnDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition sales return from status '${fromStatus}' to '${toStatus}'.`);
    this.name = "InvalidReturnStatusTransitionError";
  }
}

export class OverReturnError extends SalesReturnDomainError {
  constructor(itemName: string, attemptedQty: number, remainingQty: number) {
    super(
      `Cannot return ${attemptedQty} of '${itemName}'. Maximum eligible returnable quantity is ${remainingQty}.`,
    );
    this.name = "OverReturnError";
  }
}

export class OverReceiptError extends SalesReturnDomainError {
  constructor(itemName: string, receivedQty: number, returnQty: number) {
    super(
      `Cannot receive ${receivedQty} of '${itemName}'. Physical receipt cannot exceed the returned quantity of ${returnQty}.`,
    );
    this.name = "OverReceiptError";
  }
}

export class UnauthorizedReturnAccessError extends SalesReturnDomainError {
  constructor(message = "Unauthorized access to sales return.") {
    super(message);
    this.name = "UnauthorizedReturnAccessError";
  }
}

export class SalesReturnNotFoundError extends SalesReturnDomainError {
  constructor(id: string) {
    super(`Sales return with ID '${id}' was not found.`);
    this.name = "SalesReturnNotFoundError";
  }
}
