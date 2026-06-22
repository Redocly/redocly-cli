import * as path from 'node:path';

import { exitWithError } from '../../../utils/error.js';

export function assertWithinDir(baseDir: string, targetPath: string, subject: string): void {
  const base = path.resolve(baseDir);
  const target = path.resolve(targetPath);
  if (target !== base && !target.startsWith(base + path.sep)) {
    exitWithError(`Refusing to write "${subject}" outside the output directory.`);
  }
}
