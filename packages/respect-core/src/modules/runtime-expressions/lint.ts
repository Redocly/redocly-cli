import { parseRuntimeExpression } from './index.js';

export function lintExpression(expression: string) {
  try {
    return parseRuntimeExpression(expression);
  } catch (_error) {
    throw new Error(`Runtime expression is not valid: ${expression}`);
  }
}
