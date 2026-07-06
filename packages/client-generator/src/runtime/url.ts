import type { ParamSpec, QueryValue } from './types.js';

/**
 * The RESOLVED OpenAPI serialization spec for one query parameter — callers apply the
 * OpenAPI defaults (`style: 'form'`, `explode: true`) before building one.
 */
export type QueryStyle = {
  style: NonNullable<ParamSpec['style']>;
  explode: boolean;
  allowReserved?: boolean;
};

/**
 * Encode everything except the RFC-3986 reserved set, for `allowReserved: true` params —
 * `filter=a/b` survives instead of `filter=a%2Fb`.
 */
export function encodeReserved(value: string): string {
  return encodeURIComponent(value).replace(
    /%(3A|2F|3F|23|5B|5D|40|21|24|26|27|28|29|2A|2B|2C|3B|3D)/g,
    (match) => decodeURIComponent(match)
  );
}

/** Substitute `{name}` template segments with encoded values; a missing value is a caller bug. */
export function substitutePath(template: string, values: Record<string, unknown>): string {
  return template.replace(/\{([^{}]+)\}/g, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`Missing path parameter "${name}"`);
    return encodeURIComponent(String(value));
  });
}

/**
 * Build the request URL: `serverUrl` (trailing slash trimmed) + path + serialized query.
 * Query parameters honor their OpenAPI `style`/`explode`/`allowReserved` (from `styles`);
 * without a spec, arrays repeat the key (`form`+`explode`), objects serialize as
 * `deepObject` brackets, and `null`/`undefined` entries are skipped.
 */
export function buildUrl(
  serverUrl: string,
  path: string,
  query?: Record<string, QueryValue>,
  styles?: Record<string, QueryStyle>
): string {
  // Trim trailing slashes with a scan, not `/\/+$/` — an anchored `+` regex is
  // quadratic on adversarial many-slash input (the server URL is caller data).
  let end = serverUrl.length;
  while (end > 0 && serverUrl.charCodeAt(end - 1) === 47 /* '/' */) end--;
  const url = serverUrl.slice(0, end) + path;
  if (!query) return url;
  const params = new URLSearchParams();
  const raw: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    const spec = styles?.[key];
    if (!spec) {
      if (Array.isArray(value)) {
        for (const v of value) {
          if (v !== undefined && v !== null) params.append(key, String(v));
        }
      } else if (Object(value) === value) {
        // Object-valued query params use `deepObject` style: key[subKey]=subValue.
        for (const [subKey, subValue] of Object.entries(value)) {
          if (subValue !== undefined && subValue !== null) {
            params.append(`${key}[${subKey}]`, String(subValue));
          }
        }
      } else {
        params.append(key, String(value));
      }
      continue;
    }
    if (Array.isArray(value)) {
      const items = value.filter((v) => v !== undefined && v !== null).map(String);
      if (spec.style === 'form' && spec.explode) {
        for (const v of items) {
          if (spec.allowReserved) raw.push(`${key}=${encodeReserved(v)}`);
          else params.append(key, v);
        }
      } else {
        // Delimited styles put the LITERAL delimiter on the wire; only the
        // values are encoded. `%20` (not `+`) is the literal space delimiter.
        const delim =
          spec.style === 'pipeDelimited' ? '|' : spec.style === 'spaceDelimited' ? '%20' : ',';
        const enc = spec.allowReserved ? encodeReserved : encodeURIComponent;
        raw.push(`${encodeURIComponent(key)}=${items.map(enc).join(delim)}`);
      }
    } else if (Object(value) === value) {
      // `deepObject` (and any object spec, for now): key[subKey]=subValue.
      for (const [subKey, subValue] of Object.entries(value)) {
        if (subValue !== undefined && subValue !== null) {
          if (spec.allowReserved) raw.push(`${key}[${subKey}]=${encodeReserved(String(subValue))}`);
          else params.append(`${key}[${subKey}]`, String(subValue));
        }
      }
    } else if (spec.allowReserved) {
      raw.push(`${key}=${encodeReserved(String(value))}`);
    } else {
      params.append(key, String(value));
    }
  }
  const qs = [params.toString(), ...raw].filter(Boolean).join('&');
  return qs ? `${url}?${qs}` : url;
}
