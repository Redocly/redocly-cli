import { isPlainObject, type LoggerInterface } from '@redocly/openapi-core';
import { query, type JsonValue } from 'jsonpath-rfc9535';

import type { RuntimeExpressionContext } from '../../../types.js';
import { evaluateRuntimeExpression } from '../../runtime-expressions/index.js';

// Matches Arazzo embedded runtime expressions of the form `{$...}`, which must be
// resolved first to construct the final JSONPath expression. Nested braces are not
// supported, which aligns with Arazzo runtime-expression syntax.
const EMBEDDED_EXPRESSION_REGEX = /\{(\$[^{}]+)\}/g;

export function evaluateJSONPathCondition({
  condition,
  data,
  context,
  logger,
}: {
  condition: string;
  data: JsonValue;
  context: RuntimeExpressionContext;
  logger: LoggerInterface;
}): boolean {
  try {
    const resolvedCondition = resolveEmbeddedExpressions(condition, context, logger);
    return query([data], resolvedCondition).length > 0;
  } catch {
    return false;
  }
}

// Per the Arazzo spec, expressions can be embedded into string values by surrounding
// the expression with `{}` curly braces. Any embedded `{$...}` expression in a JSONPath
// condition MUST be evaluated first to construct the JSONPath expression before it is
// evaluated against the data.
function resolveEmbeddedExpressions(
  condition: string,
  context: RuntimeExpressionContext,
  logger: LoggerInterface
): string {
  return condition.replace(EMBEDDED_EXPRESSION_REGEX, (match, expression) => {
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
