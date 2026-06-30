// Identifier sanitization — mapping OpenAPI names (which may contain `-`, `.`,
// spaces, or be reserved words) onto valid TypeScript identifiers. Pure string
// logic with no dependency on the IR or other emitters.

/** Matches a string that is already a valid JS identifier (ignoring reserved words). */
const IDENT_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

const TS_RESERVED = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'import',
  'in',
  'instanceof',
  'new',
  'null',
  'return',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

/** True when `name` matches the JS identifier grammar (reserved words still pass). */
export function isIdentifier(name: string): boolean {
  return IDENT_RE.test(name);
}

/** True when `name` is a valid JS identifier AND not a reserved word — safe as a binding name. */
export function isSafeIdentifier(name: string): boolean {
  return IDENT_RE.test(name) && !TS_RESERVED.has(name);
}

/**
 * Coerce an arbitrary spec-supplied name into a valid, non-reserved JS identifier
 * (no uniqueness guarantee — see `uniqueIdent`). Non-identifier characters become
 * `_`; an empty result, a leading digit, or a reserved word is prefixed with `_`.
 * This is the security boundary for any name that lands in a declaration slot —
 * `ts.factory.createIdentifier` prints its text verbatim, so an unsanitized name
 * like `foo(){};evil()` would emit as executable code.
 */
export function sanitizeIdentifier(name: string): string {
  let base = name.replace(/[^A-Za-z0-9_$]/g, '_');
  if (base === '' || /^[0-9]/.test(base) || TS_RESERVED.has(base)) base = `_${base}`;
  return base;
}

/**
 * Render `name` as an object key or property name: bare when it is a valid,
 * non-reserved identifier, quoted otherwise. Safe only where quoting is legal
 * (object keys, property signatures) — not for binding names; use `uniqueIdent`
 * there.
 */
export function safeIdent(name: string): string {
  if (IDENT_RE.test(name) && !TS_RESERVED.has(name)) {
    return name;
  }
  return JSON.stringify(name);
}

/**
 * `sanitizeIdentifier(name)` made unique within `used` (which it mutates):
 * collisions get a `_2`, `_3`, … suffix. Used wherever a name lands in a binding
 * slot that — unlike an object key — cannot be quoted (function/type/parameter
 * names), so `safeIdent`'s quote-on-failure fallback would not compile.
 */
export function uniqueIdent(name: string, used: Set<string>): string {
  const base = sanitizeIdentifier(name);
  let ident = base;
  let n = 2;
  while (used.has(ident)) ident = `${base}_${n++}`;
  used.add(ident);
  return ident;
}
