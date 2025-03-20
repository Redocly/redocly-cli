import { default as parser } from './abnf-parser.js';

export function lintExpression(expression: string) {
  try {
    return parser.parse(expression);
  } catch (_error) {
    throw new Error(`Runtime expression is not valid: ${expression}`);
  }
}
