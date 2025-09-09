import type { CHECKS } from './checks.js';

export type ChecksErrorsType = keyof typeof CHECKS;

export class ChecksErrors extends Error {
  public readonly type: ChecksErrorsType;
  public readonly originalError?: Error;

  constructor(type: ChecksErrorsType, message: string, originalError?: Error) {
    super(message);
    this.name = 'ChecksErrors';
    this.type = type;
    this.originalError = originalError;
  }
}

export class StatusCodeError extends ChecksErrors {
  constructor(message: string, originalError?: Error) {
    super('STATUS_CODE_CHECK', message, originalError);
    this.name = 'StatusCodeError';
  }
}

export class ResponseHeaderError extends ChecksErrors {
  constructor(message: string, originalError?: Error) {
    super('RESPONSE_HEADER_CHECK', message, originalError);
    this.name = 'ResponseHeaderError';
  }
}
