export class PurchaseSettingsDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseSettingsDomainError";
  }
}

export class InvalidPurchaseNumberFormatError extends PurchaseSettingsDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPurchaseNumberFormatError";
  }
}

export class UnauthorizedPurchaseSettingsAccessError extends PurchaseSettingsDomainError {
  constructor(message = "Unauthorized access to purchase settings.") {
    super(message);
    this.name = "UnauthorizedPurchaseSettingsAccessError";
  }
}
