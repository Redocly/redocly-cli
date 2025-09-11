import { abnfRuntimeExpressionParser } from './index.js';

export function lintExpression(expression: string) {
  try {
    return abnfRuntimeExpressionParser.parse(expression);
  } catch (_error) {
    throw new Error(`Runtime expression is not valid: ${expression}`);
  }
}
