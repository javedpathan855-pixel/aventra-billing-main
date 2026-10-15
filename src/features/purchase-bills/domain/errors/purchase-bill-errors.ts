export class PurchaseBillDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseBillDomainError";
  }
}

export class PurchaseBillNotFoundError extends PurchaseBillDomainError {
  constructor(idOrNumber: string) {
    super(`Purchase Bill "${idOrNumber}" was not found.`);
    this.name = "PurchaseBillNotFoundError";
  }
}

export class InvalidPurchaseBillStatusTransitionError extends PurchaseBillDomainError {
  constructor(fromStatus: string, toStatus: string, reason?: string) {
    super(
      `Cannot transition purchase bill from "${fromStatus}" to "${toStatus}"${reason ? `: ${reason}` : "."}`,
    );
    this.name = "InvalidPurchaseBillStatusTransitionError";
  }
}

export class PurchaseBillLockedError extends PurchaseBillDomainError {
  constructor(billNumber: string, status: string) {
    super(
      `Purchase Bill "${billNumber}" is currently "${status}" and cannot be modified. Only Draft bills may be edited.`,
    );
    this.name = "PurchaseBillLockedError";
  }
}

export class DuplicateSupplierInvoiceError extends PurchaseBillDomainError {
  constructor(supplierName: string, supplierInvoiceNumber: string) {
    super(
      `Supplier "${supplierName}" already has a purchase bill for invoice "${supplierInvoiceNumber}" in this organization.`,
    );
    this.name = "DuplicateSupplierInvoiceError";
  }
}

export class InvalidPurchaseBillLineError extends PurchaseBillDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPurchaseBillLineError";
  }
}

export class InvalidPurchaseBillReferenceError extends PurchaseBillDomainError {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" was not found in this organization.`);
    this.name = "InvalidPurchaseBillReferenceError";
  }
}

export class UnauthorizedPurchaseBillAccessError extends PurchaseBillDomainError {
  constructor(message = "Unauthorized access to purchase bill resource.") {
    super(message);
    this.name = "UnauthorizedPurchaseBillAccessError";
  }
}
