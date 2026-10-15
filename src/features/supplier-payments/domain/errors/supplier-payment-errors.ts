export class SupplierPaymentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupplierPaymentDomainError";
  }
}

export class SupplierPaymentNotFoundError extends SupplierPaymentDomainError {
  constructor(id: string) {
    super(`Supplier payment "${id}" was not found.`);
    this.name = "SupplierPaymentNotFoundError";
  }
}

export class SupplierPaymentTotalMismatchError extends SupplierPaymentDomainError {
  constructor(paymentAmount: number, allocatedTotal: number) {
    super(
      `Payment amount (${paymentAmount.toFixed(2)}) must equal the sum of allocations (${allocatedTotal.toFixed(2)}). Unallocated balances are not permitted.`,
    );
    this.name = "SupplierPaymentTotalMismatchError";
  }
}

export class ExceededBillBalanceError extends SupplierPaymentDomainError {
  constructor(amount: number, remainingBalance: number, billNumber: string) {
    super(
      `Allocation of ${amount.toFixed(2)} exceeds the outstanding balance ${remainingBalance.toFixed(2)} of purchase bill "${billNumber}".`,
    );
    this.name = "ExceededBillBalanceError";
  }
}

export class IneligibleBillForPaymentError extends SupplierPaymentDomainError {
  constructor(billNumber: string, status: string) {
    super(
      `Purchase bill "${billNumber}" is "${status}" and cannot receive payments. Only Confirmed bills are payable.`,
    );
    this.name = "IneligibleBillForPaymentError";
  }
}

export class SupplierMismatchError extends SupplierPaymentDomainError {
  constructor() {
    super("All allocated purchase bills must belong to the payment supplier.");
    this.name = "SupplierMismatchError";
  }
}

export class InvalidSupplierPaymentStatusTransitionError extends SupplierPaymentDomainError {
  constructor(fromStatus: string, action: string) {
    super(`Cannot ${action} a supplier payment in "${fromStatus}" status.`);
    this.name = "InvalidSupplierPaymentStatusTransitionError";
  }
}

export class UnauthorizedSupplierPaymentAccessError extends SupplierPaymentDomainError {
  constructor(message = "Unauthorized access to supplier payment resource.") {
    super(message);
    this.name = "UnauthorizedSupplierPaymentAccessError";
  }
}
