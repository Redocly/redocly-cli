export * from './evaluate.js';

// Import ESM module
import { parse } from './abnf-parser.js';

export const abnfRuntimeExpressionParser = { parse };
