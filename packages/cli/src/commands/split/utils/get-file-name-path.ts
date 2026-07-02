import * as path from 'node:path';

export function getFileNamePath(componentDirPath: string, componentName: string, ext: string) {
  return path.join(componentDirPath, componentName) + `.${ext}`;
}
