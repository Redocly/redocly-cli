const RESERVED_CHARS = ":/?#[]@!$&'()*+,;=";
const EXPLICITLY_ENCODED_CHARS = new Set(['!', "'", '(', ')', '*']);

function toPercentEncoded(char: string): string {
  if (EXPLICITLY_ENCODED_CHARS.has(char)) {
    return `%${char.charCodeAt(0).toString(16).toUpperCase()}`;
  }
  return encodeURIComponent(char);
}

/**
 * Encodes value for query string.
 * @param allowReserved – when true, reserved chars (:/?#[]@!$&'()*+,;=) stay unencoded (RFC 3986).
 */
export function encodeURIValue(value: string, allowReserved = false): string {
  let encodedValue = encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  if (!allowReserved) return encodedValue;

  const RESERVED_PERCENT_MAP = [...RESERVED_CHARS].map((char) => ({
    char,
    encoded: toPercentEncoded(char),
  }));

  for (const { char, encoded } of RESERVED_PERCENT_MAP) {
    encodedValue = encodedValue.split(encoded).join(char);
  }
  return encodedValue;
}

export function buildQueryString(
  params: Array<{ name: string; value: string; allowReserved?: boolean }>
): string {
  return params
    .map(
      (p) => `${encodeURIComponent(p.name)}=${encodeURIValue(p.value, p.allowReserved === true)}`
    )
    .join('&');
}
