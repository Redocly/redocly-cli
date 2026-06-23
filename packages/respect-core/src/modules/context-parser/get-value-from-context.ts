import { isPlainObject, type LoggerInterface } from '@redocly/openapi-core';
import { red } from 'colorette';

import { type RuntimeExpressionContext, type TestContext, type Workflow } from '../../types.js';

export interface ParsedParameters {
  queryParams: Record<string, string>;
  pathParams: Record<string, string | number>;
  headerParams: Record<string, string>;
}

const hasCurlyBraces = (input: string) => {
  return /\{.*?\}/.test(input);
};

export function getValueFromContext({
  value,
  ctx,
  logger,
}: {
  value: unknown;
  ctx: TestContext | RuntimeExpressionContext;
  logger: LoggerInterface;
}): unknown {
  if (!value) return value;

  if (isPlainObject(value)) {
    const resolvedValue = {} as Record<string, unknown>;
    for (const key in value) {
      resolvedValue[key] = getValueFromContext({ value: value[key], ctx, logger });
    }
    return resolvedValue;
  } else if (Array.isArray(value)) {
    return value.map((item) => getValueFromContext({ value: item, ctx, logger }));
  }

  if (typeof value !== 'string') {
    return value;
  }

  if (value.startsWith('$faker.')) {
    return getFakeData({ pointer: value.slice(1), ctx, logger });
  }

  if (hasCurlyBraces(value)) {
    // multiple variables in string => {$var1} {$var2}
    return replaceVariablesInString(value, ctx, logger);
  } else {
    // single variable in string => $var1
    return resolveValue(value, ctx, logger);
  }
}

export function replaceFakerVariablesInString(
  input: string,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
) {
  const startIndex = input.indexOf('{');

  if (startIndex !== -1) {
    const substringAfterFirstBrace = input.substring(startIndex + 1);
    const fakerFunction = substringAfterFirstBrace.slice(0, -1);
    const fakerValue = getFakeData({ pointer: fakerFunction.slice(1), ctx, logger });

    return fakerValue && input.replace(/{(.*)}/, fakerValue);
  } else {
    return input;
  }
}

// Property names that would allow escaping the faker object and reaching the
// prototype chain (and therefore `Function`/`constructor`-based code execution).
const FORBIDDEN_FAKER_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const SAFE_FAKER_KEY = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

// Safely parses the single options object of a faker function call (e.g. the
// `{ min: 5, max: 5 }` in `faker.number.integer({ min: 5, max: 5 })`) WITHOUT
// evaluating it as JavaScript. Faker functions take at most one options object
// whose values are strings or numbers.
class FakerArgumentParser {
  private pos = 0;

  constructor(private readonly src: string) {}

  parseArguments(): unknown[] {
    this.skipWhitespace();
    if (this.pos >= this.src.length) return [];

    const value = this.parseValue();
    this.skipWhitespace();
    if (this.pos < this.src.length) {
      throw new Error(`Unexpected token "${this.src[this.pos]}" in faker arguments`);
    }
    return [value];
  }

  private parseValue(): unknown {
    this.skipWhitespace();
    const char = this.src[this.pos];

    if (char === '{') return this.parseObject();
    if (char === '"' || char === "'") return this.parseString(char);
    if (char === '-' || (char >= '0' && char <= '9')) return this.parseNumber();
    throw new Error(`Unexpected token "${char}" in faker arguments`);
  }

  private parseObject(): Record<string, unknown> {
    this.pos++; // consume '{'
    const obj: Record<string, unknown> = {};
    this.skipWhitespace();

    if (this.src[this.pos] === '}') {
      this.pos++;
      return obj;
    }

    while (true) {
      this.skipWhitespace();
      const key = this.parseKey();
      this.skipWhitespace();
      if (this.src[this.pos] !== ':') {
        throw new Error('Expected ":" in faker arguments object');
      }
      this.pos++; // consume ':'
      const value = this.parseValue();
      // Reject keys that could pollute the prototype of the options object.
      if (!FORBIDDEN_FAKER_KEYS.has(key)) {
        obj[key] = value;
      }
      this.skipWhitespace();

      const next = this.src[this.pos];
      if (next === ',') {
        this.pos++;
        this.skipWhitespace();
      } else if (next === '}') {
        this.pos++;
        return obj;
      } else {
        throw new Error('Expected "," or "}" in faker arguments object');
      }

      if (this.src[this.pos] === '}') {
        this.pos++; // allow a trailing comma
        return obj;
      }
    }
  }

  private parseKey(): string {
    const char = this.src[this.pos];
    if (char === '"' || char === "'") return this.parseString(char);

    const start = this.pos;
    while (this.pos < this.src.length && /[a-zA-Z0-9_$]/.test(this.src[this.pos])) {
      this.pos++;
    }
    if (this.pos === start) {
      throw new Error('Expected property name in faker arguments object');
    }
    return this.src.slice(start, this.pos);
  }

  private parseString(quote: string): string {
    this.pos++; // consume opening quote
    let result = '';
    while (this.pos < this.src.length) {
      const char = this.src[this.pos++];
      if (char === '\\') {
        result += this.src[this.pos++] ?? '';
      } else if (char === quote) {
        return result;
      } else {
        result += char;
      }
    }
    throw new Error('Unterminated string in faker arguments');
  }

  private parseNumber(): number {
    const start = this.pos;
    if (this.src[this.pos] === '-') this.pos++;
    while (this.pos < this.src.length && /[0-9.]/.test(this.src[this.pos])) {
      this.pos++;
    }
    const raw = this.src.slice(start, this.pos);
    const value = Number(raw);
    if (Number.isNaN(value)) {
      throw new Error(`Invalid number "${raw}" in faker arguments`);
    }
    return value;
  }

  private skipWhitespace(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos])) {
      this.pos++;
    }
  }
}

// Splits a faker pointer on `.`, ignoring dots inside a function call's
// arguments (parentheses) or string literals, e.g. `faker.number.float({ min: 0.5 })`.
function splitFakerPointer(pointer: string): string[] {
  const segments: string[] = [];
  let current = '';
  let quote: string | null = null;
  let depth = 0;

  for (let i = 0; i < pointer.length; i++) {
    const char = pointer[i];

    if (quote) {
      current += char;
      if (char === '\\') {
        current += pointer[++i] ?? '';
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === '.' && depth === 0) {
      segments.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  segments.push(current.trim());
  return segments;
}

// Only own properties of the faker object are allowed,
// which prevents reaching `constructor`/`__proto__` and the `Function` escape.
function resolveFakerSegment(target: unknown, segment: string): unknown {
  const callMatch = segment.match(/^([^()]+)\((.*)\)$/s);
  const name = (callMatch ? callMatch[1] : segment).trim();

  if (!SAFE_FAKER_KEY.test(name) || FORBIDDEN_FAKER_KEYS.has(name)) {
    throw new Error(`Unsupported faker reference: "${name}"`);
  }

  if (target == null || !Object.prototype.hasOwnProperty.call(target, name)) {
    throw new Error(`Unknown faker reference: "${name}"`);
  }

  const member = (target as Record<string, unknown>)[name];

  if (callMatch) {
    if (typeof member !== 'function') {
      throw new Error(`Faker reference "${name}" is not callable`);
    }
    const args = new FakerArgumentParser(callMatch[2]).parseArguments();
    return (member as (...args: unknown[]) => unknown).apply(target, args);
  }

  return member;
}

function replaceVariablesInString(
  input: string,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
): string {
  // Regular expression to match content inside ${...}
  const regex = /\{\$(\{[^{}]*\}|[^{}])*\}/g;
  let result = input;

  // Replace each match with its interpolated value
  result = result.replace(regex, (match, _code) => {
    return interpolate(match, ctx, logger);
  });

  return result;
}

function interpolate(
  part: string,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
): string {
  if (!part.includes('$')) return part;

  if (part.includes('$faker.')) {
    return replaceFakerVariablesInString(part, ctx, logger);
  }

  const value = getFrom(ctx)(removeFigureBrackets(part));
  return value !== undefined ? value : '';
}

const resolveValue = (
  value: string | null,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
) => {
  if (!value) return value;

  const path = value.toString();

  if (!path.includes('$')) {
    return value;
  }

  // if path has $file('...') syntax, return the path but trim the $file(' and ')
  if (path.startsWith('$file(') && path.endsWith(')')) {
    return path.slice(7, -2);
  }

  // $sourceDescriptions.<name>.<workflowId>
  // $sourceDescriptions.<name>.workflows.<workflowId>
  if (path.startsWith('$sourceDescriptions.')) {
    const parts = path.split('.');
    const sourceDescriptionName = parts[1];
    const isLegacyForm = parts.length === 4 && parts[2] === 'workflows';
    const isSpecForm = parts.length === 3;
    const workflowId = isLegacyForm ? parts[3] : isSpecForm ? parts[2] : undefined;

    if (sourceDescriptionName && workflowId) {
      const sourceDescriptions = getFrom(ctx)('$sourceDescriptions');
      const sourceDescription = sourceDescriptions?.[sourceDescriptionName];
      const workflow = sourceDescription?.workflows?.find(
        (workflow: Workflow) => workflow.workflowId === workflowId
      );

      if (workflow) {
        return workflow;
      }
      if (isSpecForm) {
        return sourceDescription?.[workflowId];
      }
    }

    if (isLegacyForm) {
      return undefined;
    }
  }

  if (path && path.trim().startsWith('faker.')) {
    return getFakeData({ pointer: path, ctx, logger });
  }

  return path
    ? getFrom(ctx)(replaceSquareBrackets(path))
    : path.replace(/\$\{([^}]+)}/g, (_, path) => getFrom(ctx)(replaceSquareBrackets(path)));
};

function removeFigureBrackets(input: string) {
  return input.replace(/\{(.*)\}/, '$1');
}

function replaceSquareBrackets(input: string) {
  return input.replace(/\['(.*?)'\]/g, '.$1');
}

const getFrom =
  ($: Record<string, unknown> | any, originalPointer: string = '') =>
  (pointer: string): any => {
    if (!originalPointer) {
      originalPointer = pointer; // Store the first pointer only during the initial call
    }

    if (!pointer) return $;
    const [key, ...rest] = pointer.split('.');

    if (!$) {
      throw Error(`Cannot get ${red(key)} from ${red(originalPointer)}`);
    }

    if ($?.[key] === undefined) {
      const reason = ` Undefined ${red(key)} at ${red(originalPointer)}.`;
      const additionalInfo = Object.keys($).length
        ? `Did you mean to use another key? Available keys:\n${Object.keys($).join(', ')}.\n`
        : '';
      const errorMessage = `${reason} ${additionalInfo}`;

      throw Error(errorMessage);
    }

    return getFrom($[key], originalPointer)(rest.join('.'));
  };

export function getFakeData({
  pointer,
  ctx,
  logger,
}: {
  pointer: string;
  ctx: TestContext | RuntimeExpressionContext;
  logger: LoggerInterface;
}): any {
  const segments = splitFakerPointer(pointer);

  try {
    // The pointer always starts with `faker` (e.g. `faker.number.integer(...)`).
    if (segments[0] !== 'faker') {
      throw new Error(`Unsupported faker reference: "${segments[0]}"`);
    }

    return segments
      .slice(1)
      .reduce<unknown>((target, segment) => resolveFakerSegment(target, segment), ctx.$faker);
  } catch (err: any) {
    logger.error(red(err.toString()));

    return undefined;
  }
}

function modifyJSON(
  value: any,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
): any {
  if (typeof value === 'string') {
    if (value) return getValueFromContext({ value, ctx, logger });
  }
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined' ||
    value instanceof Blob ||
    value === null
  )
    return;

  for (const i in value as Record<string, unknown> | unknown[]) {
    if (typeof value[i] === 'string') {
      if (value[i]) value[i] = getValueFromContext({ value: value[i], ctx, logger });
    } else {
      modifyJSON(value[i], ctx, logger);
    }
  }
}

export function parseJson(
  objectToResolve: any,
  ctx: TestContext | RuntimeExpressionContext,
  logger: LoggerInterface
): any {
  return modifyJSON(objectToResolve, ctx, logger) || objectToResolve;
}

export function resolvePath(
  path?: string,
  pathParams?: Record<string, string | number | boolean>
): string | undefined {
  if (!path) return;

  const paramsWithBraces: Record<string, string | number> = {};
  for (const param in pathParams) {
    paramsWithBraces[`{${param}}`] = String(pathParams[param]);
  }
  return path
    .split(/(\{[a-zA-Z0-9_.-]+\}+)/g)
    .map((key) => (paramsWithBraces[key] ? paramsWithBraces[key] : key))
    .join('');
}
