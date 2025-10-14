import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseYaml } from './js-yaml/index.js';
import { isAbsoluteUrl } from './ref-utils.js';
import { isPlainObject } from './utils/is-plain-object.js';
import { isString } from './utils/is-string.js';
import { isTruthy } from './utils/is-truthy.js';

import type { UserContext } from './walk.js';

export { parseYaml, stringifyYaml } from './js-yaml/index.js';

export async function loadYaml<T>(filename: string): Promise<T> {
  const contents = await fs.promises.readFile(filename, 'utf-8');
  return parseYaml(contents) as T;
}

export function isEmptyArray(value: unknown): value is [] {
  return Array.isArray(value) && value.length === 0;
}

export function splitCamelCaseIntoWords(str: string) {
  const camel = str
    .split(/(?:[-._])|([A-Z][a-z]+)/)
    .filter(isTruthy)
    .map((item) => item.toLocaleLowerCase());
  const caps = str
    .split(/([A-Z]{2,})/)
    .filter((e: string) => e && e === e.toUpperCase())
    .map((item) => item.toLocaleLowerCase());
  return new Set([...camel, ...caps]);
}

export function validateMimeType(
  { type, value }: any,
  { report, location }: UserContext,
  allowedValues: string[]
) {
  const ruleType = type === 'consumes' ? 'request' : 'response';
  if (!allowedValues)
    throw new Error(`Parameter "allowedValues" is not provided for "${ruleType}-mime-type" rule`);
  if (!value[type]) return;

  for (const mime of value[type]) {
    if (!allowedValues.includes(mime)) {
      report({
        message: `Mime type "${mime}" is not allowed`,
        location: location.child(value[type].indexOf(mime)).key(),
      });
    }
  }
}

export function validateMimeTypeOAS3(
  { type, value }: any,
  { report, location }: UserContext,
  allowedValues: string[]
) {
  const ruleType = type === 'consumes' ? 'request' : 'response';
  if (!allowedValues)
    throw new Error(`Parameter "allowedValues" is not provided for "${ruleType}-mime-type" rule`);
  if (!value.content) return;

  for (const mime of Object.keys(value.content)) {
    if (!allowedValues.includes(mime)) {
      report({
        message: `Mime type "${mime}" is not allowed`,
        location: location.child('content').child(mime).key(),
      });
    }
  }
}

export function readFileAsStringSync(filePath: string) {
  return fs.readFileSync(filePath, 'utf-8');
}

export function yamlAndJsonSyncReader<T>(filePath: string): T {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseYaml(content) as T;
}

export function isPathParameter(pathSegment: string) {
  return pathSegment.startsWith('{') && pathSegment.endsWith('}');
}

export function isNotString<T>(value: string | T): value is T {
  return !isString(value);
}

export const assignConfig = <T extends string | { severity?: string }>(
  target: Record<string, T>,
  obj?: Record<string, T>
) => {
  if (!obj) return;
  for (const k of Object.keys(obj)) {
    if (isPlainObject(target[k]) && typeof obj[k] === 'string') {
      target[k] = { ...(target[k] as Record<string, unknown>), severity: obj[k] } as T;
    } else {
      target[k] = obj[k];
    }
  }
};

export function assignOnlyExistingConfig<T extends string | { severity?: string }>(
  target: Record<string, T>,
  obj?: Record<string, T>
) {
  if (!obj) return;
  for (const k of Object.keys(obj)) {
    if (!target.hasOwnProperty(k)) continue;
    if (isPlainObject(target[k]) && typeof obj[k] === 'string') {
      target[k] = { ...(target[k] as Record<string, unknown>), severity: obj[k] } as T;
    } else {
      target[k] = obj[k];
    }
  }
}

export function getMatchingStatusCodeRange(code: number | string): string {
  return `${code}`.replace(/^(\d)\d\d$/, (_, firstDigit) => `${firstDigit}XX`);
}

export function isCustomRuleId(id: string) {
  return id.includes('/');
}

export type Falsy = undefined | null | false | '' | 0;

export function identity<T>(value: T): T {
  return value;
}

export type CollectFn = (value: unknown) => void;

export type Exact<T extends object> = T & { [key: string]: undefined };

export function omit<O extends object, K extends keyof O>(obj: O, keys: K[]): Omit<O, K> {
  const result = { ...obj };

  keys.forEach((key) => {
    delete result[key];
  });

  return result;
}

export function resolveRelativePath(filePath: string, base?: string) {
  if (isAbsoluteUrl(filePath) || base === undefined) {
    return filePath;
  }
  return path.resolve(path.dirname(base), filePath);
}
