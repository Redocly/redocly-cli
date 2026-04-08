import * as fs from 'node:fs';
import * as path from 'node:path';

import { readYaml, writeToFileByExtension } from '../../../utils/miscellaneous.js';
import { isSupportedExtension } from './is-supported-extension.js';
import { replace$Refs } from './replace-$-refs.js';

export function traverseDirectoryDeep(directory: string, callback: any, componentsFiles: object) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return;
  const files = fs.readdirSync(directory);
  for (const f of files) {
    const filename = path.join(directory, f);
    if (fs.statSync(filename).isDirectory()) {
      traverseDirectoryDeep(filename, callback, componentsFiles);
    } else {
      callback(filename, directory, componentsFiles);
    }
  }
}

export function traverseDirectoryDeepCallback(
  filename: string,
  directory: string,
  componentsFiles: object
) {
  if (!isSupportedExtension(filename)) return;
  const pathData = readYaml(filename);
  replace$Refs(pathData, directory, componentsFiles);
  writeToFileByExtension(pathData, filename);
}
