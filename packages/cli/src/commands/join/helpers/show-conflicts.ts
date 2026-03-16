import { logger } from '@redocly/openapi-core';
import { red, blue } from 'colorette';

export function showConflicts(key: string, conflicts: any) {
  for (const [path, files] of conflicts) {
    logger.warn(`Conflict on ${key} : ${red(path)} in files: ${blue(files)} \n`);
  }
}
