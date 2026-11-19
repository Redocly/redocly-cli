import type { UserContext } from '../walk.js';
// @ts-expect-error - Generated PEG.js parser has no TypeScript definitions
import { parse } from './abnf-parser.js';

type ParseRuntimeExpressionOptions = {
  // `Start` parses a condition, and `RuntimeExpression` parses a single runtime expression.
  startRule?: 'Start' | 'RuntimeExpression';
  // The `RuntimeExpression` rule accepts the expressions added in Arazzo 1.1 for `arazzo1_1`.
  specVersion?: UserContext['specVersion'];
};

// Throws when the text does not match the grammar in abnf-parser.pegjs.
export const parseRuntimeExpression: (
  expression: string,
  options?: ParseRuntimeExpressionOptions
) => unknown = parse;
