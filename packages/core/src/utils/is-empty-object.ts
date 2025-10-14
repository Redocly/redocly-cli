import { isPlainObject } from './is-plain-object.js';

export function isEmptyObject(value: unknown): value is Record<string, unknown> {
  return isPlainObject(value) && Object.keys(value).length === 0;
}
