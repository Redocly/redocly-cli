import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

import fetch from 'node-fetch';
import { LintConfig } from '.';
import { NormalizedReportMessage } from './walk';

export type StackFrame<T> = {
  prev: StackFrame<T> | null;
  value: T;
};

export type Stack<T> = StackFrame<T> | null;

export type StackNonEmpty<T> = StackFrame<T>;

export function makeStack<T>(value: T): StackNonEmpty<T> {
  return { prev: null, value };
}

export function pushStack<T, P extends Stack<T> = Stack<T>>(head: P, value: T) {
  return { prev: head, value };
}

export function popStack<T, P extends Stack<T>>(head: P) {
  return head?.prev ?? null;
}

export type BundleOutputFormat = 'json' | 'yml' | 'yaml';

export function dumpBundle(obj: any, format: BundleOutputFormat) {
  if (format === 'json') {
    return JSON.stringify(obj, null, 2);
  } else {
    return yaml.safeDump(obj, {
      noRefs: true,
    });
  }
}

export function saveBundle(filename: string, obj: any, format: BundleOutputFormat) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, dumpBundle(obj, format));
}

export async function loadYaml(filename: string) {
  const contents = await fs.promises.readFile(filename, 'utf-8');
  return yaml.safeLoad(contents);
}

export function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

export async function readFileFromUrl(url: string) {
  const req = await fetch(url, {
    headers: {}, // TODO: port headers support
  });

  if (!req.ok) {
    throw new Error(`Failed to load ${url}: ${req.status} ${req.statusText}`);
  }

  return req.text();
}


export function ignoreMessage(config: LintConfig, message: NormalizedReportMessage) {
  const ignoredFile = config.ignore[message.location[0].source.absoluteRef] || {};
  const ignoredRule = ignoredFile[message.ruleId] || {};
  const ignored = ignoredRule[message.location[0].pointer!];
  return ignored
    ? {
      ...message,
      ignored,
    }
    : message;
}