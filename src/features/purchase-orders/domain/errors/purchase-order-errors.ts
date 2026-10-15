export class PurchaseOrderDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseOrderDomainError";
  }
}

export class PurchaseOrderNotFoundError extends PurchaseOrderDomainError {
  constructor(idOrNumber: string) {
    super(`Purchase Order "${idOrNumber}" was not found.`);
    this.name = "PurchaseOrderNotFoundError";
  }
}

export class InvalidPurchaseOrderStatusTransitionError extends PurchaseOrderDomainError {
  constructor(fromStatus: string, toStatus: string, reason?: string) {
    super(
      `Cannot transition purchase order from "${fromStatus}" to "${toStatus}"${reason ? `: ${reason}` : "."}`,
    );
    this.name = "InvalidPurchaseOrderStatusTransitionError";
  }
}

export class PurchaseOrderLockedError extends PurchaseOrderDomainError {
  constructor(orderNumber: string, status: string) {
    super(
      `Purchase Order "${orderNumber}" is currently "${status}" and cannot be modified. Only Draft orders may be edited.`,
    );
    this.name = "PurchaseOrderLockedError";
  }
}

export class OverReceivingError extends PurchaseOrderDomainError {
  constructor(item: string, ordered: number, attempted: number) {
    super(
      `Cannot receive ${attempted} units for "${item}": ordered quantity is ${ordered}. Received quantity cannot exceed ordered quantity.`,
    );
    this.name = "OverReceivingError";
  }
}

export class InvalidPurchaseOrderLineError extends PurchaseOrderDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPurchaseOrderLineError";
  }
}

export class InvalidPurchaseOrderReferenceError extends PurchaseOrderDomainError {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" was not found in this organization.`);
    this.name = "InvalidPurchaseOrderReferenceError";
  }
}

export class UnauthorizedPurchaseOrderAccessError extends PurchaseOrderDomainError {
  constructor(message = "Unauthorized access to purchase order resource.") {
    super(message);
    this.name = "UnauthorizedPurchaseOrderAccessError";
  }
}
