import { HandledError } from './handled-error.js';

export const exitWithError = (message: string) => {
  throw new HandledError(message);
};
