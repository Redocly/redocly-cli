import * as fs from 'node:fs';
import * as path from 'node:path';

export function doesYamlFileExist(filePath: string): boolean {
  return (
    (path.extname(filePath) === '.yaml' || path.extname(filePath) === '.yml') &&
    !!fs?.existsSync?.(filePath)
  );
}
