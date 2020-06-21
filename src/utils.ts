import * as yaml from 'js-yaml';
import * as fs from 'fs';
import fetch from 'node-fetch';


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

export function dumpYaml(obj: any) {
  return yaml.safeDump(obj, {
    noRefs: true,
  });
}

export function saveYaml(filename: string, obj: any) {
  fs.writeFileSync(filename, dumpYaml(obj));
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
    headers: {} // TODO: port headers support
  });

  if (!req.ok) {
    throw new Error(`Failed to load ${url}: ${req.status} ${req.statusText}`);
  }

  return req.text();
}