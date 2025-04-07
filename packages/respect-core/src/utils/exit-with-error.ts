import { bgRed } from 'colorette';
import { DefaultLogger } from '../utils/logger/logger.js';

const logger = DefaultLogger.getInstance();

export const exitWithError = (message: string) => {
  logger.error(bgRed(message));
  logger.printNewLine();
  throw new Error(message);
};
