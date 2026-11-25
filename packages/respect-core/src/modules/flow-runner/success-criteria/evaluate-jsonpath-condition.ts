import { type LoggerInterface } from '@redocly/openapi-core';
import { query, type JsonValue } from 'jsonpath-rfc9535';
import parseJsonPath from 'jsonpath-rfc9535/parser';

import type { JsonPathVerison, RuntimeExpressionContext } from '../../../types.js';
import { resolveEmbeddedExpressions } from '../../runtime-expressions/index.js';

export function evaluateJSONPathCondition({
  condition,
  data,
  version,
  context,
  logger,
}: {
  condition: string;
  data: JsonValue;
  version?: JsonPathVerison;
  context: RuntimeExpressionContext;
  logger: LoggerInterface;
}): boolean {
  try {
    const resolvedCondition = resolveEmbeddedExpressions(condition, context, logger);
    // The context value is queried as the only item of a list, so `$[?@.id == 1]` tests the value itself.
    // A member name selects nothing from a list, so a condition that starts with one, such as `$.items[*]`,
    // is queried on the context value, which is the root node in Arazzo and RFC 9535.
    // So is every condition of a criterion that sets the version `rfc9535`.
    const root = version === 'rfc9535' || startsWithMemberName(resolvedCondition) ? data : [data];
    return query(root, resolvedCondition).length > 0;
  } catch {
    return false;
  }
}

// Name selectors only: `$.items` or `$['items']`, but not `$[*]`, `$[0]`, `$[?@.id]`, or `$..items`.
function startsWithMemberName(jsonPath: string): boolean {
  const [firstSegment] = parseJsonPath(jsonPath).segments;
  return (
    firstSegment?.type === 'ChildSegment' &&
    (firstSegment.node.type === 'MemberNameShorthand' ||
      (firstSegment.node.type === 'BracketedSelection' &&
        firstSegment.node.selectors.every((selector) => selector.type === 'NameSelector')))
  );
}
