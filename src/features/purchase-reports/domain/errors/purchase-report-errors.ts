export class PurchaseReportDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseReportDomainError";
  }
}

export class UnauthorizedPurchaseReportAccessError extends PurchaseReportDomainError {
  constructor(message = "Unauthorized access to purchase report resource.") {
    super(message);
    this.name = "UnauthorizedPurchaseReportAccessError";
  }
}
