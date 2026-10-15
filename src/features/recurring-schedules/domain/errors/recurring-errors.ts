export class RecurringScheduleDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecurringScheduleDomainError";
  }
}

export class UnauthorizedRecurringAccessError extends RecurringScheduleDomainError {
  constructor(message = "Unauthorized access to recurring schedule resources.") {
    super(message);
    this.name = "UnauthorizedRecurringAccessError";
  }
}

export class RecurringScheduleNotFoundError extends RecurringScheduleDomainError {
  constructor(identifier: string) {
    super(`Recurring schedule '${identifier}' was not found in your organization.`);
    this.name = "RecurringScheduleNotFoundError";
  }
}

export class InvalidRecurringStatusTransitionError extends RecurringScheduleDomainError {
  constructor(currentStatus: string, operation: string) {
    super(
      `Cannot perform operation '${operation}' on a recurring schedule with status '${currentStatus}'.`,
    );
    this.name = "InvalidRecurringStatusTransitionError";
  }
}

export class InvalidRecurrenceError extends RecurringScheduleDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidRecurrenceError";
  }
}

export class RecurringOccurrenceNotFoundError extends RecurringScheduleDomainError {
  constructor(identifier: string) {
    super(`Recurring occurrence '${identifier}' was not found in your organization.`);
    this.name = "RecurringOccurrenceNotFoundError";
  }
}
