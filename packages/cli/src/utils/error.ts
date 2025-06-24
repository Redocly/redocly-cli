import { HandledError } from '@redocly/openapi-core';

// Is used to abort the flow of execution - will be catched in the command execution wrapper
export class AbortFlowError extends Error {}

export function exitWithError(message: string): never {
  throw new HandledError(message);
}
