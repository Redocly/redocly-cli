import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as minimatch from 'minimatch';
import fetch from 'node-fetch';
import * as readline from 'readline';

import { HttpResolveConfig } from './config/config';
import { performance } from 'perf_hooks';
import * as colors from 'colorette';

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

export function dumpBundle(obj: any, format: BundleOutputFormat, dereference?: boolean) {
  if (format === 'json') {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      if (e.message.indexOf('circular') > -1) {
        throw new CircularJSONNotSupportedError(e);
      }
      throw e;
    }
  } else {
    return yaml.safeDump(obj, {
      noRefs: !dereference,
    });
  }
}

export class CircularJSONNotSupportedError extends Error {
  constructor(public originalError: Error) {
    super(originalError.message);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, CircularJSONNotSupportedError.prototype);
  }
}

export function saveBundle(filename: string, output: string) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, output);
}

export async function loadYaml(filename: string) {
  const contents = await fs.promises.readFile(filename, 'utf-8');
  return yaml.safeLoad(contents);
}

export function readYaml(filename: string) {
  return yaml.safeLoad(fs.readFileSync(filename, 'utf-8'), { filename });
}

export function writeYaml(data: any, filename: string) {
  return fs.writeFileSync(filename, yaml.safeDump(data));
}

export function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
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

export async function promptUser(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${query}:\n\n  `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export function getExecutionTime(startedAt: number) {
  return process.env.NODE_ENV === 'test'
    ? '<test>ms'
    : `${Math.ceil(performance.now() - startedAt)}ms`;
}

export function printExecutionTime(commandName: string, startedAt: number, entrypoint: string) {
  const elapsed = getExecutionTime(startedAt);
  process.stderr.write(colors.gray(`\n${entrypoint}: ${commandName} processed in ${elapsed}\n\n`));
}
