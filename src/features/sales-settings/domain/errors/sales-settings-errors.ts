export class SalesSettingsDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesSettingsDomainError";
  }
}

export class InvalidSalesNumberFormatError extends SalesSettingsDomainError {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSalesNumberFormatError";
  }
}

export class UnauthorizedSalesSettingsAccessError extends SalesSettingsDomainError {
  constructor(message = "Unauthorized access to sales settings.") {
    super(message);
    this.name = "UnauthorizedSalesSettingsAccessError";
  }
}
