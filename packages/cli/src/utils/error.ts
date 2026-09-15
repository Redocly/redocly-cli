import { HandledError } from '@redocly/openapi-core';

export { AbortFlowError } from '@redocly/openapi-core';

export function exitWithError(message: string): never {
  throw new HandledError(message);
}
