import { HandledError } from '@redocly/openapi-core';

export const exitWithError = (message: string) => {
  throw new HandledError(message);
};
