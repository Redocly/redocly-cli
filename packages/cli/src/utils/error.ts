import { HandledError } from '@redocly/openapi-core';

export class AbortFlowError extends Error {}

export function exitWithError(message: string) {
  throw new HandledError(message);
}
