export class DeliveryChallanDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryChallanDomainError";
  }
}

export class InvalidChallanStatusTransitionError extends DeliveryChallanDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition delivery challan from status '${fromStatus}' to '${toStatus}'.`);
    this.name = "InvalidChallanStatusTransitionError";
  }
}

export class OverDeliveryError extends DeliveryChallanDomainError {
  constructor(itemName: string, attemptedQty: number, remainingQty: number) {
    super(
      `Cannot deliver ${attemptedQty} of '${itemName}'. Maximum remaining deliverable quantity is ${remainingQty}.`,
    );
    this.name = "OverDeliveryError";
  }
}

export class UnauthorizedChallanAccessError extends DeliveryChallanDomainError {
  constructor(message = "Unauthorized access to delivery challan.") {
    super(message);
    this.name = "UnauthorizedChallanAccessError";
  }
}

export class ChallanNotFoundError extends DeliveryChallanDomainError {
  constructor(id: string) {
    super(`Delivery challan with ID '${id}' was not found.`);
    this.name = "ChallanNotFoundError";
  }
}
