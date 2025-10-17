import { isEmptyObject } from './is-empty-object.js';
import { isPlainObject } from './is-plain-object.js';

export function isNotEmptyObject(obj: unknown): boolean {
  return isPlainObject(obj) && !isEmptyObject(obj);
}
