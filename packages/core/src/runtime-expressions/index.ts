// @ts-expect-error - Generated PEG.js parser has no TypeScript definitions
import { parse } from './abnf-parser.js';

type ParseRuntimeExpressionOptions = {
  // `Start` parses a condition. The other rules parse a single runtime expression of that Arazzo version.
  startRule?: 'Start' | 'Arazzo1Expression' | 'Arazzo1_1Expression';
};

// Throws when the text does not match the grammar in abnf-parser.pegjs.
export const parseRuntimeExpression: (
  expression: string,
  options?: ParseRuntimeExpressionOptions
) => unknown = parse;
