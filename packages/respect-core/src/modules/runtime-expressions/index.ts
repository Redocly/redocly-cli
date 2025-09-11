export * from './evaluate.js';

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { parse } = require('./abnf-parser.cjs');

export const abnfRuntimeExpressionParser = { parse };
