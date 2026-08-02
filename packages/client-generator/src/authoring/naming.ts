// Language-neutral naming: one word splitter, four casings, and an identifier
// sanitizer parameterized by the target language's reserved words. TypeScript
// keeps its specialized sanitizer in emitters/identifier.ts; this is for the
// other output languages.

/** Split on delimiters and camel/acronym boundaries: 'APIKey-v2' → ['api', 'key', 'v2']. */
function splitWords(name: string): string[] {
  return (
    name
      // A leading sign on a number is meaning, not a delimiter: '+1'/'-1' (GitHub
      // reactions) must not collapse to the same identifier.
      .replace(/^\+(?=\d)/, 'plus ')
      .replace(/^-(?=\d)/, 'minus ')
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
