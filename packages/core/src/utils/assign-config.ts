import { isPlainObject } from './is-plain-object.js';

export const assignConfig = <T extends string | { severity?: string }>(
  target: Record<string, T>,
  obj?: Record<string, T>
) => {
  if (!obj) return;
  for (const k of Object.keys(obj)) {
    // console.log(`Processing key "${k}": target value =`, target[k], ', source value =', obj[k]); // Debug log for current key and values
    if (isPlainObject(target[k]) && typeof obj[k] === 'string') {
      // If target is an object and source is a string, merge severity into the object
      target[k] = { ...(target[k] as Record<string, unknown>), severity: obj[k] } as T;
      console.log(`Merged severity for key "${k}":`, target[k]); // Debug log for merged severity
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
