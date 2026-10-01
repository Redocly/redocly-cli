// Compile-only check, never imported or run: `npm run typecheck` fails if `AssertionConfig`
// stops accepting token-rule options in a typed `RecheckConfig`.
import type { RecheckConfig } from '../rules.js';

export const typedConfig: RecheckConfig = {
  'recheck/line-length': {
    severity: 'error',
    message: 'Line length',
    assertions: {
      'line-length': { lineLength: 120 },
    },
  },
  'recheck/no-duplicate-heading': {
    severity: 'error',
    message: 'Multiple headings with the same content',
    assertions: {
      'no-duplicate-heading': { siblingsOnly: true },
    },
  },
};
