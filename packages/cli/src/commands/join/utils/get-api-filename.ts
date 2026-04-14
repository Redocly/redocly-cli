import * as path from 'node:path';

export function getApiFilename(filePath: string) {
  return path.basename(filePath, path.extname(filePath));
}
