import { type LoggerInterface } from '@redocly/openapi-core';
import { query, type JsonValue } from 'jsonpath-rfc9535';

import type { RuntimeExpressionContext } from '../../../types.js';
import { resolveEmbeddedExpressions } from '../../runtime-expressions/index.js';

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
