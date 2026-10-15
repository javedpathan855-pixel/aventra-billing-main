export class SalesOrderDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesOrderDomainError";
  }
}

export class SalesOrderNotFoundError extends SalesOrderDomainError {
  constructor(idOrNumber: string) {
    super(`Sales Order "${idOrNumber}" was not found.`);
    this.name = "SalesOrderNotFoundError";
  }
}

export class InvalidSalesOrderStatusTransitionError extends SalesOrderDomainError {
  constructor(fromStatus: string, toStatus: string, reason?: string) {
    super(
      `Cannot transition sales order from "${fromStatus}" to "${toStatus}"${reason ? `: ${reason}` : "."}`,
    );
    this.name = "InvalidSalesOrderStatusTransitionError";
  }
}

export class SalesOrderLockedError extends SalesOrderDomainError {
  constructor(orderNumber: string, status: string) {
    super(
      `Sales Order "${orderNumber}" is currently "${status}" and cannot be modified. Only Draft orders may be edited.`,
    );
    this.name = "SalesOrderLockedError";
  }
}

export class SalesOrderAlreadyInvoicedError extends SalesOrderDomainError {
  constructor(orderNumber: string, invoiceId?: string) {
    super(
      `Sales Order "${orderNumber}" has already been converted to an invoice${invoiceId ? ` (${invoiceId})` : ""}.`,
    );
    this.name = "SalesOrderAlreadyInvoicedError";
  }
}

export class OverFulfilmentError extends SalesOrderDomainError {
  constructor(item: string, ordered: number, attempted: number) {
    super(
      `Cannot fulfill ${attempted} units for "${item}": ordered quantity is ${ordered}. Fulfilled quantity cannot exceed ordered quantity.`,
    );
    this.name = "OverFulfilmentError";
  }
}

export class InvalidSalesOrderLineError extends SalesOrderDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSalesOrderLineError";
  }
}

export class InvalidSalesOrderReferenceError extends SalesOrderDomainError {
  constructor(entity: string, id: string) {
    super(`${entity} "${id}" was not found in this organization.`);
    this.name = "InvalidSalesOrderReferenceError";
  }
}

export class UnauthorizedSalesOrderAccessError extends SalesOrderDomainError {
  constructor(message = "Unauthorized access to sales order resource.") {
    super(message);
    this.name = "UnauthorizedSalesOrderAccessError";
  }
}
