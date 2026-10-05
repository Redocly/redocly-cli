import { HandledError } from '@redocly/openapi-core';
import * as path from 'node:path';

export function assertWithinDir(baseDir: string, targetPath: string, subject: string): void {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new HandledError(`Refusing to write "${subject}" outside the output directory.`);
  }
}
