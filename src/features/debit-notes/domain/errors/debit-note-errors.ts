export class DebitNoteDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DebitNoteDomainError";
  }
}

export class UnauthorizedDebitNoteAccessError extends DebitNoteDomainError {
  constructor(message = "Unauthorized access to debit note resources.") {
    super(message);
    this.name = "UnauthorizedDebitNoteAccessError";
  }
}

export class DebitNoteNotFoundError extends DebitNoteDomainError {
  constructor(identifier: string) {
    super(`Debit note '${identifier}' was not found in your organization.`);
    this.name = "DebitNoteNotFoundError";
  }
}

export class IneligibleInvoiceForDebitError extends DebitNoteDomainError {
  constructor(invoiceNumber: string, status: string) {
    super(
      `Invoice '${invoiceNumber}' with status '${status}' is ineligible for debit. Only issued or paid invoices can be debited.`,
    );
    this.name = "IneligibleInvoiceForDebitError";
  }
}

export class ExceededInvoiceDebitLimitError extends DebitNoteDomainError {
  constructor(
    attemptedDebit: number,
    availableDebit: number,
    invoiceNumber: string,
  ) {
    super(
      `Debit note amount (${attemptedDebit.toFixed(2)}) exceeds remaining debitable balance (${availableDebit.toFixed(2)}) for invoice '${invoiceNumber}'.`,
    );
    this.name = "ExceededInvoiceDebitLimitError";
  }
}

export class InvalidDebitNoteStatusTransitionError extends DebitNoteDomainError {
  constructor(currentStatus: string, operation: string) {
    super(
      `Cannot perform operation '${operation}' on a debit note with status '${currentStatus}'.`,
    );
    this.name = "InvalidDebitNoteStatusTransitionError";
  }
}

export class DuplicateDebitNoteNumberError extends DebitNoteDomainError {
  constructor(debitNoteNumber: string) {
    super(
      `Debit note number '${debitNoteNumber}' is already in use within your organization.`,
    );
    this.name = "DuplicateDebitNoteNumberError";
  }
}

export class DebitNoteImmutableError extends DebitNoteDomainError {
  constructor(debitNoteNumber: string) {
    super(
      `Issued debit note '${debitNoteNumber}' is financially immutable and cannot be modified.`,
    );
    this.name = "DebitNoteImmutableError";
  }
}

export class InvalidDebitNoteLineItemError extends DebitNoteDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDebitNoteLineItemError";
  }
}
