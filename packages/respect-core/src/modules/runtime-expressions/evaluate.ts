import {
  isPlainObject,
  parseRuntimeExpression,
  type LoggerInterface,
  type SelectorObject,
} from '@redocly/openapi-core';
import { query, type JsonValue } from 'jsonpath-rfc9535';
import parseJsonPath from 'jsonpath-rfc9535/parser';

import type { RuntimeExpressionContext } from '../../types.js';
import { getFakeData, parseJson } from '../context-parser/index.js';
import { atPointer, interpretExpression, resolveSingleExpression } from './interpret-expression.js';
import { lintExpression } from './lint.js';

// Matches Arazzo embedded runtime expressions of the form `{$...}`, which must be
// resolved first to construct the final JSONPath expression. Nested braces are not
// supported, which aligns with Arazzo runtime-expression syntax.
const EMBEDDED_EXPRESSION_REGEX = /\{(\$[^{}]+)\}/g;
const SELECTOR_TYPES = ['jsonpath', 'xpath', 'jsonpointer'];

// Used when evaluating expressions in a string that can contain other text, like request bodies payload, output values, etc.
export function evaluateRuntimeExpressionPayload({
  payload,
  context,
  contentType,
  logger,
}: {
  payload: any;
  context: RuntimeExpressionContext;
  contentType?: string;
  logger: LoggerInterface;
}): any {
  if (contentType?.includes('application/octet-stream')) {
    return parseJson(payload, context, logger);
  }

  if (typeof payload === 'string') {
    // Resolve string expressions
    return isPureRuntimeExpression(payload)
      ? evaluateSingleRuntimeExpression(payload, context, logger)
      : evaluateExpressionsInString(payload, context, logger);
  } else if (payload instanceof Blob) {
    // A file of a multipart payload is sent as it is.
    return payload;
  } else if (isSelectorObject(payload)) {
    return evaluateSelectorObject(payload, context, logger);
  } else if (isPlainObject(payload)) {
    return Object.entries(payload).reduce(
      (acc, [key, value]) => {
        acc[key] = evaluateRuntimeExpressionPayload({ payload: value, context, logger });
        return acc;
      },
      {} as Record<string, any>
    );
  } else if (Array.isArray(payload)) {
    return payload.map((item) =>
      evaluateRuntimeExpressionPayload({ payload: item, context, logger })
    );
  } else {
    // Return the payload as-is if it's not a string, object, or array
    return payload;
  }
}

// Evaluate runtime expressions in a given expression object. Used in SuccessCriteria conditions.
export function evaluateRuntimeExpression(
  expression: any,
  context: RuntimeExpressionContext,
  logger: LoggerInterface
): any {
  if (typeof expression === 'string') {
    return evaluateExpressionString(expression, context, logger);
  } else if (isPlainObject(expression)) {
    return Object.entries(expression).reduce(
      (acc, [key, value]) => {
        acc[key] = value && evaluateRuntimeExpression(value, context, logger);
        return acc;
      },
      {} as Record<string, any>
    );
  } else if (Array.isArray(expression)) {
    return expression.map((exp) => evaluateRuntimeExpression(exp, context, logger));
  } else {
    return expression;
  }
}

// Evaluates a value that holds one runtime expression: an output, a parameter value, an embedded
// expression, or a `context`. Such a value can use the names and the JSON Pointers of the Arazzo
// ABNF that the grammar of a condition leaves out, because they would run into an operator.
// It returns `any`, as `evaluateRuntimeExpression` does: the value comes from the context as it is.
export function evaluateSingleRuntimeExpression(
  expression: string,
  context: RuntimeExpressionContext,
  logger: LoggerInterface,
  keepsObjectKeys = false
): any {
  const singleExpression = withoutBraces(expression);

  if (isValidRuntimeExpression(expression) || !isSingleExpression(singleExpression)) {
    return evaluateExpressionString(expression, context, logger, keepsObjectKeys);
  }

  try {
    return resolveSingleExpression(singleExpression, context, keepsObjectKeys);
  } catch (error) {
    throw createResolvingError(expression, error);
  }
}

function evaluateExpressionString(
  expression: string,
  context: RuntimeExpressionContext,
  logger: LoggerInterface,
  keepsObjectKeys = false
) {
  // Replace $faker expressions with fake data as it is not the part of the Runtime
  // Expressions and should be evaluated separately
  if (/^\$faker\.[a-zA-Z0-9._-]+(\([^\\)]*\))?$/.test(expression)) {
    return getFakeData({ pointer: expression.slice(1), ctx: context, logger });
  } else if (expression.includes('$faker.')) {
    const fakerRegex = /\$faker\.[a-zA-Z0-9._-]+(\([^\\()]*\))?/g;
    expression = expression
      .replace(fakerRegex, (match) => {
        return getFakeData({ pointer: match.slice(1), ctx: context, logger });
      })
      .replace(/{(.*?)}/g, '$1');
  }

  if (!expression.includes('$') && !/[=<>]/.test(expression)) {
    return expression;
  }

  // Validate expression syntax to match ABNF Arazzo grammar
  lintExpression(expression);

  try {
    return interpretExpression(expression, context, keepsObjectKeys);
  } catch (error) {
    throw createResolvingError(expression, error);
  }
}

function createResolvingError(expression: string, error: unknown): Error {
  const cause = error instanceof Error ? `: ${error.message}` : '';
  return new Error(
    `Error in resolving runtime expression '${expression}'${cause}. \n` +
      "This could be because the expression references a value from a previous failed step, or is trying to reference a variable that hasn't been set."
  );
}

// Helper function to evaluate expressions within a string
function evaluateExpressionsInString(
  expression: string,
  context: RuntimeExpressionContext,
  logger: LoggerInterface,
  insideBraces = false
): string {
  // Inside braces that are not an expression, such as a JSON object, only an {expression}
  // and a $faker call are evaluated.
  const regex = insideBraces
    ? /\{(?:[^{}]|\{[^{}]*\})*\}|\$faker\.[a-zA-Z0-9._-]+(?:\([^()]*\))?/g
    : /\{(?:[^{}]|\{[^{}]*\})*\}|\$[^\s{}]+(?:\([^()]*\))*/g;

  return expression.replace(regex, (match) => {
    const exprToEvaluate = match.trim();

    // `{"id": "$faker.string.uuid()"}` only holds a $faker call, `{$faker.string.uuid()}` is one
    const isFakerExpression =
      /^\{?\s*\$/.test(exprToEvaluate) && exprToEvaluate.includes('$faker.');

    const isEmbeddedExpression = match.startsWith('{') && isSingleExpression(withoutBraces(match));

    if (!isValidRuntimeExpression(exprToEvaluate) && !isFakerExpression && !isEmbeddedExpression) {
      return match.startsWith('{')
        ? `{${evaluateExpressionsInString(match.slice(1, -1), context, logger, true)}}`
        : match;
    }

    // For dollar expressions, include the leading $ when passing to evaluateSingleRuntimeExpression
    const evaluatedValue = evaluateSingleRuntimeExpression(exprToEvaluate, context, logger);

    // Keeping the expression text would send it as a literal value, so fail instead
    if (evaluatedValue === undefined) {
      throw new Error(
        `Runtime expression '${exprToEvaluate}' has no value. \n` +
          'Check that it references a step or workflow that has already run and sets this output, or an input that is provided.'
      );
    }

    return evaluatedValue;
  });
}

export function isPureRuntimeExpression(expression: string): boolean {
  const trimmedExpression = expression.trim();

  if (trimmedExpression.startsWith('$faker.')) {
    return true;
  }

  if (
    !(
      (trimmedExpression.startsWith('$') && !/\s/.test(trimmedExpression)) ||
      (trimmedExpression.startsWith('{') && trimmedExpression.endsWith('}'))
    )
  ) {
    return false;
  }

  return (
    isValidRuntimeExpression(trimmedExpression) ||
    isSingleExpression(withoutBraces(trimmedExpression))
  );
}

function isValidRuntimeExpression(expression: string): boolean {
  try {
    lintExpression(expression);
    return true;
  } catch {
    return false;
  }
}

// The Arazzo 1.0.1 ABNF does not limit the characters of a name, and the 1.1.0 ABNF adds
// expressions that Respect does not evaluate, so a single expression is what both of them accept.
function isSingleExpression(expression: string): boolean {
  try {
    parseRuntimeExpression(expression, { startRule: 'Arazzo1Expression' });
    parseRuntimeExpression(expression, { startRule: 'Arazzo1_1Expression' });
    return true;
  } catch {
    return false;
  }
}

function withoutBraces(expression: string): string {
  const trimmedExpression = expression.trim();
  return trimmedExpression.startsWith('{') && trimmedExpression.endsWith('}')
    ? trimmedExpression.slice(1, -1).trim()
    : trimmedExpression;
}

// A literal object is a Selector Object (Arazzo 1.1.0) only when it has all three of its fields.
export function isSelectorObject(value: unknown): value is SelectorObject {
  if (
    !isPlainObject(value) ||
    typeof value.context !== 'string' ||
    typeof value.selector !== 'string'
  ) {
    return false;
  }
  const type = isPlainObject(value.type) ? value.type.type : value.type;
  return typeof type === 'string' && SELECTOR_TYPES.includes(type);
}

function evaluateSelectorObject(
  selectorObject: SelectorObject,
  context: RuntimeExpressionContext,
  logger: LoggerInterface
): unknown {
  const { type, version } =
    typeof selectorObject.type === 'string'
      ? { type: selectorObject.type, version: undefined }
      : selectorObject.type;
  // A selector reads the data as it is, so the context keeps its object keys.
  const data = evaluateSingleRuntimeExpression(selectorObject.context, context, logger, true);

  if (data === undefined) {
    throw new Error(`Selector context "${selectorObject.context}" has no value.`);
  }

  if (type === 'jsonpointer' && (version === undefined || version === 'rfc6901')) {
    if (selectorObject.selector !== '' && !selectorObject.selector.startsWith('/')) {
      throw new Error(
        `Invalid JSON Pointer selector "${selectorObject.selector}". A JSON Pointer is empty or starts with "/".`
      );
    }
    return atPointer(data, selectorObject.selector);
  }

  if (type === 'jsonpath' && (version === undefined || version === 'rfc9535')) {
    const selector = resolveEmbeddedExpressions(selectorObject.selector, context, logger);
    let values: JsonValue[];
    try {
      values = query(data, selector);
    } catch (error) {
      const cause = error instanceof Error ? `: ${error.message}` : '';
      throw new Error(`Invalid JSONPath selector "${selector}"${cause}`);
    }

    // Only a singular query (RFC 9535, section 2.3.5.1) selects at most one value:
    // it gives the value itself, and any other query gives the list of the values it selects.
    if (!isSingularQuery(selector)) {
      return values;
    }
    if (!values.length) {
      throw new Error(
        `JSONPath selector "${selector}" selects no value in "${selectorObject.context}".`
      );
    }
    return values[0];
  }

  throw new Error(
    `Selector type ${JSON.stringify(selectorObject.type)} is not supported. Use "jsonpath" (RFC 9535) or "jsonpointer".`
  );
}

// Name and index selectors only: `$.items[0].id`, but not `$.items[*].id` or `$.items[?@.id]`.
function isSingularQuery(selector: string): boolean {
  return parseJsonPath(selector).segments.every(
    ({ type, node }) =>
      type === 'ChildSegment' &&
      (node.type === 'MemberNameShorthand' ||
        (node.type === 'BracketedSelection' &&
          node.selectors.length === 1 &&
          (node.selectors[0].type === 'NameSelector' ||
            node.selectors[0].type === 'IndexSelector')))
  );
}

// Per the Arazzo spec, expressions can be embedded into string values by surrounding
// the expression with `{}` curly braces. Any embedded `{$...}` expression in a JSONPath
// expression MUST be evaluated first to construct the JSONPath expression before it is
// evaluated against the data.
// An expression inside a quoted string, as in `"{$inputs.name}"`, is inserted as text.
// Outside a quoted string, a string value is inserted together with its quotes.
export function resolveEmbeddedExpressions(
  jsonPath: string,
  context: RuntimeExpressionContext,
  logger: LoggerInterface
): string {
  // The quote of the string that the scan is inside of, and how far the scan has read.
  let quote: string | undefined;
  let scannedLength = 0;

  return jsonPath.replace(EMBEDDED_EXPRESSION_REGEX, (match, expression, offset: number) => {
    // The scan only moves forward, so the whole string is read once.
    for (; scannedLength < offset; scannedLength++) {
      const char = jsonPath[scannedLength];
      if (quote && char === '\\') {
        scannedLength++;
      } else if (char === quote) {
        quote = undefined;
      } else if (!quote && (char === '"' || char === "'")) {
        quote = char;
      }
    }
    scannedLength = offset + match.length;

    const value = evaluateSingleRuntimeExpression(expression, context, logger);
    if (!quote || value === undefined) {
      return formatJsonPathLiteral(value, match);
    }

    // The text of a JSON string, without its quotes, has every character escaped as JSONPath needs.
    const text = JSON.stringify(typeof value === 'string' ? value : JSON.stringify(value));
    const escapedText = text.slice(1, -1);
    return quote === "'" ? escapedText.replace(/\\"/g, '"').replace(/'/g, "\\'") : escapedText;
  });
}

function formatJsonPathLiteral(value: unknown, fallback: string): string {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === 'string' || Array.isArray(value) || isPlainObject(value)) {
    return JSON.stringify(value);
  }

  return String(value);
}
