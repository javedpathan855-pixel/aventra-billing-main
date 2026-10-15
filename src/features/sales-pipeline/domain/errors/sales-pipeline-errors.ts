export class SalesPipelineDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesPipelineDomainError";
  }
}

export class OpportunityNotFoundError extends SalesPipelineDomainError {
  constructor(id: string) {
    super(`Sales opportunity with ID '${id}' was not found.`);
    this.name = "OpportunityNotFoundError";
  }
}

export class InvalidOpportunityStageTransitionError extends SalesPipelineDomainError {
  constructor(from: string, to: string) {
    super(`Cannot transition sales opportunity stage from '${from}' to '${to}'.`);
    this.name = "InvalidOpportunityStageTransitionError";
  }
}

export class MandatoryLossReasonError extends SalesPipelineDomainError {
  constructor() {
    super("A clear loss reason is required when marking an opportunity as LOST.");
    this.name = "MandatoryLossReasonError";
  }
}

export class InvalidOpportunityCustomerReferenceError extends SalesPipelineDomainError {
  constructor(customerId: string) {
    super(`Selected customer '${customerId}' does not exist in this organization.`);
    this.name = "InvalidOpportunityCustomerReferenceError";
  }
}
