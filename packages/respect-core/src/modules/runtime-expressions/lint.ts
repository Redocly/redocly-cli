// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as parser } from './abnf-parser.cjs';

export function lintExpression(expression: string) {
  try {
    return parser.parse(expression);
  } catch (_error) {
    throw new Error(`Runtime expression is not valid: ${expression}`);
  }
}
