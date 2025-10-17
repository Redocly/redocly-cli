import { isString } from './is-string.js';

export function isNotString<T>(value: string | T): value is T {
  return !isString(value);
}
