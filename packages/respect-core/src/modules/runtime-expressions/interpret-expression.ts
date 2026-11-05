import { isPlainObject } from '@redocly/openapi-core';

import type { RuntimeExpressionContext } from '../../types.js';

type Token =
  | { kind: 'reference'; text: string }
  | { kind: 'literal'; value: unknown }
  | { kind: 'operator'; text: string };

const REFERENCE_CHAR = /[\w.\-#/~]/;
const NUMBER = /^\d+(?:\.\d+)?/;
const KEYWORD = /^(?:true|false|null|undefined)\b/;
const EMPTY_ARRAY = /^\[\s*\]/;
const OPERATORS = ['==', '!=', '<=', '>=', '&&', '||', '<', '>', '!', '{', '}'];
const COMPARISONS = new Set(['==', '!=', '<', '<=', '>', '>=']);
const KEYWORD_VALUES: Record<string, unknown> = {
  true: true,
  false: false,
  null: null,
  undefined: undefined,
};

/**
 * Evaluates a runtime expression that passed `lintExpression` against the context. Values are
 * read as data and compared with the JavaScript operators of the same name.
 */
export function interpretExpression(
  expression: string,
  context: RuntimeExpressionContext
): unknown {
  const tokens = tokenize(expression);
  let position = 0;

  const isOperator = (text: string): boolean => {
    const token = tokens[position];
    return token?.kind === 'operator' && token.text === text;
  };

  const parseOr = (): unknown => {
    let value = parseAnd();
    while (isOperator('||')) {
      position++;
      const right = parseAnd();
      value = value || right;
    }
    return value;
  };

  const parseAnd = (): unknown => {
    let value = parseNot();
    while (isOperator('&&')) {
      position++;
      const right = parseNot();
      value = value && right;
    }
    return value;
  };

  const parseNot = (): unknown => {
    if (!isOperator('!')) return parseComparison();
    position++;
    return !parseNot();
  };

  const parseComparison = (): unknown => {
    let value = parsePrimary();
    let token = tokens[position];
    while (token?.kind === 'operator' && COMPARISONS.has(token.text)) {
      position++;
      value = compare(token.text, value, parsePrimary());
      token = tokens[position];
    }
    return value;
  };

  const parsePrimary = (): unknown => {
    const token = tokens[position++];
    if (token?.kind === 'literal') return token.value;
    if (token?.kind === 'reference') return resolveReference(token.text, context);
    if (token?.kind === 'operator' && token.text === '{') {
      const value = parseOr();
      if (!isOperator('}')) throw new Error(`Expected "}" in "${expression}"`);
      position++;
      return value;
    }
    throw new Error(`Unexpected end or token in "${expression}"`);
  };

  const value = parseOr();
  if (position < tokens.length) throw new Error(`Unexpected token in "${expression}"`);
  return value;
}

function compare(operator: string, left: unknown, right: unknown): boolean {
  const [a, b] = [asOperand(left), asOperand(right)];
  switch (operator) {
    case '==':
      // oxlint-disable-next-line eqeqeq -- Respect compares with loose equality, as before
      return left == right;
    case '!=':
      // oxlint-disable-next-line eqeqeq -- Respect compares with loose equality, as before
      return left != right;
    case '<':
      return a < b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    default:
      return a >= b;
  }
}

// JavaScript converts any operand of `<`, `<=`, `>` and `>=` itself, as the evaluator did before.
function asOperand(value: unknown): number {
  return value as number;
}

/** Respect has always returned a value read by a dot path with the hyphens of its object keys as underscores. */
function withUnderscoreKeys(value: unknown): unknown {
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key.replace(/-/g, '_'), withUnderscoreKeys(item)])
  );
}

/**
 * Reads `$source.path.to.value`, optionally followed by a JSON Pointer and a further property
 * chain, as in `$response.body#/items.length`. A pointer that reaches no value throws.
 */
function resolveReference(text: string, context: RuntimeExpressionContext): unknown {
  const hashIndex = text.indexOf('#');
  const path = hashIndex === -1 ? text : text.slice(0, hashIndex);
  const [root, ...segments] = path.slice(1).split('.');
  const value = walk(context, [`$${root}`, ...segments]);
  if (hashIndex === -1) return withUnderscoreKeys(value);

  const [pointer, ...chain] = text.slice(hashIndex + 1).split('.');
  return walk(atPointer(value, pointer), chain);
}

/** Property access as JavaScript does it, on own properties only. */
function walk(value: unknown, segments: readonly string[]): unknown {
  let current = value;
  let previous: string | undefined;
  for (const segment of segments) {
    if (current === null || current === undefined) {
      throw new TypeError(`Cannot read "${segment}" of ${current}`);
    }
    current = ownProperty(current, segment, previous?.toLowerCase() === 'header');
    previous = segment;
  }
  return current;
}

/** A hyphen and an underscore match each other in a name, and header names ignore case. */
function ownProperty(container: unknown, name: string, ignoresCase: boolean): unknown {
  const object: Record<string, unknown> = Object(container);
  if (Object.hasOwn(object, name)) return object[name];
  const wanted = normalizeName(name, ignoresCase);
  const key = Object.keys(object).find(
    (candidate) => normalizeName(candidate, ignoresCase) === wanted
  );
  return key === undefined ? undefined : object[key];
}

function normalizeName(name: string, ignoresCase: boolean): string {
  const normalized = name.replace(/-/g, '_');
  return ignoresCase ? normalized.toLowerCase() : normalized;
}

function atPointer(value: unknown, pointer: string): unknown {
  let current = value;
  for (const segment of pointer.split('/').slice(1)) {
    const key = segment.replace(/~1/g, '/').replace(/~0/g, '~');
    const object: Record<string, unknown> | undefined =
      current === null || current === undefined ? undefined : Object(current);
    if (!object || !Object.hasOwn(object, key)) {
      throw new Error(`JSON Pointer "${pointer}" reaches no value`);
    }
    current = object[key];
  }
  return current;
}

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    const rest = expression.slice(index);
    if (/\s/.test(char)) {
      index++;
    } else if (char === '$') {
      let end = index + 1;
      while (end < expression.length && REFERENCE_CHAR.test(expression[end])) end++;
      tokens.push({ kind: 'reference', text: expression.slice(index, end) });
      index = end;
    } else if (char === '"' || char === "'") {
      const end = expression.indexOf(char, index + 1);
      if (end === -1) throw new Error(`Unclosed string in "${expression}"`);
      tokens.push({ kind: 'literal', value: expression.slice(index + 1, end) });
      index = end + 1;
    } else {
      const number = NUMBER.exec(rest)?.[0];
      const keyword = KEYWORD.exec(rest)?.[0];
      const emptyArray = EMPTY_ARRAY.exec(rest)?.[0];
      const operator = OPERATORS.find((candidate) => expression.startsWith(candidate, index));
      if (number) {
        tokens.push({ kind: 'literal', value: Number(number) });
        index += number.length;
      } else if (keyword) {
        tokens.push({ kind: 'literal', value: KEYWORD_VALUES[keyword] });
        index += keyword.length;
      } else if (emptyArray) {
        tokens.push({ kind: 'literal', value: [] });
        index += emptyArray.length;
      } else if (operator) {
        tokens.push({ kind: 'operator', text: operator });
        index += operator.length;
      } else {
        throw new Error(`Unexpected "${char}" in "${expression}"`);
      }
    }
  }
  return tokens;
}
