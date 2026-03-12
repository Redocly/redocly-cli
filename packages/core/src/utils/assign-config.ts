import { isPlainObject } from './is-plain-object.js';

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
