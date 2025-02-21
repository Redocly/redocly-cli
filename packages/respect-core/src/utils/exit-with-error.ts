import { bgRed } from 'colorette';
import { DefaultLogger } from '../utils/logger/logger';

const logger = DefaultLogger.getInstance();

export const exitWithError = (message: string) => {
  logger.error(bgRed(message));
  logger.printNewLine();
  throw new Error(message);
};
