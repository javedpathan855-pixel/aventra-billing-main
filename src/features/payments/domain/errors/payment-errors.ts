export class PaymentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentDomainError";
  }
}

export class UnauthorizedPaymentAccessError extends PaymentDomainError {
  constructor(message = "Unauthorized access to payment resources.") {
    super(message);
    this.name = "UnauthorizedPaymentAccessError";
  }
}

export class PaymentNotFoundError extends PaymentDomainError {
  constructor(identifier: string) {
    super(`Payment '${identifier}' was not found in your organization.`);
    this.name = "PaymentNotFoundError";
  }
}

export class IneligibleInvoiceForPaymentError extends PaymentDomainError {
  constructor(invoiceNumber: string, status: string) {
    super(
      `Invoice '${invoiceNumber}' with status '${status}' cannot receive payments. Only issued or paid invoices can be paid.`,
    );
    this.name = "IneligibleInvoiceForPaymentError";
  }
}

export class ExceededInvoiceBalanceError extends PaymentDomainError {
  constructor(attempted: number, available: number, invoiceNumber: string) {
    super(
      `Allocation of ${attempted.toFixed(2)} exceeds the outstanding balance (${available.toFixed(2)}) of invoice '${invoiceNumber}'. Excess cash is rejected.`,
    );
    this.name = "ExceededInvoiceBalanceError";
  }
}

export class PaymentTotalMismatchError extends PaymentDomainError {
  constructor(received: number, allocated: number) {
    super(
      `Payment allocations (${allocated.toFixed(2)}) must fully equal the amount received (${received.toFixed(2)}). Unallocated balances are not permitted.`,
    );
    this.name = "PaymentTotalMismatchError";
  }
}

export class InvalidPaymentStatusTransitionError extends PaymentDomainError {
  constructor(currentStatus: string, operation: string) {
    super(
      `Cannot perform operation '${operation}' on a payment with status '${currentStatus}'.`,
    );
    this.name = "InvalidPaymentStatusTransitionError";
  }
}

export class DuplicatePaymentError extends PaymentDomainError {
  constructor() {
    super("This payment was already recorded.");
    this.name = "DuplicatePaymentError";
  }
}

export class CustomerMismatchError extends PaymentDomainError {
  constructor() {
    super("All allocated invoices must belong to the payment's customer.");
    this.name = "CustomerMismatchError";
  }
}
