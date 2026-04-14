import * as path from 'node:path';

export function extractFileNameFromPath(filename: string) {
  return path.basename(filename, path.extname(filename));
}
