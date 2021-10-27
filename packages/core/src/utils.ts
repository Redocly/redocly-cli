import * as fs from 'fs';
import * as minimatch from 'minimatch';
import fetch from 'node-fetch';

import { parseYaml } from './js-yaml';
import { HttpResolveConfig } from './config/config';

export { parseYaml, stringifyYaml } from './js-yaml';

export type StackFrame<T> = {
  prev: StackFrame<T> | null;
  value: T;
};

export type Stack<T> = StackFrame<T> | null;
export type StackNonEmpty<T> = StackFrame<T>;
export function pushStack<T, P extends Stack<T> = Stack<T>>(head: P, value: T) {
  return { prev: head, value };
}

export function popStack<T, P extends Stack<T>>(head: P) {
  return head?.prev ?? null;
}

export type BundleOutputFormat = 'json' | 'yml' | 'yaml';

export async function loadYaml(filename: string) {
  const contents = await fs.promises.readFile(filename, 'utf-8');

  return parseYaml(contents);
}

export function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

export function isPlainObject(value: any): value is object {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function readFileFromUrl(url: string, config: HttpResolveConfig) {
  const headers: Record<string, string> = {};
  for (const header of config.headers) {
    if (match(url, header.matches)) {
      headers[header.name] =
        header.envVariable !== undefined ? process.env[header.envVariable] || '' : header.value;
    }
  }

  const req = await (config.customFetch || fetch)(url, {
    headers: headers,
  });

  if (!req.ok) {
    throw new Error(`Failed to load ${url}: ${req.status} ${req.statusText}`);
  }

  return { body: await req.text(), mimeType: req.headers.get('content-type') };
}

export function match(url: string, pattern: string) {
  if (!pattern.match(/^https?:\/\//)) {
    // if pattern doesn't specify protocol directly, do not match against it
    url = url.replace(/^https?:\/\//, '');
  }
  return minimatch(url, pattern);
}

export function pickObjectProps<T extends Record<string, unknown>>(
  object: T,
  keys: Array<string>,
): T {
  return Object.fromEntries(
    keys.filter((key: string) => key in object).map((key: string) => [key, object[key]]),
  ) as T;
}

export function omitObjectProps<T extends Record<string, unknown>>(
  object: T,
  keys: Array<string>,
): T {
  return Object.fromEntries(Object.entries(object).filter(([key]) => !keys.includes(key))) as T;
}

export function splitCamelCaseWithAbbreviations(str: string): string[] {
  const camel = str.split(/(?:[-._])|([A-Z][a-z]+)/).filter(Boolean);
  const caps = str.split(/([A-Z]{2,})/).filter((e: string) => e && e === e.toUpperCase());
  return Array.from(new Set([...camel, ...caps])).map((item) => item.toLocaleLowerCase());
}

export function readFileAsStringSync(filePath: string) {
  return fs.readFileSync(filePath, 'utf-8');
}
