import { isEmptyObject } from './is-empty-object';
import { isPlainObject } from './is-plain-object';

export function isNotEmptyObject(obj: unknown): boolean {
  return isPlainObject(obj) && !isEmptyObject(obj);
}
