// Language-neutral naming: one word splitter, four casings, and an identifier
// sanitizer parameterized by the target language's reserved words. TypeScript
// keeps its specialized sanitizer in the TypeScript printer; this is for the
// other output languages.

/** Split on delimiters and camel/acronym boundaries: 'APIKey-v2' → ['api', 'key', 'v2']. */
function splitWords(name: string): string[] {
  return (
    name
      // A leading sign on a number is meaning, not a delimiter: '+1'/'-1' (GitHub
      // reactions) must not collapse to the same identifier.
      .replace(/^\+(?=\d)/, 'plus ')
      .replace(/^-(?=\d)/, 'minus ')
      // A plural acronym is one word: fold the trailing 's' in so the
      // acronym-boundary rule below doesn't split 'APIs' into 'AP Is'.
      .replace(/([A-Z]{2,})s(?![a-z])/g, '$1S')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .split(/[^A-Za-z0-9]+/)
      .filter((word) => word !== '')
      .map((word) => word.toLowerCase())
  );
}

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export const casing = {
  camel: (name: string): string => {
    const [first, ...rest] = splitWords(name);
    return (first ?? '') + rest.map(capitalize).join('');
  },
  pascal: (name: string): string => splitWords(name).map(capitalize).join(''),
  snake: (name: string): string => splitWords(name).join('_'),
  screaming: (name: string): string => splitWords(name).join('_').toUpperCase(),
};

/** Keyword sets for the first-party target languages; authors pass their own set for others. */
export const RESERVED_WORDS: Record<'typescript' | 'python' | 'go' | 'php', ReadonlySet<string>> = {
  // prettier-ignore
  typescript: new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
    'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if',
    'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw',
    'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'implements', 'interface', 'let',
    'package', 'private', 'protected', 'public', 'static', 'yield', 'await',
  ]),
  // prettier-ignore
  python: new Set([
    'false', 'none', 'true', 'and', 'as', 'assert', 'async', 'await', 'break', 'class',
    'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global',
    'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return',
    'try', 'while', 'with', 'yield', 'match', 'case', 'type',
  ]),
  // prettier-ignore
  go: new Set([
    'break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough',
    'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range',
    'return', 'select', 'struct', 'switch', 'type', 'var',
  ]),
  // PHP keywords + compile-time constants are case-insensitive; the set stays lowercase
  // because `identifierFor` matches on the lowercased candidate.
  // prettier-ignore
  php: new Set([
    'abstract', 'and', 'array', 'as', 'break', 'callable', 'case', 'catch', 'class', 'clone',
    'const', 'continue', 'declare', 'default', 'die', 'do', 'echo', 'else', 'elseif', 'empty',
    'enddeclare', 'endfor', 'endforeach', 'endif', 'endswitch', 'endwhile', 'enum', 'eval',
    'exit', 'extends', 'final', 'finally', 'fn', 'for', 'foreach', 'function', 'global', 'goto',
    'if', 'implements', 'include', 'instanceof', 'insteadof', 'interface', 'isset', 'list',
    'match', 'namespace', 'new', 'or', 'print', 'private', 'protected', 'public', 'readonly',
    'require', 'return', 'static', 'switch', 'throw', 'trait', 'try', 'unset', 'use', 'var',
    'while', 'xor', 'yield', 'true', 'false', 'null', 'int', 'float', 'bool', 'string', 'void',
    'iterable', 'object', 'mixed', 'never', 'self', 'parent',
  ]),
};

/**
 * A safe identifier for any C-like or snake-case language: applies the casing
 * style (which strips invalid characters), prefixes `_` when the result starts
 * with a digit, and suffixes `_` when it is a reserved word — the cross-language
 * convention (Python's `class_`, Go's `type_`).
 */
export function identifierFor(
  name: string,
  options: { style?: keyof typeof casing; reserved?: ReadonlySet<string> } = {}
): string {
  const styled = casing[options.style ?? 'camel'](name);
  const base = styled === '' ? '_' : /^[0-9]/.test(styled) ? `_${styled}` : styled;
  return options.reserved?.has(base.toLowerCase()) ? `${base}_` : base;
}

/**
 * `identifierFor` over a list of wire names, made unique among themselves and among the
 * names already `taken` — `id`, `id_2`, `id_3`, … A language that passes parameters as
 * separate arguments needs this: OpenAPI lets one name appear in two locations (`id` in the
 * path AND in the query), and a signature cannot declare that name twice. Seed `taken` with
 * the argument slots the method itself declares (a body, a headers bag, a timeout), so a
 * parameter named after one of them moves aside instead of shadowing it.
 *
 * The wire name is untouched: only the binding moves, so the request is unchanged.
 */
export function uniqueIdentifiers(
  names: readonly string[],
  options: {
    style?: keyof typeof casing;
    reserved?: ReadonlySet<string>;
    taken?: Iterable<string>;
  } = {}
): string[] {
  const used = new Set(options.taken ?? []);
  // The separator follows the casing style, so the result stays idiomatic: `order_id_2` in
  // snake-case languages, `orderId2` where names run together.
  const separator = options.style === 'snake' || options.style === 'screaming' ? '_' : '';
  return names.map((name) => {
    const base = identifierFor(name, options);
    let unique = base;
    for (let suffix = 2; used.has(unique); suffix++) unique = `${base}${separator}${suffix}`;
    used.add(unique);
    return unique;
  });
}
