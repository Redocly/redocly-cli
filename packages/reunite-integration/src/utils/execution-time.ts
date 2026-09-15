// Copied from @redocly/cli.
import { logger } from '@redocly/openapi-core';
import { gray } from 'colorette';

export function getExecutionTime(startedAt: number) {
  return process.env.NODE_ENV === 'test'
    ? '<test>ms'
    : `${Math.ceil(performance.now() - startedAt)}ms`;
}

export function printExecutionTime(commandName: string, startedAt: number, api: string) {
  const elapsed = getExecutionTime(startedAt);
  logger.info(gray(`\n${api}: ${commandName} processed in ${elapsed}\n\n`));
}
