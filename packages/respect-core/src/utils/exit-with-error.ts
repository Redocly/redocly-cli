import { HandledError } from './handled-error.js';

export const rethrowHandledError = (message: string) => {
  throw new HandledError(message);
};
