import * as path from 'node:path';
import * as fs from 'node:fs';

export function doesYamlFileExist(filePath: string): boolean {
  return (
    (path.extname(filePath) === '.yaml' || path.extname(filePath) === '.yml') &&
    !!fs?.existsSync?.(filePath)
  );
}
