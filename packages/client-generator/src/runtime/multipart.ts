/**
 * Serialize a plain object into `FormData` for a typed `multipart/form-data` body
 * (capability module — wired into `createClient`, never imported by the send core).
 * `Blob`/`File` and strings pass through; `Date`s become ISO strings; arrays append
 * one field per item; other objects are JSON-encoded; everything else is stringified.
 * `undefined`/`null` entries are skipped.
 */
export function toFormData(body: Record<string, unknown>): FormData {
  const fd = new FormData();
  const append = (key: string, value: unknown): void => {
    if (value === undefined || value === null) return;
    if (value instanceof Blob || typeof value === 'string') fd.append(key, value);
    else if (value instanceof Date) fd.append(key, value.toISOString());
    else if (Object(value) === value) fd.append(key, JSON.stringify(value));
    else fd.append(key, String(value));
  };
  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) for (const item of value) append(key, item);
    else append(key, value);
  }
  return fd;
}
