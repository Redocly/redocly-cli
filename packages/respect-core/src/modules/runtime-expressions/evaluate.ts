import { isPlainObject, type LoggerInterface, type SelectorObject } from '@redocly/openapi-core';
import { query, type JsonValue } from 'jsonpath-rfc9535';
import parseJsonPath from 'jsonpath-rfc9535/parser';

import type { RuntimeExpressionContext } from '../../types.js';
import { getFakeData, parseJson } from '../context-parser/index.js';
import { atPointer, interpretExpression } from './interpret-expression.js';
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

  if (contentType?.includes('multipart/form-data')) {
    if (payload instanceof FormData) {
      const processedFormData = new FormData();

      for (const [key, value] of payload.entries()) {
        if (value instanceof File) {
          processedFormData.append(key, value);
        } else {
          const evaluatedValue = evaluateRuntimeExpressionPayload({
            payload: value,
            context,
            logger,
          });
          processedFormData.append(key, evaluatedValue);
        }
      }

      return processedFormData;
    }

    return parseJson(payload, context, logger);
  }

  if (typeof payload === 'string') {
    // Resolve string expressions
    return isPureRuntimeExpression(payload)
      ? evaluateRuntimeExpression(payload, context, logger)
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
    const fakerRegex = /\$faker\.[a-zA-Z0-9._-]+(\([^\\)]*\))?/g;
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
    const cause = error instanceof Error ? `: ${error.message}` : '';
    throw new Error(
      `Error in resolving runtime expression '${expression}'${cause}. \n` +
        "This could be because the expression references a value from a previous failed step, or is trying to reference a variable that hasn't been set."
    );
  }
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

    if (!isValidRuntimeExpression(exprToEvaluate) && !isFakerExpression) {
      return match.startsWith('{')
        ? `{${evaluateExpressionsInString(match.slice(1, -1), context, logger, true)}}`
        : match;
    }

    // For dollar expressions, include the leading $ when passing to evaluateRuntimeExpression
    const evaluatedValue = evaluateRuntimeExpression(exprToEvaluate, context, logger);

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

  return isValidRuntimeExpression(trimmedExpression);
}

function isValidRuntimeExpression(expression: string): boolean {
  try {
    lintExpression(expression);
    return true;
  } catch {
    return false;
  }
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
  const data = evaluateExpressionString(selectorObject.context, context, logger, true);

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
export function resolveEmbeddedExpressions(
  jsonPath: string,
  context: RuntimeExpressionContext,
  logger: LoggerInterface
): string {
  return jsonPath.replace(EMBEDDED_EXPRESSION_REGEX, (match, expression) => {
    const value = evaluateRuntimeExpression(expression, context, logger);
    return formatJsonPathLiteral(value, match);
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
