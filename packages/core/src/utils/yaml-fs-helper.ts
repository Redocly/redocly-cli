import * as fs from 'node:fs';
import * as path from 'node:path';

import { parseYaml } from '../js-yaml/index.js';
import { isAbsoluteUrl } from '../ref-utils.js';
import { checkPathCasing } from './path-casing.js';

export { parseYaml, stringifyYaml } from '../js-yaml/index.js';

export async function loadYaml<T>(filename: string): Promise<T> {
  const contents = await fs.promises.readFile(filename, 'utf-8');
  return parseYaml(contents) as T;
}

export function yamlAndJsonSyncReader<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseYaml(content) as T;
}

export function resolveRelativePath(filePath: string, base?: string) {
  if (isAbsoluteUrl(filePath) || base === undefined) {
    return filePath;
  }
  const baseFolder = path.dirname(base);
  const resolvedPath = path.resolve(baseFolder, filePath);
  const casingError = checkPathCasing(resolvedPath, baseFolder);
  if (casingError !== undefined) {
    throw new Error(casingError);
  }
  return resolvedPath;
}

export function readFileAsStringSync(filePath: string) {
  return fs.readFileSync(filePath, 'utf-8');
}
