export class HandledError extends Error {}

export class AbortFlowError extends Error {}

export function exitWithError(message: string) {
  throw new HandledError(message);
}
